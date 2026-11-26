'use client';

import { useId, useState } from 'react';
import { advisoryFor, type HealthProfile } from '@/lib/aqi';

const PROFILES: Array<{ id: HealthProfile; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'athlete', label: 'Athlete' },
  { id: 'elderly', label: 'Elderly' },
  { id: 'child', label: 'Child' },
];
export function AdvisoryPanel({ aqi }: { aqi: number | null }) {
  const [profile, setProfile] = useState<HealthProfile>('general');
  const group = useId();
  return (
    <section aria-label="Personalized health advisory" className="panel p-5">
      <span className="eyebrow">A little care goes a long way</span>
      <h2 className="mb-4 mt-1 text-lg font-semibold">Plan your time outside</h2>
      <fieldset>
        <legend className="mb-3 text-xs text-slate-300">Choose your health profile</legend>
        <div className="flex flex-wrap gap-2">
          {PROFILES.map((option) => (
            <label key={option.id} className="cursor-pointer">
              <input
                type="radio"
                name={group}
                value={option.id}
                checked={profile === option.id}
                onChange={() => setProfile(option.id)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center rounded-full border border-slate-600 px-3 text-sm text-slate-200 peer-checked:border-emerald-400 peer-checked:bg-emerald-400 peer-checked:text-slate-950 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-teal-200">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 rounded-xl border border-teal-300/15 bg-teal-300/[0.04] p-4">
        <p aria-live="polite" className="text-sm leading-relaxed text-slate-200">
          {aqi === null
            ? 'Choose a station with non-stale observations for indicative health guidance.'
            : advisoryFor(aqi, profile)}
        </p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Based on available PM2.5 observations, not a medical assessment. Individual sensitivity
        varies; follow local health guidance and your clinician’s advice.
      </p>
    </section>
  );
}
