# Nagare — Product Plan

Nagare (流れ, "flow") teaches Japanese through a vertical, swipeable feed —
the same shape as Reels or TikTok, but every card is something worth
learning, and the feed quietly quizzes you on what you've seen right before
you'd forget it.

It replaces the earlier "import a book and read it" plan. Reading long texts
turned out to be the wrong unit for learning on a phone: too big to finish
in a spare minute, and nothing brings what you learned back later. A feed of
one-idea cards fits the way phones are actually used, and a built-in review
loop makes it stick.

## 1. Design principles

- **One idea per card.** Every card fits one screen and takes a few seconds:
  one word, one grammar pattern, one line of a story, one fact.
- **Informative, not just drills.** Stories and "did you know" cards sit
  between the vocab and grammar, so the feed is interesting to scroll
  rather than a flashcard deck in disguise.
- **Learning is built in.** Anything you meet comes back as a quick check a
  few swipes later, then after longer and longer gaps (spaced repetition).
  A miss sends it back to the start. You never have to open a separate
  "review" mode.
- **Try first, then check.** English translations stay blurred until
  tapped, so you get a moment to understand the Japanese on your own.
- **Every word is tappable.** Tap any word in any sentence for its reading
  and meaning, and save it — saved words join your quizzes.
- **No streaks, no guilt.** No hearts, XP, leaderboards, or "don't break
  your streak." Progress is shown as words learned, nothing else.
- **Accurate over plentiful.** The lessons are written by hand, with
  furigana checked by eye. Machine translation (tried and dropped: it
  rendered ももがながれてきました as "I'm getting nervous") and raw
  dictionary lookups (ここ came back as "nine") are too wrong to learn from.

## 2. Card types

| Card | What it shows |
|---|---|
| **New word** | Word, reading, meaning, an example sentence with the word highlighted. "I already know this" skips its early reviews. |
| **Grammar** | Pattern, one-line meaning, a short explanation, how it's formed, two examples. |
| **Story** | One line of a short original story, with a segmented progress bar. The previous line stays faintly visible. Stories come in pairs of cards, so each visit moves the plot along. |
| **Did you know** | A fact about how Japanese works (three scripts, counters, pitch accent, aizuchi…), with an example. |
| **Quick check** | Word quizzes rotate between meaning (JP → EN), reading (kanji → kana), and reverse (EN → JP). Grammar quizzes are fill-in-the-blank. |

The feed interleaves these in a fixed rhythm (see `PATTERN` in
`src/lib/feed.ts`) and slots a quick check in whenever something is due, with
at least two lesson cards between quizzes.

## 3. Review schedule

Stages and gaps (`src/lib/progress.ts`): 1 min → 5 min → 1 day → 3 days →
7 days → 16 days → 35 days → 90 days. Meeting a word or grammar point starts
it at stage 0. A correct answer moves it up a stage; a miss drops it to 0.
Stage 3 or higher counts as "learned." Once every lesson has been introduced
and nothing is due, the feed practices whatever is due soonest.

Progress lives in IndexedDB on the device. There are no accounts yet.

## 4. Content pipeline

```
content/*.json          hand-written lessons (words, grammar, facts, stories)
data/dictionary/*.json  JMdict extract + JLPT levels (tap-glosses only)
        │
        ▼  npm run build:feed   (scripts/build-feed.mjs)
public/feed/content.json  every sentence pre-tokenized with kuromoji,
                          furigana attached, and a gloss per word
```

Tokenizing at build time means the phone never downloads the ~17 MB
tokenizer dictionary or the full JMdict. It loads one ~190 KB file.

Glosses come from, in order: the hand-written word list, a small table of
particles and endings, then JMdict. JMdict matches are only used when their
reading agrees with the tokenizer's. Readings kuromoji gets wrong in this
content (日本 → にっぽん, 九時 → きゅうじ, and so on) are pinned in the
script's `PHRASES` table.

**Adding content:** edit a file in `content/`, run `npm run build:feed`, and
check the script's output. It warns when a word doesn't appear in its own
example sentence. Look over the furigana of any new sentence; if kuromoji
misreads something, add it to `PHRASES`.

## 5. Roadmap

| Next | Scope |
|---|---|
| More content | Grow N5/N4 to full JLPT coverage (~1,400 words), add N3. More stories, including multi-part series. |
| Listening cards | Hear a sentence first, then reveal the text. |
| Kanji cards | Components/radicals, readings, and words that use the kanji. |
| Sync | Optional account so progress follows you between phone and laptop. |
| Offline | Service worker so the feed works with no connection. |
