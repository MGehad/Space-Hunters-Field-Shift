'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer, X } from 'lucide-react';
import { buildFarmReport, reportToCsv } from '../../reports/buildFarmReport.js';
import { REPORT_TEXT } from '../../data/i18n/reportText.js';

/** Technical report: one document rendered for the screen and, through the print stylesheet, for PDF. */

function BoundaryFigure({ points }) {
  const lats = points.map((p) => p.lat); const lons = points.map((p) => p.lon);
  const meanLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const kx = Math.cos((meanLat * Math.PI) / 180); // keep east–west distances in proportion
  const xs = lons.map((lon) => lon * kx); const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...lats); const maxY = Math.max(...lats);
  const size = 220; const pad = 18; const scale = (size - 2 * pad) / Math.max(maxX - minX, maxY - minY, 1e-9);
  const xy = points.map((p, i) => [pad + (xs[i] - minX) * scale, size - pad - (p.lat - minY) * scale]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="220" height="220" role="img" aria-label="Farm boundary outline" dir="ltr">
      <rect x="0.5" y="0.5" width={size - 1} height={size - 1} fill="#f8fafc" stroke="#cbd5e1" />
      <polygon points={xy.map((p) => p.join(',')).join(' ')} fill="#d1fae5" stroke="#047857" strokeWidth="1.5" />
      {xy.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3" fill="#047857" /><text x={p[0] + 5} y={p[1] - 5} fontSize="10" fill="#0f172a">{i + 1}</text></g>)}
      <text x={size - 8} y="14" fontSize="10" textAnchor="end" fill="#475569">N ↑</text>
    </svg>
  );
}

function ClimateFigure({ labels, rain, temp }) {
  const w = 640; const h = 220; const pad = { l: 48, r: 48, t: 12, b: 28 };
  const maxRain = Math.max(10, ...rain.filter((v) => v !== null)); const temps = temp.filter((v) => v !== null);
  const tMin = Math.floor(Math.min(0, ...temps) / 5) * 5; const tMax = Math.ceil(Math.max(10, ...temps) / 5) * 5;
  const band = (w - pad.l - pad.r) / 12; const x = (i) => pad.l + band * i + band / 2;
  const yR = (v) => h - pad.b - (v / maxRain) * (h - pad.t - pad.b); const yT = (v) => h - pad.b - ((v - tMin) / (tMax - tMin)) * (h - pad.t - pad.b);
  const line = temp.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${yT(v).toFixed(1)}`)).filter(Boolean).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full max-w-2xl" role="img" aria-label="Monthly precipitation and temperature" dir="ltr">
      <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} stroke="#94a3b8" />
      {rain.map((v, i) => v !== null && <rect key={i} x={x(i) - band * 0.3} width={band * 0.6} y={yR(v)} height={h - pad.b - yR(v)} fill="#38bdf8" />)}
      <polyline points={line} fill="none" stroke="#dc2626" strokeWidth="2" />
      {temp.map((v, i) => v !== null && <circle key={i} cx={x(i)} cy={yT(v)} r="2.5" fill="#dc2626" />)}
      {labels.map((label, i) => <text key={label} x={x(i)} y={h - 10} fontSize="10" textAnchor="middle" fill="#334155">{label}</text>)}
      <text x={pad.l - 6} y={pad.t + 8} fontSize="10" textAnchor="end" fill="#0369a1">{Math.round(maxRain)} mm</text>
      <text x={pad.l - 6} y={h - pad.b} fontSize="10" textAnchor="end" fill="#0369a1">0</text>
      <text x={w - pad.r + 6} y={pad.t + 8} fontSize="10" fill="#b91c1c">{tMax} °C</text>
      <text x={w - pad.r + 6} y={h - pad.b} fontSize="10" fill="#b91c1c">{tMin} °C</text>
    </svg>
  );
}

function IrrigationFigure({ bars }) {
  const max = Math.max(1, ...bars.map((b) => b.range?.[1] || 0));
  return (
    <div className="max-w-2xl space-y-1.5">
      {bars.map((bar) => (
        <div key={bar.label} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_6rem] items-center gap-2 text-xs">
          <span className="truncate">{bar.label}</span>
          <span dir="ltr" className="relative h-3 rounded bg-slate-200">{bar.range && <span className="absolute inset-y-0 rounded bg-emerald-600" style={{ left: `${(100 * bar.range[0]) / max}%`, width: `${Math.max(1.5, (100 * (bar.range[1] - bar.range[0])) / max)}%` }} />}</span>
          <span dir="ltr" className="text-end">{bar.range ? `${Math.round(bar.range[0])}–${Math.round(bar.range[1])}` : '—'}</span>
        </div>
      ))}
    </div>
  );
}

function Block({ block, dataTypeLabel }) {
  const kind = block.kind && <p className="mb-1 text-xs text-slate-500">{dataTypeLabel}: {block.kind}</p>;
  if (block.type === 'text') return <p className="text-xs leading-relaxed text-slate-600">{block.text}</p>;
  if (block.type === 'list') return <div>{block.title && <h3 className="mb-1 text-sm font-semibold text-slate-900">{block.title}</h3>}{kind}<ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-slate-800">{block.items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
  if (block.type === 'kv') {
    return (
      <div>{kind}
        <table className="w-full border-collapse text-sm"><tbody>
          {block.items.map(([label, value]) => <tr key={label}><th scope="row" className="w-2/5 border-t border-slate-200 py-1.5 pe-3 text-start align-top font-normal text-slate-600">{label}</th><td className="break-words border-t border-slate-200 py-1.5 font-medium text-slate-900"><bdi>{value}</bdi></td></tr>)}
        </tbody></table>
      </div>
    );
  }
  if (block.type === 'figure') {
    return <figure className="report-avoid-break">{block.figure === 'boundary' ? <BoundaryFigure points={block.points} /> : block.figure === 'climate' ? <ClimateFigure labels={block.labels} rain={block.rain} temp={block.temp} /> : <IrrigationFigure bars={block.bars} />}<figcaption className="mt-1 text-xs text-slate-600">{block.caption}</figcaption></figure>;
  }
  return (
    <div>
      {block.title && <h3 className="mb-1 text-sm font-semibold text-slate-900">{block.title}</h3>}{kind}
      <div className="overflow-x-auto print:overflow-visible">
        <table className={`report-data-table w-full border-collapse ${block.compact ? 'report-compact' : ''} text-xs`}>
          <thead><tr>{block.head.map((cell) => <th key={cell} scope="col" className="border border-slate-300 bg-slate-100 px-1.5 py-1.5 text-start align-bottom font-semibold text-slate-800">{cell}</th>)}</tr></thead>
          <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-slate-300 px-1.5 py-1 align-top text-slate-900">{block.links?.includes(c) ? <a dir="ltr" className="break-all text-sky-800 underline" href={cell}>{cell}</a> : <bdi>{cell}</bdi>}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function FarmReportView({ session, lang, onClose }) {
  const t = REPORT_TEXT[lang] || REPORT_TEXT.en;
  const report = useMemo(() => buildFarmReport({ session, lang }), [session, lang]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const savePdf = () => { try { setError(false); window.print(); } catch { setError(true); } };
  const downloadCsv = () => {
    try {
      setError(false);
      const url = URL.createObjectURL(new Blob([reportToCsv(report)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `field-shift-report-${report.generatedAt.slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(true); }
  };

  if (!mounted) return null;
  return createPortal(
    <div className="report-print-root fixed inset-0 z-[3000] overflow-y-auto bg-slate-600" dir={report.dir} lang={lang} role="dialog" aria-modal="true" aria-label={t.exportTitle}>
      <div className="report-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-[#07152b] px-3 py-2 text-slate-100">
        <div className="min-w-0"><p className="text-sm font-semibold">{t.exportTitle}</p><p className="text-xs text-slate-300">{t.pdfHint}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={savePdf} className="app-nav-button inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-600"><Printer aria-hidden="true" className="h-4 w-4" />{t.savePdf}</button>
          <button type="button" onClick={downloadCsv} className="app-nav-button inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 text-sm text-slate-100 hover:bg-white/10"><Download aria-hidden="true" className="h-4 w-4" />{t.downloadCsv}</button>
          <button type="button" onClick={onClose} className="app-nav-button inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 text-sm text-slate-100 hover:bg-white/10"><X aria-hidden="true" className="h-4 w-4" />{t.close}</button>
        </div>
        {error && <p role="alert" className="w-full text-sm text-rose-200">{t.exportError}</p>}
      </div>
      <article className="report-page mx-auto my-4 w-full max-w-[210mm] bg-white px-5 py-6 text-slate-900 shadow-xl sm:px-10 sm:py-10">
        <header className="border-b-2 border-emerald-700 pb-3">
          <p className="text-xs font-semibold text-emerald-800">{report.platform}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{report.title}</h1>
          <p className="mt-1 text-sm text-slate-700">{report.locationLabel && <><bdi>{report.locationLabel}</bdi> · </>}{report.generatedLabel}: <span dir="ltr">{report.generatedDisplay}</span></p>
        </header>
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-slate-800">{report.notice}</p>
        {report.sections.map((section) => (
          <section key={section.id} className="mt-6" data-report-section={section.id}>
            <h2 className="report-avoid-break border-b border-slate-300 pb-1 text-base font-bold text-emerald-900">{section.title}</h2>
            {section.kind && <p className="mt-1 text-xs text-slate-500">{t.dataType}: {section.kind}</p>}
            <div className="mt-2 space-y-3">{section.blocks.map((block, index) => <Block key={index} block={block} dataTypeLabel={t.dataType} />)}</div>
          </section>
        ))}
        <footer className="mt-8 border-t border-slate-300 pt-2 text-xs text-slate-500">{report.team}</footer>
      </article>
    </div>,
    document.body,
  );
}
