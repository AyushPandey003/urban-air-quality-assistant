'use client';

import { useEffect, useRef, useState } from 'react';
import { answerQuestion } from '@/lib/assistant';
import type { AirQualityReading } from '@/lib/openaq';
import type { HistoryPoint } from '@/lib/outlook';
import { speak, stopSpeaking, createRecognizer } from '@/lib/speech';

type Status = 'idle' | 'listening' | 'speaking' | 'unsupported';
export function VoiceAssistant({
  reading,
  history,
}: {
  reading: AirQualityReading | null;
  history: HistoryPoint[];
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [question, setQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  function stop() {
    recRef.current?.stop();
    stopSpeaking();
    setStatus('idle');
  }
  function respond(text: string, aloud = false) {
    const response = answerQuestion(text, reading, history);
    setTranscript(text);
    setAnswer(response);
    if (aloud) {
      setStatus('speaking');
      speak(response, () => {
        if (mounted.current) setStatus('idle');
      });
    } else setStatus('idle');
  }
  function start() {
    stopSpeaking();
    const recognizer = createRecognizer();
    if (!recognizer) {
      setStatus('unsupported');
      return;
    }
    recRef.current = recognizer;
    recognizer.lang = 'en-US';
    recognizer.interimResults = false;
    recognizer.onresult = (event) => {
      if (!mounted.current) return;
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) respond(text, true);
    };
    recognizer.onerror = () => {
      if (mounted.current) setStatus('idle');
    };
    recognizer.onend = () => {
      if (mounted.current) setStatus((current) => (current === 'listening' ? 'idle' : current));
    };
    try {
      recognizer.start();
      setStatus('listening');
    } catch {
      setStatus('unsupported');
    }
  }
  const active = status === 'listening' || status === 'speaking';
  return (
    <section aria-label="Air assistant" className="panel voice-panel p-5">
      <span className="eyebrow">Less guesswork. More answers.</span>
      <h2 className="mb-3 mt-1 text-lg font-semibold">Your air, explained.</h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-300">
        A rule-based helper for the selected station. Ask about air quality, outdoor activity, or
        the outlook.
      </p>
      <form
        className="mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return;
          stop();
          respond(question.trim());
          setQuestion('');
        }}
      >
        <label htmlFor="air-question" className="mb-2 block text-xs text-slate-300">
          Your question
        </label>
        <div className="flex gap-2">
          <input
            id="air-question"
            value={question}
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Can I go for a run?"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-black/10 px-3 py-2 text-sm focus:border-teal-300"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-teal-300/10 px-3 text-sm text-teal-200 hover:bg-teal-300/20"
          >
            Ask ↗
          </button>
        </div>
      </form>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={active ? stop : start}
          aria-pressed={active}
          className="min-h-11 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-300"
        >
          {active ? 'Stop voice' : 'Speak a question'}
        </button>
        <p role="status" className="text-xs text-slate-300">
          {status === 'listening'
            ? 'Listening…'
            : status === 'speaking'
              ? 'Speaking…'
              : status === 'unsupported'
                ? 'Voice unavailable. Use the text field instead.'
                : ''}
        </p>
      </div>
      {transcript && <p className="mt-3 text-xs text-slate-400">You asked: {transcript}</p>}
      {answer && (
        <p role="status" className="mt-3 rounded-xl bg-slate-800/70 p-3 text-sm leading-relaxed">
          {answer}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Text questions stay in your browser. Optional voice recognition may send audio to your
        browser provider; use text for privacy.
      </p>
    </section>
  );
}
