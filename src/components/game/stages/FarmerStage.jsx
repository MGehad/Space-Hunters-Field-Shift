'use client';

import React, { useEffect, useRef } from 'react';
import { MessageCircleQuestion, SkipForward } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useGame } from '../../../game/state/GameContext';
import { ASSISTANT_QUESTIONS } from '../../../game/data/gameCountries.js';
import { CharacterMessage, getCharacter, primaryButton, secondaryButton } from '../ui';

/**
 * Stage 2: a scripted, reviewed conversation. The player advances it line by
 * line and can ask predefined questions at any time; nothing is generated.
 */
export default function FarmerStage({ country }) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const { state, dispatch } = useGame();
  const endRef = useRef(null);
  const { step, asked } = state.conversation;
  const script = country?.script || [];
  const finished = step >= script.length - 1;
  const questions = [
    ...(country?.farmerQuestions || []).map((q) => ({ ...q, speaker: 'farmer' })),
    ...ASSISTANT_QUESTIONS.map((q) => ({ ...q, speaker: 'assistant' })),
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [step, asked.length]);
  if (!country) return null;

  const farmer = getCharacter('farmer', country.id, lang);
  const assistant = getCharacter('assistant', country.id, lang);
  const advance = () => dispatch({ type: 'conversation', patch: { step: Math.min(script.length - 1, step + 1) } });
  const skip = () => dispatch({ type: 'conversation', patch: { step: script.length - 1 } });
  const ask = (id) => { if (!asked.includes(id)) dispatch({ type: 'conversation', patch: { asked: [...asked, id] } }); };

  return (
    <div className="space-y-5">
      <section aria-label={ar ? 'الشخصيات' : 'Characters'} className="grid gap-3 sm:grid-cols-2">
        {[farmer, assistant].map((who) => (
          <div key={who.name} className="surface-card flex items-center gap-3 p-3">
            <img src={who.avatar} alt="" width="48" height="48" decoding="async" className={`h-12 w-12 shrink-0 rounded-full border-2 object-cover ${who.tone === 'farmer' ? 'border-amber-400/70' : 'border-cyan-400/70'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{who.name}</p>
              <p className="text-xs text-slate-300">{who.role} — {who.tone === 'farmer' ? (ar ? 'يعرض الحالة الزراعية في المنطقة' : 'presents the local farming case') : (ar ? 'تشرح البيانات والمفاهيم' : 'explains the data and ideas')}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-label={ar ? 'الحوار' : 'Conversation'} aria-live="polite" className="space-y-3">
        {script.slice(0, step + 1).map((entry, index) => (
          <CharacterMessage key={index} speaker={entry.speaker} countryId={country.id} lang={lang}>{ar ? entry.textAr : entry.textEn}</CharacterMessage>
        ))}
        {asked.map((id) => {
          const q = questions.find((item) => item.id === id);
          if (!q) return null;
          return (
            <div key={id} className="space-y-2">
              <p className="ms-auto w-fit max-w-[40rem] rounded-2xl rounded-ee-sm border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm text-slate-100"><span className="sr-only">{ar ? 'سؤالك: ' : 'You asked: '}</span>{ar ? q.qAr : q.qEn}</p>
              <CharacterMessage speaker={q.speaker} countryId={country.id} lang={lang}>{ar ? q.aAr : q.aEn}</CharacterMessage>
            </div>
          );
        })}
        <div ref={endRef} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {!finished ? (
          <>
            <button type="button" onClick={advance} className={primaryButton}>{ar ? 'متابعة الحوار' : 'Continue the conversation'}</button>
            <button type="button" onClick={skip} className={secondaryButton}><SkipForward aria-hidden="true" className="h-4 w-4" />{ar ? 'تخطي إلى النهاية' : 'Skip to the end'}</button>
          </>
        ) : (
          <button type="button" onClick={() => dispatch({ type: 'goto', stage: 'setup' })} className={primaryButton}>{ar ? 'بدء التجربة' : 'Start the experiment'}</button>
        )}
      </div>

      <section aria-labelledby="ask-title" className="surface-card space-y-3 p-4">
        <h2 id="ask-title" className="flex items-center gap-2 text-card-title font-semibold text-white"><MessageCircleQuestion aria-hidden="true" className="h-5 w-5 text-cyan-300" />{ar ? 'اطرح سؤالًا' : 'Ask a question'}</h2>
        <ul className="flex flex-wrap gap-2">
          {questions.map((q) => {
            const done = asked.includes(q.id);
            const who = q.speaker === 'farmer' ? farmer : assistant;
            return (
              <li key={q.id}>
                <button type="button" disabled={done} onClick={() => ask(q.id)} className="app-nav-button rounded-full border border-white/15 px-3.5 text-start text-sm text-slate-100 hover:bg-white/10 disabled:opacity-45">
                  <span className={`me-1.5 text-xs ${q.speaker === 'farmer' ? 'text-amber-200' : 'text-cyan-200'}`}>{who.name}:</span>{ar ? q.qAr : q.qEn}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-400">{ar ? 'هذه الإجابات محتوى تعليمي مُعدّ ومُراجَع، وليست ردًّا آليًا.' : 'Answers are fixed, reviewed educational content, not generated text.'}</p>
      </section>
    </div>
  );
}
