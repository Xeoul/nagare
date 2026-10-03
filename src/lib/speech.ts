// Read-aloud through the browser's built-in speech synthesis — on iPhone
// that's the system Japanese voice (Kyoko / O-ren), so it works offline and
// downloads nothing. Silently does nothing where speech isn't available.

let japaneseVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (japaneseVoice !== undefined) return japaneseVoice;
  const voices = window.speechSynthesis.getVoices();
  // getVoices() is empty until the browser has loaded its list; don't cache
  // that miss, so a later call can still find the voice.
  if (voices.length === 0) return null;
  japaneseVoice =
    voices.find((v) => v.lang === "ja-JP" && v.localService) ??
    voices.find((v) => v.lang.replace("_", "-").startsWith("ja")) ??
    null;
  return japaneseVoice;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speaks Japanese text, cutting off anything already being read. */
export function speak(text: string): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.9;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
