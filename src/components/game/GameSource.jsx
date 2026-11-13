'use client';

import React from 'react';
import SourceDetails from '../common/SourceDetails';
import { POWER_VARIABLES, POWER_MONTHLY_DOCS_URL } from '../../game/services/powerMonthly.js';

const KIND = { T2M: 'modeled', T2M_MAX: 'modeled', PRECTOTCORR: 'modeled', GWETROOT: 'modeled' };

/** Source details for the NASA POWER monthly request behind the current experiment. */
export default function GameSource({ season, region, lang }) {
  if (season?.status !== 'ready' || !season.data) return null;
  const ar = lang === 'ar';
  const { data } = season;
  const returned = Object.keys(POWER_VARIABLES).filter((code) => !data.unavailable.includes(code));
  const models = data.modelSources?.length ? ` (${data.modelSources.join(', ')})` : '';
  return (
    <SourceDetails
      lang={lang}
      source={`NASA POWER${data.apiVersion ? ` API ${data.apiVersion}` : ''}`}
      dataset={data.sourceTitle ? `${data.sourceTitle}${models}` : null}
      endpoint="/api/temporal/monthly/point · community=AG"
      location={`${ar ? region.nameAr : region.nameEn} — ${data.request.latitude.toFixed(2)}, ${data.request.longitude.toFixed(2)}`}
      period={`${data.request.startYear}–${data.request.endYear} (${ar ? 'شهري' : 'monthly'})`}
      retrievedAt={data.retrievedAt}
      fromCache={Boolean(data.fromCache)}
      url={POWER_MONTHLY_DOCS_URL}
      parameters={[
        ...returned.map((code) => ({ code, name: ar ? POWER_VARIABLES[code].nameAr : POWER_VARIABLES[code].nameEn, unit: data.units?.[code], kind: KIND[code] })),
        { code: 'PRECTOTCORR × days', name: ar ? 'كمية الأمطار الشهرية' : 'Monthly precipitation total', unit: 'mm', kind: 'derived' },
      ]}
      notes={[
        ar ? 'القيم تخص خلية شبكية بدقة نصف درجة تقريبًا من نموذج إعادة التحليل MERRA-2، وليست قياسًا داخل حقل بعينه.' : 'Values describe a grid cell about half a degree wide from the MERRA-2 reanalysis; they are not measurements taken in a particular field.',
        data.unavailable.length ? `${ar ? 'لم تُرجَع في هذا الطلب' : 'Not returned for this request'}: ${data.unavailable.join(', ')}` : null,
      ]}
    />
  );
}
