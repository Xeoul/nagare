import { parseFurigana } from "@/lib/jlpt-data";

/** Renders "{三|さん}{年|ねん}" notation as <ruby>, or plain text if there's none. */
export default function FuriganaText({ text, furigana }: { text: string; furigana?: string }) {
  if (!furigana) return <span lang="ja">{text}</span>;
  return (
    <span lang="ja">
      {parseFurigana(furigana).map((part, i) =>
        part.ruby ? (
          <ruby key={i}>
            {part.text}
            <rt className="text-[0.55em] font-normal text-ink-soft">{part.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
