#!/usr/bin/env python3
"""Generate neural Vietnamese audio for a lesson page.
After generating audio, add the lesson to NAV in nav.js and a card in index.html (see README.md).
Usage: python3 make_audio.py lesson-N.html  [--voice vi-VN-HoaiMyNeural] [--slow -35%]
Template lessons (lesson 4+, built from lessons/_template.html) keep all data between /*DATA*/ and /*END DATA*/;
older lessons (1-3) only have `const P=[...]` and `const V=[...]`. Needs node. Writes to audio/<lesson-name>/:
  p{i}.mp3 (phrase, normal), p{i}_slow.mp3 (phrase, slow), p{i}_w{j}.mp3 (word part j),
  v{k}.mp3 (extra vocabulary item k from the optional `const V=[[jp, romaji, en], ...]`).
  Template lessons also get:
  r{k}.mp3  warm-up item k (only when it has no `ref`; refs like "lesson-1:p1" reuse that lesson's mp3),
  x{k}.mp3  warm-up item k's example sentence `ex` (only when ex[3] has no ref),
  g{k}.mp3  grammar example k (G.examples),  d{k}.mp3  dialogue line k (D),
  q{k}.mp3  quiz item k that has a `say` text (listen items and answer read-outs),  s{k}.mp3  speak-back target k (S).
Any item's optional say-text (e.g. katakana for a Latin-letter name) is what gets spoken.
i, j, k are 0-based indexes into P and P[i].parts.  Requires: pip install edge-tts gTTS  (edge-tts preferred; gTTS used if edge fails)
"""
import argparse, asyncio, json, os, re, subprocess
import edge_tts
from gtts import gTTS

def load_data(html):
    """Return dict with P, V, WARM, G, D, Q, S (missing ones empty)."""
    s = open(html, encoding="utf-8").read()
    d = re.search(r"/\*DATA\*/(.*?)/\*END DATA\*/", s, re.S)
    if d:
        code = d.group(1) + "\nconsole.log(JSON.stringify({P,V,WARM,G,D,Q,S}))"
        return json.loads(subprocess.check_output(["node", "-e", code]))
    p, v = load_phrases(html)
    return {"P": p, "V": v, "WARM": [], "G": None, "D": [], "Q": [], "S": []}

def load_phrases(html):
    s = open(html, encoding="utf-8").read()
    m = re.search(r"const P=(\[.*?\]);\s*\n", s, re.S)
    v = re.search(r"const V=(\[.*?\]);\s*\n", s, re.S)  # optional extra vocabulary [[jp, romaji, en], ...]
    js = lambda src: json.loads(subprocess.check_output(["node", "-e", f"console.log(JSON.stringify({src}))"]))
    return js(m.group(1)), (js(v.group(1)) if v else [])

EDGE_OK = True
async def tts(text, path, voice, rate):
    """Try Microsoft Edge neural TTS; if the service refuses (e.g. 403), fall back to Google TTS (gTTS)."""
    global EDGE_OK
    if EDGE_OK:
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(path); return "edge"
        except Exception as e:
            print("edge-tts failed, switching to gTTS:", str(e)[:80]); EDGE_OK = False
    gTTS(text, lang="vi", slow=rate.startswith("-") and rate != "-10%").save(path); return "gtts"

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument("html")
    ap.add_argument("--voice", default="vi-VN-HoaiMyNeural"); ap.add_argument("--slow", default="-35%")
    ap.add_argument("--force", action="store_true"); a = ap.parse_args()
    name = os.path.splitext(os.path.basename(a.html))[0]
    out = os.path.join(os.path.dirname(os.path.abspath(a.html)), "audio", name); os.makedirs(out, exist_ok=True)
    jobs = []
    src = open(a.html, encoding="utf-8").read()
    if "const SECTIONS" in src:   # reference page (reference/*.html): s{k}_i{j} items, s{k}_e{j} examples, q{k} quiz
        code = re.search(r"/\*DATA\*/(.*?)/\*END DATA\*/", src, re.S).group(1) + "\nconsole.log(JSON.stringify({SECTIONS,Q}))"
        R = json.loads(subprocess.check_output(["node", "-e", code]))
        for k, sec in enumerate(R["SECTIONS"]):
            jobs += [(x[3] if len(x) > 3 and x[3] else x[0], f"s{k}_i{j}.mp3", "-10%") for j, x in enumerate(sec["items"])]
            jobs += [(x[0], f"s{k}_e{j}.mp3", "+0%") for j, x in enumerate(sec.get("examples", []))]
        jobs += [(q["say"], f"q{k}.mp3", "+0%") for k, q in enumerate(R["Q"]) if q.get("say")]
        D = {"P": [], "V": [], "WARM": [], "G": None, "D": [], "Q": [], "S": []}
    else:
        D = load_data(a.html)
    say = lambda arr, i: arr[i] if len(arr) > i and arr[i] else arr[0]   # list items: optional say-text at index i
    jobs += [(say(w, 3), f"v{k}.mp3", "-10%") for k, w in enumerate(D["V"])]
    for i, p in enumerate(D["P"]):
        t = p.get("say") or p["jp"]
        jobs += [(t, f"p{i}.mp3", "+0%"), (t, f"p{i}_slow.mp3", a.slow)]
        jobs += [(say(w, 3), f"p{i}_w{j}.mp3", "-10%") for j, w in enumerate(p["parts"])]
    jobs += [(w.get("say") or w["jp"], f"r{k}.mp3", "+0%") for k, w in enumerate(D["WARM"]) if not w.get("ref")]
    jobs += [(w["ex"][0], f"x{k}.mp3", "+0%") for k, w in enumerate(D["WARM"]) if w.get("ex") and not (len(w["ex"]) > 3 and w["ex"][3])]
    if D["G"]:
        jobs += [(say(x, 3), f"g{k}.mp3", "+0%") for k, x in enumerate(D["G"]["examples"])]
    jobs += [(say(x, 4) if len(x) > 4 else x[1], f"d{k}.mp3", "+0%") for k, x in enumerate(D["D"])]
    jobs += [(q["say"], f"q{k}.mp3", "+0%") for k, q in enumerate(D["Q"]) if q.get("say")]
    jobs += [(x.get("say") or x["jp"], f"s{k}.mp3", "+0%") for k, x in enumerate(D["S"])]
    for text, fn, rate in jobs:
        path = os.path.join(out, fn)
        if a.force or not os.path.exists(path):
            eng = await tts(text, path, a.voice, rate); print("wrote", path, eng, text)
    print(len(jobs), "files in", out)

asyncio.run(main())
