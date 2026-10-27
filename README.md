# Daily Vietnamese lessons

Interactive Vietnamese lessons (neural-voice audio, slow mode, quiz, 🎤 say-it-back, vocab sidebar). Same format as `wzwow/japanese-lessons`.

**No personalization:** use generic sample names (Minh, Mai, Lan) and neutral topics; no real learner names, locations or job details.
View via githack (GitHub Pages is not used): `https://rawcdn.githack.com/wzwow/vietnamese-lessons/<commit-sha>/index.html`

## Adding the next lesson (N)
1. Copy `lessons/_template.html` (or the latest lesson) to `lessons/lesson-N.html`. Only edit the block between `/*DATA*/` and `/*END DATA*/`:
   - `META`: `stage` = phase (1–6, lessons 10p−9..10p), `lesson:N`, `total:60`, `review:true` on every 5th lesson (warm-up + quiz only), prev/next links.
   - `P` 4–5 phrases `{jp: Vietnamese, ro: pronunciation guide, en, parts:[[vi, guide, en]], note}`; `V` 5–6 sidebar vocab `[vi, guide, en]`;
     `G` grammar; `D` dialogue `[speaker|"you", vi, guide, en]`; `WARM` earlier phrases (`ref:"lesson-X:pI"` reuses audio); `Q` quiz; `S` speak-back.
   - Topic for lesson N comes from `plan.html`.
2. Audio: `pip install edge-tts gTTS` then `python3 make_audio.py lessons/lesson-N.html` (female voice `vi-VN-HoaiMyNeural`; writes `lessons/audio/lesson-N/*.mp3`).
3. Add a line to `NAV` in `nav.js`, a card in `index.html`, set the previous lesson's `META.next`, and in `plan.html` bump `DONE` (in the progress card, mark the lesson ✅ with a link, move "next up").
4. Commit and push to `main`; the mp3s are pushed directly with `git` (no unpack Action in this repo: the box's gh token lacks the `workflow` scope needed to add one, and it isn't needed).
5. Share pinned URLs: `https://rawcdn.githack.com/wzwow/vietnamese-lessons/<new-sha>/lessons/lesson-N.html`.

Progress, quiz scores and warm-up ratings are stored in the browser's `localStorage` (keys `vl-*`).

## Word-order quiz & answer checking
Unlike Japanese, Vietnamese words are separated by spaces. Tapped `order` tiles are joined with a single space, and every check
(word order, speak-back scoring) goes through `norm()`: Unicode NFC, lower-case, punctuation removed (spaces before punctuation ignored),
whitespace collapsed, trimmed. Write each `order` question's `tiles` so that joining them with spaces gives `answer`
(punctuation may stay attached to a tile, e.g. `"Xin chào,"`). Speak-back scoring counts matching words.

## QA before publishing (mandatory)
Before every push:
1. `npm install` (once; installs Playwright) then `npm run qa` (serves the repo locally; or `node qa/qa.mjs <githack-base-url>`).
   It checks, at mobile 390×844 and desktop: no console errors / failed requests, every phrase/word/vocab/grammar/dialogue/quiz/speak-back
   item has an mp3 that returns 200 `audio/mpeg`, every quiz answered correctly is marked Correct and reaches full marks, every wrong
   answer is rejected, word-order tiles display with single spaces, Reset clears, menu opens/closes, all links (nav, prev/next) resolve,
   no horizontal overflow or clipped text, NFC encoding, and no personal details.
2. **All checks must pass** (`QA: N passed, 0 failed`). Fix and rerun until clean.
3. Open and review the screenshots in `qa/screenshots/` (mobile and desktop: load, menu, quiz done, wrong answers) for visual glitches.
4. Content review by hand (the script can't judge this): Vietnamese spelling and tone marks, pronunciation guides, English meanings,
   regional notes (e.g. má = mother is Southern; North uses mẹ), and that every quiz `answer` index is actually right.
5. Only then commit and push, and check the githack URLs at the new sha return 200.
