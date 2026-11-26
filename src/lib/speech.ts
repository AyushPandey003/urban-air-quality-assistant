/**
 * Voice assistant: SpeechRecognition -> intent -> spoken answer.
 * Graceful degradation everywhere (no mic, no speech API → buttons still work).
 */

export function speak(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  u.rate = 1.0;
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
}

export function createRecognizer(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition ??
    (window as unknown as Record<string, unknown>).SpeechRecognition;
  if (typeof Ctor !== 'function') return null;
  return new (Ctor as new () => SpeechRecognitionLike)();
}

/** Tiny rule-based NLU: maps transcript -> { intent, params }. */
export function parseIntent(transcript: string): { intent: 'aqi' | 'advisory' | 'forecast' | 'unknown' } {
  const t = transcript.toLowerCase();
  if (/(forecast|tomorrow|prediction|predict)/.test(t)) return { intent: 'forecast' };
  if (/(advice|advisory|should i|can i|run|jog|outside|walk)/.test(t)) return { intent: 'advisory' };
  if (/(air|quality|aqi|pollution|pollutant)/.test(t)) return { intent: 'aqi' };
  return { intent: 'unknown' };
}
