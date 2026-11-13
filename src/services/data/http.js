/**
 * Shared request helper for every external data provider.
 *
 * - timeout per attempt, and cancellation through the caller's AbortSignal
 * - retry with backoff for network errors, 429 and 5xx (never for 4xx answers)
 * - identical requests that are already running share one network call
 * - successful responses are kept in memory for `ttlMs`, and are returned with
 *   `fromCache: true` so the interface can say the value was reused
 *
 * Nothing is fabricated here: a failure always reaches the caller as a
 * DataSourceError with a code the interface can explain.
 */

export class DataSourceError extends Error {
  constructor(code, message, { status = null, source = null } = {}) {
    super(message);
    this.name = 'DataSourceError';
    this.code = code; // network | timeout | aborted | http | rate-limited | bad-response | not-covered | no-data
    this.status = status;
    this.source = source;
  }
}

const responseCache = new Map(); // key -> { expiresAt, value }
const inFlight = new Map(); // key -> Promise

export function clearDataCache() {
  responseCache.clear();
  inFlight.clear();
}

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const id = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(id); reject(new DataSourceError('aborted', 'Request cancelled')); }, { once: true });
});

async function attempt(url, init, timeoutMs, signal, fetchImpl, parse, source) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      const code = response.status === 429 ? 'rate-limited' : 'http';
      throw new DataSourceError(code, text.slice(0, 300) || `HTTP ${response.status}`, { status: response.status, source });
    }
    if (parse === 'text') return text;
    try { return JSON.parse(text); } catch { throw new DataSourceError('bad-response', 'The service did not return valid JSON', { source }); }
  } catch (error) {
    if (error instanceof DataSourceError) throw error;
    if (signal?.aborted) throw new DataSourceError('aborted', 'Request cancelled', { source });
    if (timedOut) throw new DataSourceError('timeout', `No answer within ${Math.round(timeoutMs / 1000)} s`, { source });
    throw new DataSourceError('network', 'The service could not be reached', { source });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const retryable = (error) => ['network', 'timeout', 'rate-limited'].includes(error.code) || (error.code === 'http' && error.status >= 500);

/**
 * @returns {Promise<{ data: any, fromCache: boolean, retrievedAt: string }>}
 */
export async function requestData(url, {
  init = {},
  signal,
  timeoutMs = 20000,
  retries = 1,
  ttlMs = 30 * 60 * 1000,
  parse = 'json',
  source = null,
  fetchImpl,
} = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  const useShared = !fetchImpl; // tests pass their own fetch and must not share state
  const key = `${init.method || 'GET'} ${url} ${init.body || ''}`;
  if (signal?.aborted) throw new DataSourceError('aborted', 'Request cancelled', { source });

  if (useShared) {
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.value, fromCache: true };
    if (inFlight.has(key)) return inFlight.get(key);
  }

  const run = (async () => {
    let lastError;
    for (let index = 0; index <= retries; index += 1) {
      try {
        const data = await attempt(url, init, timeoutMs, signal, doFetch, parse, source);
        const value = { data, fromCache: false, retrievedAt: new Date().toISOString() };
        if (useShared) responseCache.set(key, { expiresAt: Date.now() + ttlMs, value });
        return value;
      } catch (error) {
        lastError = error;
        if (!retryable(error) || index === retries) break;
        await wait(800 * 2 ** index, signal);
      }
    }
    throw lastError;
  })();

  if (useShared) {
    inFlight.set(key, run);
    run.finally(() => inFlight.delete(key)).catch(() => {});
  }
  return run;
}

/** Run async jobs with at most `limit` running at once (keeps us inside provider rate limits). */
export async function mapLimit(items, limit, job) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await job(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
