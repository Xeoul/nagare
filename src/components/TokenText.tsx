import { getFurigana } from "@/lib/furigana";
import type { Token } from "@/lib/tokenizer";

export default function TokenText({ token, showFurigana }: { token: Token; showFurigana: boolean }) {
  const furigana = showFurigana ? getFurigana(token) : null;
  if (!furigana) return token.surface_form;

  return (
    <>
      {furigana.before}
      <ruby>
        {furigana.kanji}
        <rt>{furigana.reading}</rt>
      </ruby>
      {furigana.after}
    </>
  );
}
