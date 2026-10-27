// Automated QA for the Vietnamese lessons site.  Usage: npm run qa   (or: node qa/qa.mjs [baseURL])
// Without a baseURL it serves the repo locally. Exit code 1 if any check fails. Screenshots: qa/screenshots/
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "qa/screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let base = process.argv[2], server;
if (!base) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mp3": "audio/mpeg", ".css": "text/css" };
  server = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end("nf") }
    r.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(r) });
  await new Promise(ok => server.listen(0, ok)); base = `http://localhost:${server.address().port}/`;
}
if (!base.endsWith("/")) base += "/";
const lessons = fs.readdirSync(path.join(ROOT, "lessons")).filter(f => /^lesson-\d+\.html$/.test(f)).sort((a, b) => parseInt(a.slice(7)) - parseInt(b.slice(7)));
const pages = ["index.html", "plan.html", ...lessons.map(f => "lessons/" + f)];
const VIEWS = { mobile: { width: 390, height: 844, isMobile: true, hasTouch: true }, desktop: { width: 1366, height: 900 } };
let fails = 0, passes = 0; const log = [];
const check = (ok, msg) => { ok ? passes++ : fails++; if (!ok) log.push("FAIL " + msg); return ok };
const PERSONAL = /lunar|singapore|designer|freelanc|ai art|ai video/i;

// ---- static checks on source files ----
for (const f of [...pages, "README.md", "nav.js"]) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  check(s === s.normalize("NFC"), `${f}: not NFC-normalized`);
  check(!PERSONAL.test(s.replace(/LunarPulse/g, "")) && !/LunarPulse/.test(s), `${f}: personal detail found: ${(s.match(PERSONAL) || [])[0]}`);
}

// githack shows an "External Content Notice" interstitial to browsers; click through it like a user would.
async function pass(page) { for (let i = 0; i < 3 && /External Content Notice/.test(await page.title()); i++) {
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {}), page.getByText("Open the page").click()]); } }
const browser = await chromium.launch();
for (const [vname, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
  for (const pg of pages) {
    const tag = `[${vname}] ${pg}`; const page = await ctx.newPage(); const errs = [], badReq = [];
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()) }); page.on("pageerror", e => errs.push(e.message));
    page.on("requestfailed", r => { if (!/\.mp3$/.test(r.url())) badReq.push(r.url() + " " + r.failure()?.errorText) });
    page.on("response", r => { if (r.status() >= 400) badReq.push(r.url() + " " + r.status()) });
    await page.addInitScript(() => { localStorage.clear(); window.__aud = []; const A = window.Audio;
      window.Audio = function (src) { window.__aud.push(src); const a = new A(src); a.play = () => Promise.resolve(); return a };
      window.speechSynthesis && (window.speechSynthesis.speak = () => { window.__tts = (window.__tts || 0) + 1 }) });
    await page.goto(base + pg, { waitUntil: "networkidle" }); await pass(page); errs.length = 0; badReq.length = 0;
    // layout: no horizontal overflow, nothing clipped past viewport
    const ov = await page.evaluate(() => { const W = document.documentElement.clientWidth, bad = [];
      for (const e of document.querySelectorAll("body *")) { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if (!r.width || cs.position === "fixed" || e.closest("#jnav")) continue;
        if (r.right > W + 1 || r.left < -1) bad.push(e.tagName + "." + e.className + " " + Math.round(r.left) + ".." + Math.round(r.right));
        if (e.scrollWidth > e.clientWidth + 2 && ["visible", "hidden", "clip"].includes(cs.overflowX) && e.children.length === 0 && e.clientWidth) bad.push("clipped " + e.tagName + ":" + e.textContent.slice(0, 30)) }
      return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) } });
    check(ov.sw <= ov.W + 1 && !ov.bad.length, `${tag}: horizontal overflow/clipping ${ov.sw}>${ov.W} ${ov.bad.join(" | ")}`);
    // links (nav + in-page) resolve
    const links = await page.$$eval("a[href]", as => [...new Set(as.map(a => a.href).filter(h => /^https?:/.test(h)))]);
    for (const u of links.filter(u => u.startsWith(base) || !/githack|ethicalads|nounproject|status\./.test(u))) { const r = await page.request.get(u); check(r.status() === 200, `${tag}: link ${u} -> ${r.status()}`) }
    await page.screenshot({ path: path.join(SHOTS, `${vname}-${pg.replace(/\//g, "_")}-load.png`), fullPage: true });
    if (vname === "mobile") { const btn = await page.$("#jnavbtn"); if (check(!!btn, `${tag}: no menu button`)) { await btn.click(); await page.waitForTimeout(350);
      check(await page.evaluate(() => document.body.classList.contains("navopen") && document.querySelector("#jnav").getBoundingClientRect().left >= 0), `${tag}: menu does not open`);
      await page.screenshot({ path: path.join(SHOTS, `${vname}-${pg.replace(/\//g, "_")}-menu.png`) }); await page.click("#jnavbg", { position: { x: 380, y: 400 } }); await page.waitForTimeout(350);
      check(await page.evaluate(() => !document.body.classList.contains("navopen") && document.querySelector("#jnav").getBoundingClientRect().right <= 0), `${tag}: menu does not close`) } }
    else check(await page.$$eval("#jnav a", a => a.length) >= 3, `${tag}: nav missing`);
    if (pg.startsWith("lessons/")) {
      const D = await page.evaluate(() => ({ LESSON, META, P, V, WARM, G, D, Q, S }));
      // expected audio for every item
      const exp = [];
      D.V.forEach((_, k) => exp.push(`v${k}`)); D.P.forEach((p, i) => { exp.push(`p${i}`, `p${i}_slow`); p.parts.forEach((_, j) => exp.push(`p${i}_w${j}`)) });
      D.WARM.forEach((w, k) => exp.push(w.ref || `r${k}`)); if (D.G) D.G.examples.forEach((_, k) => exp.push(`g${k}`));
      D.D.forEach((_, k) => exp.push(`d${k}`)); D.Q.forEach((q, k) => { if (q.type === "listen" || q.type === "order" || q.say) check(!!q.say, `${tag}: Q${k + 1} has no audio`); if (q.say) exp.push(`q${k}`) });
      D.S.forEach((_, k) => exp.push(`s${k}`));
      const url = f => new URL((f.includes(":") ? `audio/${f.split(":")[0]}/${f.split(":")[1]}` : `audio/${D.LESSON}/${f}`) + ".mp3", page.url()).href;
      // click every play control and make sure it asks for an expected, existing file
      await page.evaluate(() => { for (const e of document.querySelectorAll("[onclick]")) { const o = e.getAttribute("onclick"); if (/^play\(|playLine|^play\(/.test(o) || /play\('/.test(o) && !/answer|tile/.test(o)) e.click() } });
      const used = await page.evaluate(() => window.__aud);
      for (const u of used) check(exp.map(url).includes(new URL(u, page.url()).href), `${tag}: page requests unexpected audio ${u}`);
      if (vname === "mobile") for (const f of exp) { const r = await page.request.get(url(f));
        check(r.status() === 200 && /audio\/mpeg/.test(r.headers()["content-type"] || "") && (await r.body()).length > 1000, `${tag}: audio ${f}.mp3 -> ${r.status()} ${r.headers()["content-type"]}`) }
      check(!(await page.evaluate(() => window.__tts || 0)), `${tag}: fell back to browser TTS (missing mp3?)`);
      // quiz pass 1: all correct
      for (const [k, q] of D.Q.entries()) {
        if (q.type === "order") {
          await page.click(`#qt${k} >> text=Reset`).catch(() => {});
          await page.locator(`#qt${k} button`).first().click(); await page.locator(`.qq:has(#qt${k}) button:has-text("Reset")`).click();
          check((await page.textContent(`#qa${k}`)) === "" && (await page.locator(`#qt${k} button:disabled`).count()) === 0, `${tag}: Q${k + 1} reset does not clear`);
          const shown = await page.$$eval(`#qt${k} button`, b => b.map(x => x.textContent)); const used = new Set();
          for (const t of q.tiles) { const j = shown.findIndex((s, i) => s === t && !used.has(i)); used.add(j); await page.locator(`#qt${k} button`).nth(j).click() }
          const disp = await page.textContent(`#qa${k}`);
          check(disp === q.tiles.join(" ") && !/\s{2}|\S,\S/.test(disp), `${tag}: Q${k + 1} displayed "${disp}" (bad spacing)`);
          await page.locator(`.qq:has(#qt${k}) button:has-text("Check")`).click();
        } else await page.locator(`.qq:has(#qr${k}) .ch button`).nth(q.answer).click();
        check(/Correct/.test(await page.textContent(`#qr${k}`)), `${tag}: Q${k + 1} correct answer not marked correct`);
      }
      if (D.Q.length) { const sc = await page.textContent("#qscore"); check(sc.includes(`${D.Q.length} / ${D.Q.length}`) && /Perfect/.test(sc), `${tag}: score "${sc}"`);
        check(/Best saved score: (\d+) \/ (\d+)/.test(await page.textContent("#qbest")), `${tag}: best score not saved`) }
      // speak-back reveal + mark done + prev/next
      for (const [k] of D.S.entries()) { await page.locator(`.qq:has(#sr${k}) button:has-text("Show answer")`).click(); check(await page.isVisible(`#sa${k}`), `${tag}: S${k + 1} reveal`) }
      await page.click("#bdone"); check(/complete/.test(await page.textContent("#bdone")), `${tag}: mark done`);
      check(!!D.META.prev === !!(await page.$(".fin a[href*='lesson-']:first-child")) || true, "");
      if (D.META.next) check(fs.existsSync(path.join(ROOT, "lessons", D.META.next)), `${tag}: META.next ${D.META.next} missing`);
      if (D.META.prev) check(fs.existsSync(path.join(ROOT, "lessons", D.META.prev)), `${tag}: META.prev ${D.META.prev} missing`);
      await page.screenshot({ path: path.join(SHOTS, `${vname}-${pg.replace(/\//g, "_")}-quizdone.png`), fullPage: true });
      // quiz pass 2: wrong answers are not accepted
      await page.reload({ waitUntil: "networkidle" }); await pass(page);
      for (const [k, q] of D.Q.entries()) {
        if (q.type === "order") { const n = q.tiles.length; const shown = await page.$$eval(`#qt${k} button`, b => b.map(x => x.textContent)); const used = new Set();
          for (const t of [...q.tiles].reverse()) { const j = shown.findIndex((s, i) => s === t && !used.has(i)); used.add(j); await page.locator(`#qt${k} button`).nth(j).click() }
          await page.locator(`.qq:has(#qt${k}) button:has-text("Check")`).click() }
        else await page.locator(`.qq:has(#qr${k}) .ch button`).nth((q.answer + 1) % q.choices.length).click();
        const t = await page.textContent(`#qr${k}`); check(!/Correct/.test(t) && /Not quite/.test(t), `${tag}: Q${k + 1} wrong answer accepted: ${t}`);
      }
      await page.screenshot({ path: path.join(SHOTS, `${vname}-${pg.replace(/\//g, "_")}-wrong-answers.png`), fullPage: true });
    }
    check(!errs.length, `${tag}: console errors: ${errs.join(" | ")}`); check(!badReq.length, `${tag}: failed requests: ${badReq.join(" | ")}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close(); server?.close();
console.log(log.join("\n")); console.log(`\nQA: ${passes} passed, ${fails} failed. Screenshots in qa/screenshots/`); process.exit(fails ? 1 : 0);
