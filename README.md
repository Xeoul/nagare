# Nagare (流れ)

A Japanese reader that teaches as you read. See [`docs/PLAN.md`](docs/PLAN.md)
for the full product and technical plan.

This is the **Phase 0** scaffold: import a `.txt` or `.epub`, read it, and
tap any word for its reading, meaning, and part of speech. Everything runs
client-side — no backend, no accounts yet (see the roadmap in the plan for
what's next).

## Getting started

```bash
npm install   # also copies the kuromoji dictionary into public/dict
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). There's a "try a sample
N5 text" link on the library page if you don't have a file handy.

## What's here vs. what's stubbed

- **Tokenizing** uses [kuromoji.js](https://github.com/takuyaa/kuromoji.js)
  entirely in the browser — no server needed for Phase 0. The plan calls for
  swapping this for a server-side Sudachi service once accuracy or
  accounts/sync (Phase 4) require a backend.
- **Dictionary lookups** use a small curated sample
  (`src/data/sample-dictionary.json`), standing in for the real
  JMdict/KANJIDIC2 data pipeline in the plan. Words outside that sample show
  a "not in the sample dictionary yet" message instead of a definition.
- **"Add to word list"** just records taps in IndexedDB
  (`src/lib/starred.ts`) — no spaced-repetition scheduling. That's the
  Phase 1 study hub's job.
- **EPUB import** is a minimal reader (unzip → follow the spine → strip HTML
  to text) — no styling, images, or footnotes.
