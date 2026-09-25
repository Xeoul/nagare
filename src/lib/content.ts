export type Level = "N5" | "N4";

/**
 * One pre-tokenized word of a sentence (see scripts/build-feed.mjs):
 * surface text, furigana as [before, kanji, reading, after], the glossary
 * key to show when tapped, and whether it's the word the card is teaching.
 */
export type Tok = {
  s: string;
  f?: [string, string, string, string];
  g?: string;
  h?: 1;
};

export type Line = { tokens: Tok[]; en: string };

export type Gloss = { r: string; m: string; p: string; l?: string };

export type Word = {
  key: string;
  reading: string;
  meaning: string;
  pos: string;
  level: Level;
  example: Line;
};

export type GrammarPoint = {
  id: string;
  level: Level;
  pattern: string;
  title: string;
  explain: string;
  form: string;
  examples: Line[];
  quiz: { en: string; answer: string; options: string[]; before: Tok[]; after: Tok[] };
};

export type Fact = { id: string; title: string; body: string; example?: Line };

export type Story = { id: string; title: string; en: string; level: Level; sentences: Line[] };

export type Content = {
  words: Word[];
  grammar: GrammarPoint[];
  facts: Fact[];
  stories: Story[];
  glossary: Record<string, Gloss>;
};

let contentPromise: Promise<Content> | null = null;

/** Everything the feed shows, built from content/ by `npm run build:feed`. Cached after the first load. */
export function loadContent(): Promise<Content> {
  if (!contentPromise) {
    contentPromise = fetch("/feed/content.json").then((res) => {
      if (!res.ok) throw new Error(`Couldn't load lessons (${res.status})`);
      return res.json() as Promise<Content>;
    });
    contentPromise.catch(() => {
      contentPromise = null;
    });
  }
  return contentPromise;
}

export function lineText(tokens: Tok[]): string {
  return tokens.map((t) => t.s).join("");
}
