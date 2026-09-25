/**
 * Reads Japanese aloud with the browser's built-in speech synthesis — no
 * download, works offline on most phones. Quietly does nothing where
 * there's no Japanese voice installed (see canSpeak).
 */
let voice: SpeechSynthesisVoice | null | undefined;

function japaneseVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null; // not loaded yet — try again next time
  voice = voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang.startsWith("ja")) ?? null;
  return voice;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.9;
  const v = japaneseVoice();
  if (v) utterance.voice = v;
  synth.speak(utterance);
}
