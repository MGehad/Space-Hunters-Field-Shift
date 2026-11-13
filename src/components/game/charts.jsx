'use client';

import React from 'react';

/**
 * Small dependency-free SVG chart: stacked or grouped bars with an optional
 * line. Values are also exposed as a visually hidden table for screen readers.
 * Charts keep a left-to-right time axis in both languages.
 */
export function MonthChart({ labels, bars = [], stacked = false, outline = null, line = null, unit, lineUnit, title, lang, height = 190, dimAfter = null }) {
  const ar = lang === 'ar';
  const count = labels.length;
  const width = Math.max(300, count * 64 + 64);
  const pad = { top: 14, right: line ? 40 : 12, bottom: 30, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const totals = labels.map((_, i) => (stacked ? bars.reduce((sum, series) => sum + (series.values[i] || 0), 0) : Math.max(0, ...bars.map((series) => series.values[i] || 0))));
  const rawMax = Math.max(1, ...totals, ...(outline ? outline.values : [0]));
  const step = niceStep(rawMax);
  const max = Math.ceil(rawMax / step) * step;
  const y = (value) => pad.top + innerH - (value / max) * innerH;
  const band = innerW / count;
  const groupW = Math.min(40, band * 0.62);
  const lineVals = line ? line.values.filter((v) => Number.isFinite(v)) : [];
  const lineMin = line ? Math.min(0, Math.floor(Math.min(...lineVals) / 5) * 5) : 0;
  const lineMax = line ? Math.max(lineMin + 5, Math.ceil(Math.max(...lineVals) / 5) * 5) : 1;
  const ly = (value) => pad.top + innerH - ((value - lineMin) / (lineMax - lineMin)) * innerH;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

  return (
    <figure className="min-w-0">
      {title && <figcaption className="mb-1 text-sm font-medium text-slate-100">{title}</figcaption>}
      <div dir="ltr" className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-auto w-full" style={{ minWidth: Math.min(width, count * 44 + 80), maxHeight: 280 }}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(148,163,184,0.16)" />
              <text x={pad.left - 6} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{tick}</text>
            </g>
          ))}
          {labels.map((label, i) => {
            const cx = pad.left + band * i + band / 2;
            const dim = dimAfter !== null && i > dimAfter;
            let stackTop = 0;
            return (
              <g key={label + i} opacity={dim ? 0.25 : 1}>
                {outline && Number.isFinite(outline.values[i]) && (
                  <rect x={cx - groupW / 2 - 3} width={groupW + 6} y={y(outline.values[i])} height={Math.max(0, y(0) - y(outline.values[i]))} fill="none" stroke={outline.color} strokeDasharray="4 3" strokeWidth="1.5" rx="3" />
                )}
                {bars.map((series, s) => {
                  const value = series.values[i] || 0;
                  if (stacked) {
                    const y0 = y(stackTop + value);
                    const h = y(stackTop) - y0;
                    stackTop += value;
                    return <rect key={series.name} x={cx - groupW / 2} width={groupW} y={y0} height={Math.max(0, h)} fill={series.color} />;
                  }
                  const w = groupW / bars.length;
                  return <rect key={series.name} x={cx - groupW / 2 + s * w} width={Math.max(2, w - 2)} y={y(value)} height={Math.max(0, y(0) - y(value))} fill={series.color} rx="2" />;
                })}
                <text x={cx} y={height - 10} textAnchor="middle" fontSize="11" fill="#cbd5e1">{label}</text>
              </g>
            );
          })}
          {line && (
            <g>
              <polyline fill="none" stroke={line.color} strokeWidth="2" points={line.values.map((value, i) => (Number.isFinite(value) && !(dimAfter !== null && i > dimAfter) ? `${pad.left + band * i + band / 2},${ly(value)}` : '')).join(' ')} />
              {line.values.map((value, i) => (Number.isFinite(value) && !(dimAfter !== null && i > dimAfter) ? <circle key={i} cx={pad.left + band * i + band / 2} cy={ly(value)} r="3.5" fill={line.color} stroke="#07152b" strokeWidth="1.5" /> : null))}
              <text x={width - pad.right + 6} y={ly(lineMax) + 4} fontSize="11" fill={line.color}>{lineMax}</text>
              <text x={width - pad.right + 6} y={ly(lineMin) + 4} fontSize="11" fill={line.color}>{lineMin}</text>
            </g>
          )}
          <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="rgba(148,163,184,0.5)" />
        </svg>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        {outline && <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-sm border border-dashed" style={{ borderColor: outline.color }} />{outline.name}{unit ? ` (${unit})` : ''}</li>}
        {bars.map((series) => <li key={series.name} className="flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: series.color }} />{series.name}{unit ? ` (${unit})` : ''}</li>)}
        {line && <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4" style={{ background: line.color }} />{line.name}{lineUnit ? ` (${lineUnit})` : ''}</li>}
      </ul>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>{ar ? 'الشهر' : 'Month'}</th>{outline && <th>{outline.name}</th>}{bars.map((series) => <th key={series.name}>{series.name}</th>)}{line && <th>{line.name}</th>}</tr></thead>
        <tbody>{labels.map((label, i) => <tr key={label + i}><th>{label}</th>{outline && <td>{outline.values[i]}</td>}{bars.map((series) => <td key={series.name}>{series.values[i]}</td>)}{line && <td>{line.values[i]}</td>}</tr>)}</tbody>
      </table>
    </figure>
  );
}

function niceStep(max) {
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return nice * magnitude;
}

export const CHART_COLORS = Object.freeze({ rain: '#38bdf8', soil: '#a78bfa', irrigation: '#2dd4bf', need: '#e2e8f0', temp: '#fbbf24', a: '#22d3ee', b: '#f59e0b' });

/** Horizontal meter with a text value; colour is never the only signal. */
export function Meter({ value, label, tone = 'cyan' }) {
  const colors = { cyan: 'bg-cyan-400', amber: 'bg-amber-400', rose: 'bg-rose-400', emerald: 'bg-emerald-400' };
  const clamped = Math.max(0, Math.min(1, value || 0));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-slate-200">{label}</span><span className="ltr-numeric font-semibold text-white">{Math.round(clamped * 100)}%</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${clamped * 100}%` }} /></div>
    </div>
  );
}
