# Daily Vietnamese lessons

Interactive Vietnamese lessons (neural-voice audio, slow mode, quiz, 🎤 say-it-back, vocab sidebar). Same format as `wzwow/japanese-lessons`.
View via githack (GitHub Pages is not used): `https://rawcdn.githack.com/wzwow/vietnamese-lessons/<commit-sha>/index.html`

## Adding the next lesson (N)
1. Copy `lessons/_template.html` (or the latest lesson) to `lessons/lesson-N.html`. Only edit the block between `/*DATA*/` and `/*END DATA*/`:
   - `META`: `stage` = phase (1–6, lessons 10p−9..10p), `lesson:N`, `total:60`, `review:true` on every 5th lesson (warm-up + quiz only), prev/next links.
   - `P` 4–5 phrases `{jp: Vietnamese, ro: pronunciation guide, en, parts:[[vi, guide, en]], note}`; `V` 5–6 sidebar vocab `[vi, guide, en]`;
     `G` grammar; `D` dialogue `[speaker|"you", vi, guide, en]`; `WARM` earlier phrases (`ref:"lesson-X:pI"` reuses audio); `Q` quiz; `S` speak-back.
   - Topic for lesson N comes from `plan.html`.
2. Audio: `pip install edge-tts gTTS` then `python3 make_audio.py lessons/lesson-N.html` (voice `vi-VN-HoaiMyNeural`; writes `lessons/audio/lesson-N/*.mp3`).
3. Add a line to `NAV` in `nav.js`, a card in `index.html`, set the previous lesson's `META.next`, and in `plan.html` bump `DONE` (in the progress card, mark the lesson ✅ with a link, move "next up").
4. Commit and push to `main`; the mp3s are pushed directly with `git` (no unpack Action in this repo: the box's gh token lacks the `workflow` scope needed to add one, and it isn't needed).
5. Share pinned URLs: `https://rawcdn.githack.com/wzwow/vietnamese-lessons/<new-sha>/lessons/lesson-N.html`.

Progress, quiz scores and warm-up ratings are stored in the browser's `localStorage` (keys `vl-*`).
