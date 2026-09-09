# Nagare — Product & Technical Plan

Nagare (流れ, "flow") is a Japanese-native reader: import any text, book, or manga
and read it the way you'd read on a Kindle, except every word is a doorway into
learning it. A dedicated study hub turns what you've read (plus a structured
N5→N1 curriculum) into low-pressure spaced review of vocabulary, grammar, and
kanji.

## 1. Design principles

- **Reading first, study second.** The reader is the product. Study tools exist
  to reinforce what's read, not to gamify usage.
- **No streaks, no guilt.** SRS is used for its scheduling efficiency, not its
  behavioral hooks. No hearts, no leaderboards, no "don't break your streak."
  A due queue exists; reviewing it is optional and untimed.
- **One reader, every source.** Plain text, EPUB, web articles, and manga all
  land in the same shelf and use the same click-to-learn interaction.
- **Simple and well made.** Prefer fewer, solid features over broad, shallow
  ones. Every screen should feel intentional.
- **Cross-device by default.** Same library, same SRS state, same progress on
  phone, laptop, and PC.

## 2. Platform choice: PWA first

A installable **Progressive Web App** (single React/TypeScript codebase) is the
right fit over building separate native apps:

- One codebase covers phone, laptop, and desktop browser out of the box.
- Installable to a home screen / dock, works offline via a service worker and
  IndexedDB cache (dictionary data + in-progress books are local-first).
- File import (local file picker) and clipboard/URL import both work fine in a
  PWA — no native APIs are actually required for v1.
- If app-store presence ever matters, the same codebase wraps in **Capacitor**
  later with minimal rework. No need to decide that now.

**Recommendation:** build the PWA. Revisit native wrapping only if app-store
distribution becomes a real goal.

## 3. Feature breakdown

### 3.1 Reader

- **Import:** local file (`.txt`, `.epub`, `.pdf`, `.cbz`/`.zip` of images for
  manga) or a URL (web article — extracted via a readability parser; direct
  file link — fetched and dropped into the library).
- **Rendering:** horizontal or vertical text, optional furigana, adjustable
  font size, light/dark themes, pagination with resume-where-you-left-off.
- **Click-to-learn (the core interaction):** tap any word or kanji to open a
  popup with reading, meaning(s), part of speech, JLPT level tag, 1–2 real
  example sentences, and a "how it's used" note. One tap adds it to the study
  deck. This works identically whether the source is a novel, a manga speech
  bubble, or a pasted article.
- **Manga mode (later phase):** page images with OCR-detected text regions;
  tapping a region runs the same lookup popup as regular text.

### 3.2 Study hub

- **Vocabulary deck:** populated by (a) words you tap "add" on while reading,
  and (b) optional structured JLPT N5–N1 word lists you can opt into. Review
  modes: recognition (see word → recall meaning), production (see meaning →
  recall word/reading).
- **Kanji deck:** readings, meanings, stroke-order animation, radicals; a
  kanji's card links back to the vocab words that contain it.
- **Grammar deck:** JLPT-tagged grammar points with explanation + examples;
  tested via cloze (fill-in-the-blank) exercises rather than flashcards.
- **Scheduling:** a lightweight FSRS-style algorithm decides what's "due," but
  the UI presents it as a soft, dismissible queue — not a countdown or quota.
  New items stay suspended until explicitly added, so the deck never
  ambushes you with a backlog you didn't ask for.
- **Progress view:** N5→N1 readiness shown as coverage percentages (vocab,
  kanji, grammar known vs. that level's list) — not XP, not streaks.

### 3.3 Library

A shelf of everything imported, with per-item reading progress, last-read
position, and source metadata (book / manga / article).

## 4. Data sources

All open/free datasets — no licensing cost for an MVP:

| Data | Source | Use |
|---|---|---|
| Dictionary | JMdict | Word meanings, readings, POS |
| Kanji | KANJIDIC2 | Readings, meanings, grade, stroke count |
| Stroke order | KanjiVG | Animated stroke-order SVGs |
| Example sentences | Tatoeba (JP↔EN) | Realistic usage examples |
| JLPT level tags | community JLPT vocab/kanji/grammar lists | N5–N1 curriculum + level coverage |

**Enhancement (optional, later):** call an LLM for on-demand, level-aware
explanations ("explain this word the way you'd explain it to an N4 learner,
with a natural example") layered on top of the static dictionary data — richer
than a fixed corpus, generated only when a static example isn't enough.

## 5. Architecture

```
Client (PWA · React/TS)
  │  offline cache: IndexedDB (dictionary subset, in-progress books, SRS queue)
  ▼
API server (FastAPI · Python)
  ├── Postgres — accounts, library metadata, SRS state, progress
  ├── Object storage — uploaded books/manga files
  ├── Tokenizer service — Sudachi (accurate modern-Japanese segmentation),
  │     results cached per document so re-reads are instant
  ├── Dictionary store — JMdict/KANJIDIC2/Tatoeba preprocessed into SQLite,
  │     mirrored into Postgres for server search and shipped as a read-only
  │     bundle to the client for offline lookups
  ├── (Phase 3) OCR service — manga-ocr (Python model trained on manga text)
  └── (optional) Claude API — on-demand contextual explanations
```

Python is the pragmatic backend choice here specifically because the best
Japanese NLP and manga-OCR tooling (Sudachi, fugashi/MeCab, manga-ocr) is
Python-native — using it avoids re-implementing or shelling out to it from
another language.

Sync is account-based: library, SRS state, and progress follow the user
across devices. The client stays offline-first (reads/reviews work with no
connection; changes sync when back online).

## 6. Suggested stack

- **Frontend:** TypeScript, React (Next.js), Tailwind. Installable PWA.
- **Tokenizer:** Sudachi, run server-side, cached per document.
- **Backend:** Python (FastAPI).
- **Database/auth/storage:** Postgres — Supabase is a fast path to get
  Postgres + auth + object storage + realtime sync without hand-rolling all
  of it for a solo/small build; a self-hosted Postgres + S3-compatible store
  is the fallback if you'd rather not depend on a managed platform.
- **Dictionary storage:** JMdict/KANJIDIC2 XML preprocessed once into SQLite
  at build time, not parsed live.

## 7. Roadmap

| Phase | Scope |
|---|---|
| 0 | Core reader MVP: import txt/epub, click-to-lookup via JMdict, no accounts yet (local-only) |
| 1 | Vocabulary SRS: mining from lookups, JLPT list opt-in, review modes |
| 2 | Kanji + grammar decks, cloze grammar testing, N5–N1 progress dashboard |
| 3 | Manga import (cbz/zip) + OCR-based click-to-lookup |
| 4 | Accounts + cross-device sync, offline polish, install prompts |
| 5 (stretch) | Pitch accent, TTS/listening mode, LLM-generated contextual explanations |

## 8. Open decisions

These don't block starting Phase 0, but are worth deciding before Phase 3–4:

- **Managed vs. self-hosted backend** (Supabase vs. hand-rolled Postgres + storage) —
  affects how fast Phase 4 (accounts/sync) goes.
- **Manga timing** — OCR adds real complexity; confirm it should stay Phase 3
  rather than pulling into the MVP.
- **App-store distribution** — PWA-only vs. eventually wrapping with Capacitor
  for Play Store / App Store presence.
