'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { speak, stopSpeaking, createRecognizer, parseIntent } from '@/lib/speech';
import type { AirQualityReading } from '@/lib/openaq';
import { buildOutlook, type HistoryPoint } from '@/lib/outlook';
import { concentrationToAQI, BAND_META, aqiToBand, advisoryFor, type HealthProfile } from '@/lib/aqi';

type Status = 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported';

export function VoiceAssistant({ reading, history }: { reading: AirQualityReading | null; history: HistoryPoint[] }) {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [profile] = useState<HealthProfile>('general');
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  useEffect(() => {
    setAnswer(''); setTranscript(''); setStatus('idle');
    return () => { recRef.current?.stop(); stopSpeaking(); };
  }, [reading]);

  const answerFor = async (question: string): Promise<string> => {
    const { intent } = parseIntent(question);
    const best = reading;
    if (!best) return 'Choose a location with a reporting monitoring station first.';
    const aqi = concentrationToAQI(best.pm25 ?? 0);
    const band = BAND_META[aqiToBand(aqi)];

    switch (intent) {
      case 'forecast': {
        if (history.length < 12 || Date.parse(history[history.length - 1]!.time) < Date.now() - 12 * 3600000) return 'There is not enough recent hourly history at this station to estimate an outlook.';
        const forecast = buildOutlook(history);
        return `At ${best.location}, the statistical estimate for the next 24 hours ranges from AQI ${Math.min(...forecast.map(p => p.aqi))} to ${Math.max(...forecast.map(p => p.aqi))}. This is an estimate, not an official forecast.`;
      }
      case 'advisory':
        return `Right now, ${advisoryFor(aqi, profile).toLowerCase()}`;
      case 'aqi':
      case 'unknown':
      default:
        return `The air quality near ${best.location} is ${band.label}, AQI ${aqi}, ` +
          `with PM 2.5 at ${best.pm25?.toFixed(1)} micrograms per cubic meter.`;
    }
  };

  const start = () => {
    stopSpeaking();
    const rec = createRecognizer();
    if (!rec) { setStatus('unsupported'); return; }
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = async (e) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      setStatus('thinking');
      try {
        const a = await answerFor(text);
        setAnswer(a);
        setStatus('speaking');
        speak(a, () => setStatus('idle'));
      } catch {
        setAnswer('Sorry, something went wrong fetching your air quality.');
        setStatus('idle');
      }
    };
    rec.onerror = () => setStatus('idle');
    rec.start();
    setStatus('listening');
  };

  const stop = () => {
    recRef.current?.stop();
    stopSpeaking();
    setStatus('idle');
  };

  return (
    <motion.section
      aria-label="Voice assistant"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="panel voice-panel p-5"
    >
      <span className="eyebrow">LESS GUESSWORK. MORE ANSWERS.</span>
      <h2 className="mb-3 mt-1 text-lg font-semibold">Your air, explained.</h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        Try: <em>&ldquo;What&apos;s the air quality?&rdquo;</em> · <em>&ldquo;Can I go for a run?&rdquo;</em> · <em>&ldquo;Forecast for tomorrow&rdquo;</em>
      </p>

      <form className="mb-4 flex gap-2" onSubmit={async event => {
        event.preventDefault();
        if (!question.trim()) return;
        stopSpeaking(); setTranscript(question); setAnswer(await answerFor(question)); setQuestion(''); setStatus('idle');
      }}>
        <input aria-label="Ask an air quality question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Can I go for a run?" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs outline-none focus:border-teal-300/50" />
        <button type="submit" className="rounded-lg bg-teal-300/10 px-3 text-xs text-teal-200 hover:bg-teal-300/20">Ask ↗</button>
      </form>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={status === 'listening' || status === 'speaking' ? stop : start}
          aria-pressed={status === 'listening'}
          className={
            status === 'listening'
              ? 'rounded-full bg-red-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-red-500/30'
              : 'rounded-full bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
          }
        >
          {status === 'listening' || status === 'speaking' ? '⏹ Stop' : '🎤 Speak'}
        </button>
        <p aria-live="polite" className="text-sm text-slate-300">
          {status === 'thinking' && 'Thinking…'}
          {status === 'speaking' && 'Speaking…'}
          {status === 'unsupported' && 'Voice input not supported in this browser — try Chrome.'}
          {status === 'idle' && transcript && `You asked: “${transcript}”`}
        </p>
      </div>

      {answer && (
        <p aria-live="polite" className="mt-3 rounded-xl bg-slate-800/70 p-3 text-sm leading-relaxed">
          {answer}
        </p>
      )}
    </motion.section>
  );
}
