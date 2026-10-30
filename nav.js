// Shared sidebar nav. To add a lesson, add one line to NAV (href is relative to the repo root).
const NAV = [
  { title: "Home", href: "index.html" },
  { title: "Learning plan", href: "plan.html" },
  { title: "Common words: numbers, money, units, time", href: "reference/common-words.html" },
  { title: "Lesson 1: The 6 tones & greetings", href: "lessons/lesson-1.html" },
  { title: "Lesson 2: Vowels", href: "lessons/lesson-2.html" },
  { title: "Lesson 3: Consonants", href: "lessons/lesson-3.html" },
  { title: "Lesson 4: Pronouns", href: "lessons/lesson-4.html" },
  { title: "Lesson 5: Review (tones, vowels, consonants, pronouns)", href: "lessons/lesson-5.html" },
];
(function () {
  const base = new URL(".", document.currentScript.src); // repo root, wherever it's hosted
  const here = location.href.split(/[?#]/)[0].replace(/\/$/, "/index.html");
  const css = `
#jnav{position:fixed;top:0;left:0;bottom:0;width:240px;background:#fff;box-shadow:2px 0 12px #0001;padding:24px 14px;box-sizing:border-box;overflow-y:auto;z-index:20;font-family:system-ui,sans-serif;transition:transform .25s}
#jnav .brand{font-weight:700;font-size:17px;margin:0 8px 16px;color:#222}
#jnav a{display:block;padding:10px 12px;margin-bottom:4px;border-radius:10px;color:#222;text-decoration:none;font-size:15px;line-height:1.3}
#jnav a:hover{background:#f1ede4}#jnav a.cur{background:#222;color:#fff}
#jnavbtn{display:none;position:fixed;top:12px;left:12px;z-index:30;border:0;border-radius:999px;width:44px;height:44px;margin:0;padding:0;font-size:22px;background:#222;color:#fff;cursor:pointer;box-shadow:0 2px 10px #0003}
#jnavbg{display:none;position:fixed;inset:0;background:#0004;z-index:15}
@media(min-width:900px){body{padding-left:260px!important;max-width:1020px!important}}
@media(max-width:899px){#jnav{transform:translateX(-100%)}body.navopen #jnav{transform:none}body.navopen #jnavbg{display:block}#jnavbtn{display:block}body{padding-top:68px!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const nav = document.createElement("nav"); nav.id = "jnav";
  nav.innerHTML = '<div class="brand">🇻🇳 Daily Vietnamese</div>' + NAV.map(n => {
    const u = new URL(n.href, base).href;
    return `<a href="${u}"${u === here ? ' class="cur" aria-current="page"' : ""}>${n.title}</a>`;
  }).join("");
  const btn = document.createElement("button"); btn.id = "jnavbtn"; btn.textContent = "☰"; btn.setAttribute("aria-label", "Menu");
  const bg = document.createElement("div"); bg.id = "jnavbg";
  const toggle = o => document.body.classList.toggle("navopen", o);
  btn.onclick = () => toggle(!document.body.classList.contains("navopen")); bg.onclick = () => toggle(false);
  document.body.prepend(bg, nav, btn);
})();
