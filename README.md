# Nagare (流れ)

Learn Japanese one swipe at a time. Nagare is a vertical feed, like Reels or
TikTok. Each card teaches one thing: a word, a grammar pattern, a line of a
short story, or a fact about the language. Whatever you've seen comes back
later as a quick check, spaced out so it sticks.

See [`docs/PLAN.md`](docs/PLAN.md) for the product plan and how the review
schedule works.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It works best at phone
size. On desktop, use ↓/↑ (or j/k) to move between cards.

## How it works

- **Feed:** `src/components/Feed.tsx` renders full-screen cards in a CSS
  scroll-snap container. `src/lib/feed.ts` plans the next few cards as you
  scroll: new lessons in a fixed rhythm, plus quizzes on anything due.
- **Review schedule:** `src/lib/progress.ts` holds a simple staged schedule
  (1 min → 5 min → 1 day → … → 90 days), saved to IndexedDB. There are no
  accounts; progress stays on the device.
- **Lessons:** written by hand in `content/` (words, grammar, facts,
  stories), with English for every sentence. `npm run build:feed` tokenizes
  every sentence at build time and writes `public/feed/content.json`, with
  furigana and a tap-to-see gloss for each word. Rerun it after editing
  anything in `content/`.
- **Listen:** uses the browser's built-in speech synthesis (`ja-JP`), so
  nothing extra to download.

## Data

- `data/dictionary/` holds the JMdict extract and JLPT level list. They're
  build inputs only (see `NOTICE.md`). Regenerate them with
  `npm run build:jlpt-levels /path/to/jlpt-word-list/src`, then
  `npm run build:dictionary /path/to/JMdict_e`.
