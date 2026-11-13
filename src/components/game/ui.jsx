'use client';

import React from 'react';
import { missionsData } from '../../data/missionsData';
import { ASSISTANT } from '../../game/data/gameCountries.js';

/** The local engineer's name and photo come from the existing mission data so characters stay consistent with the map. */
export function getCharacter(speaker, countryId, lang) {
  const ar = lang === 'ar';
  if (speaker === 'assistant') return { name: ar ? ASSISTANT.nameAr : ASSISTANT.nameEn, role: ar ? ASSISTANT.roleAr : ASSISTANT.roleEn, avatar: ASSISTANT.avatar, tone: 'assistant' };
  const mission = missionsData.find((item) => item.id === countryId) || missionsData[0];
  return { name: ar ? mission.farmerNameAr : mission.farmerNameEn, role: ar ? 'مهندس زراعي محلي' : 'Local agricultural engineer', avatar: mission.farmerImage, tone: 'farmer' };
}

export function CharacterMessage({ speaker, countryId, lang, children, compact = false }) {
  const who = getCharacter(speaker, countryId, lang);
  const farmer = who.tone === 'farmer';
  return (
    <div className={`flex items-start gap-3 ${farmer ? '' : 'flex-row-reverse'}`}>
      <img src={who.avatar} alt="" width="44" height="44" loading="lazy" decoding="async" className={`h-11 w-11 shrink-0 rounded-full border-2 object-cover ${farmer ? 'border-amber-400/70' : 'border-cyan-400/70'}`} />
      <div className={`min-w-0 max-w-[46rem] rounded-2xl border px-3.5 py-2.5 ${farmer ? 'rounded-ss-sm border-amber-400/25 bg-amber-950/25' : 'rounded-se-sm border-cyan-400/25 bg-cyan-950/30'}`}>
        <p className={`text-xs font-semibold ${farmer ? 'text-amber-200' : 'text-cyan-200'}`}>{who.name}{!compact && <span className="font-normal text-slate-400"> · {who.role}</span>}</p>
        <div className="mt-0.5 text-sm text-slate-100 sm:text-base">{children}</div>
      </div>
    </div>
  );
}

/** Marks a block as observed data or as a model estimate. */
export function DataTag({ kind, lang }) {
  const ar = lang === 'ar';
  const observed = kind === 'observed';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${observed ? 'border-sky-400/40 bg-sky-950/40 text-sky-200' : 'border-violet-400/40 bg-violet-950/40 text-violet-200'}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${observed ? 'bg-sky-300' : 'bg-violet-300'}`} />
      {observed ? (ar ? 'بيانات NASA POWER' : 'NASA POWER data') : (ar ? 'تقدير تعليمي' : 'Educational estimate')}
    </span>
  );
}

export function Stat({ label, value, unit, hint }) {
  return (
    <div className="surface-inset min-w-0 p-3">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-white"><span className="ltr-numeric">{value}</span>{unit && <span className="ms-1 text-sm font-normal text-slate-300">{unit}</span>}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', children, action }) {
  const tones = { info: 'border-white/15 bg-white/[0.04] text-slate-200', warn: 'border-amber-400/40 bg-amber-950/30 text-amber-100', error: 'border-rose-400/40 bg-rose-950/30 text-rose-100', good: 'border-emerald-400/40 bg-emerald-950/30 text-emerald-100' };
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export const primaryButton = 'app-nav-button inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-40';
export const secondaryButton = 'app-nav-button inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-40';
export const fmt = (value, digits = 1) => (Number.isFinite(value) ? (Math.round(value * 10 ** digits) / 10 ** digits).toLocaleString('en', { maximumFractionDigits: digits }) : '—');
export const pct = (value) => (Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—');
