import { afterEach, expect, it, vi } from 'vitest';
import { createRecognizer, parseIntent, speak, stopSpeaking } from './speech';
afterEach(() => vi.unstubAllGlobals());
it.each([
  ['tomorrow', 'forecast'],
  ['outlook', 'forecast'],
  ['can I run', 'advisory'],
  ['air quality', 'aqi'],
  ['pollution', 'aqi'],
  ['hello', 'unknown'],
] as const)('routes %s to %s', (question, intent) =>
  expect(parseIntent(question).intent).toBe(intent),
);
it('degrades safely when recognition is unavailable or its constructor fails', () => {
  vi.stubGlobal('SpeechRecognition', undefined);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
  expect(createRecognizer()).toBeNull();
  vi.stubGlobal(
    'SpeechRecognition',
    class {
      constructor() {
        throw new Error('unsupported');
      }
    },
  );
  expect(createRecognizer()).toBeNull();
});
it('creates a supported recognizer', () => {
  class Recognizer {}
  vi.stubGlobal('SpeechRecognition', Recognizer);
  expect(createRecognizer()).toBeInstanceOf(Recognizer);
});
it('signals completion when speech synthesis is unavailable', () => {
  const done = vi.fn();
  vi.stubGlobal('window', {});
  speak('hello', done);
  expect(done).toHaveBeenCalledOnce();
  stopSpeaking();
});
it('cancels old speech, speaks a new utterance, and observes end/error', () => {
  const synth = { cancel: vi.fn(), speak: vi.fn() };
  class Utterance {
    rate = 0;
    pitch = 0;
    onend?: () => void;
    onerror?: () => void;
    constructor(public text: string) {}
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('speechSynthesis', synth);
  const done = vi.fn();
  speak('hello', done);
  expect(synth.cancel).toHaveBeenCalledOnce();
  const utterance = synth.speak.mock.calls[0]![0] as Utterance;
  expect(utterance.text).toBe('hello');
  utterance.onend?.();
  utterance.onerror?.();
  expect(done).toHaveBeenCalledTimes(2);
  stopSpeaking();
  expect(synth.cancel).toHaveBeenCalledTimes(2);
});
