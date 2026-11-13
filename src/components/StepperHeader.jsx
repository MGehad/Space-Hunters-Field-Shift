'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Check } from 'lucide-react';

export default function StepperHeader({ currentStep = 1 }) {
  const { t, lang } = useLanguage();

  const steps = [
    { num: 1, title: t.step1 },
    { num: 2, title: t.step2 },
    { num: 3, title: t.step3 },
  ];

  return (
    <nav aria-label={lang === 'ar' ? 'مراحل المهمة' : 'Mission stages'} className="flex w-full shrink-0 justify-center py-1">
      <ol className="flex max-w-full min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-[#061633] px-3 py-2 sm:gap-4 sm:px-6">
        {steps.map((step, index) => {
          const isDone = currentStep > step.num;
          const isActive = currentStep === step.num;

          return (
            <li key={step.num} aria-current={isActive ? 'step' : undefined} className={`flex items-center gap-2 sm:gap-4 ${isActive ? 'min-w-0' : 'shrink-0'}`}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-cyan-500 text-slate-950'
                        : 'border border-slate-500 text-slate-300'
                  }`}
                >
                  {isDone ? <Check aria-hidden="true" className="h-4 w-4" /> : step.num}
                </span>
                {/* Phones show the active label only; every label appears from 640px up. */}
                <span
                  className={`min-w-0 truncate text-sm ${isActive ? 'font-semibold text-white' : `${isDone ? 'text-emerald-200' : 'text-slate-300'} max-sm:sr-only`}`}
                >
                  {step.title}
                </span>
              </div>

              {index < steps.length - 1 && (
                <span aria-hidden="true" className={`h-px w-4 shrink-0 sm:w-8 ${isDone ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
