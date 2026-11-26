'use client';

import { useState } from 'react';
import { advisoryFor, type HealthProfile } from '@/lib/aqi';
import { motion } from 'framer-motion';

const PROFILES: Array<{ id: HealthProfile; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'athlete', label: 'Athlete' },
  { id: 'elderly', label: 'Elderly' },
  { id: 'child', label: 'Child' },
];

export function AdvisoryPanel({ aqi }: { aqi: number | null }) {
  const [profile, setProfile] = useState<HealthProfile>('general');

  return (
    <motion.section
      aria-label="Personalized health advisory"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="panel p-5"
    >
      <span className="eyebrow">A LITTLE CARE GOES A LONG WAY</span>
      <h2 className="mb-4 mt-1 text-lg font-semibold">Plan your time outside</h2>

      <fieldset>
        <legend className="sr-only">Choose your health profile</legend>
        <div className="mb-3 flex flex-wrap gap-2" role="radiogroup">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={profile === p.id}
              onClick={() => setProfile(p.id)}
              className={
                profile === p.id
                  ? 'rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950'
                  : 'rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500'
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 rounded-xl border border-teal-300/10 bg-teal-300/[0.04] p-4">
        <p aria-live="polite" className="text-sm leading-relaxed text-slate-200">
          {aqi === null ? 'Select a reporting station to see guidance for your health profile.' : advisoryFor(aqi, profile)}
        </p>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Based on the selected station’s latest PM2.5 reading. Individual sensitivity varies; follow local health guidance.</p>
    </motion.section>
  );
}
