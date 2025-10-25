// nuke-voice-coach.mjs
// One-shot script to REMOVE the old "Voice Coach" panel everywhere,
// while keeping the newer "Voice Assistant" panel intact.
//
// What it does in one run:
// 1) Scrubs <script>/<link> tags that load any *coach* assets from every .html
// 2) Stubs coach scripts on disk (coach.js / voice-coach*.js, etc.)
// 3) Injects a robust CSS+JS kill switch that removes any dynamic coach UI
//
// Usage (from project root):
//   node nuke-voice-coach.mjs

import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", ".git", "server", "public", "cloudflare"]);
const HTML_EXTS = new Set([".html", ".htm"]);
const JS_CANDIDATES = [
    // most common file names we’ve seen for the legacy coach
    "coach.js",
    "coach.mjs",
    "coach.min.js",
    "voice-coach.js",
    "voice-coach.min.js",
    "voicecoach.js",
    "voicecoach.min.js",
    "voice-coach-fix.js",
    "voicecoach-fix.js",
    // typical locations
    "js/coach.js",
    "js/voice-coach.js",
    "assets/js/coach.js",
    "assets/js/voice-coach.js",
    "assets/coach.js",
    "assets/voice-coach.js",
];

const STYLE_ID = "mshare-coach-killswitch-style";
const SCRIPT_ID = "mshare-coach-killswitch-script";

// Aggressive but safe: target legacy coach containers; do NOT match "Voice Assistant"
const KILL_CSS = `
/* injected by nuke-voice-coach.mjs */
#voice-coach,#mshare-voicecoach,.voice-coach,.voicecoach,#coach-panel,.coach-panel,
[id*="voice-coach" i],[class*="voice-coach" i],[id*="voicecoach" i],[class*="voicecoach" i],
[data-voicecoach],[data-voice-coach],[data-widget="voice-coach"],[data-role="voice-coach"],
[aria-label="Voice Coach"],section[aria-label="Voice Coach"],div[aria-label="Voice Coach"]{
  display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important;
}
`;

// JS kill switch that also heuristically removes the panel shown in your screenshot
const KILL_JS = `
/* injected by nuke-voice-coach.mjs */
(function(){
  try{
    // global flag other scripts can honor
    window.__MShareDisableVoiceCoach = true;

    // Provide a harmless stub for any code that expects MS.VoiceCoach
    const MS = (window.__MSHARE__ = window.__MSHARE__ || {});
    if(!MS.VoiceCoach){
      MS.VoiceCoach = { init(){}, show(){}, hide(){}, start(){}, pause(){}, resume(){}, stop(){} };
    }

    // Direct selector-based removal
    const SEL = [
      '#voice-coach','#mshare-voicecoach','.voice-coach','.voicecoach','#coach-panel','.coach-panel',
      '[id*="voice-coach" i]','[class*="voice-coach" i]','[id*="voicecoach" i]','[class*="voicecoach" i]',
      '[data-voicecoach]','[data-voice-coach]','[data-widget="voice-coach"]','[data-role="voice-coach"]',
      '[aria-label="Voice Coach"]','section[aria-label="Voice Coach"]','div[aria-label="Voice Coach"]'
    ].join(',');

    // Heuristic removal for the exact panel in the screenshot (does NOT match "Voice Assistant")
    function looksLikeLegacyCoach(el){
      if(!el || !(el instanceof HTMLElement)) return false;
      const t = (el.textContent || "").replace(/\\s+/g," ").trim();
      if (!t) return false;
      if (/\\bVoice Assistant\\b/i.test(t)) return false; // keep the new Assistant
      // The legacy panel typically contains these labels/buttons together:
      const hasControls = /\\bStart\\b/.test(t) && /\\bPause\\b/.test(t) && /\\bStop\\b/.test(t);
      const hasMeta = /\\bStatus\\b/.test(t) && /\\bVoice\\b/.test(t);
      const hasMove = /\\bMove\\b/.test(t);
      const hasDiagHide = /\\bDiag\\b/.test(t) || /\\bHide\\b/.test(t);
      const btnCount = el.querySelectorAll('button').length;
      const pos = getComputedStyle(el).position;
      const overlayish = pos === 'fixed' || pos === 'absolute';
      return (hasControls && hasMeta && (hasMove || hasDiagHide) && (btnCount >= 3)) || (overlayish && hasControls && hasMove);
    }

    function nukeOnce(){
      // direct selectors
      document.querySelectorAll(SEL).forEach(el => el.remove());
      // heuristic sweep
      const candidates = document.querySelectorAll('div,section,aside');
      for(const el of candidates){
        try{
          if (looksLikeLegacyCoach(el)) el.remove();
        }catch(_){}
      }
    }

    // run now and keep future DOM clean
    nukeOnce();
    const mo = new MutationObserver(nukeOnce);
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }catch(_){}
})();
`;

// Remove coach assets from HTML
const RE_SCRIPTS = [
    /<script\b[^>]*\bsrc=["'][^"'<>]*\bvoice[-_]?coach[^"'<>]*\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi,
    /<script\b[^>]*\bsrc=["'][^"'<>]*\bvoicecoach[^"'<>]*\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi,
    /<script\b[^>]*\bsrc=["'][^"'<>]*\bcoach(\.min)?\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi,
    /<script\b[^>]*>[^<]*(MS\.(?:VoiceCoach)|VoiceCoach|voice\s*[-_]?coach)[\s\S]*?<\/script>/gi, // inline starters
];
const RE_LINKS = [
    /<link\b[^>]*\bhref=["'][^"'<>]*\bvoice[-_]?coach[^"'<>]*\.css[^"'<>]*["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["'][^"'<>]*\bvoicecoach[^"'<>]*\.css[^"'<>]*["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["'][^"'<>]*\bcoach[^"'<>]*\.css[^"'<>]*["'][^>]*>/gi,
];

function injectBeforeClose(html, id, tag, block) {
    if (html.includes(`id="${id}"`)) return html;
    const re = new RegExp(`</${tag}\\s*>`, "i");
    if (!re.test(html)) return html + "\n" + block + "\n";
    return html.replace(re, `${block}\n</${tag}>`);
}

async function listHtmlFiles(dir) {
    const out = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const it of items) {
        if (IGNORE_DIRS.has(it.name)) continue;
        const full = path.join(dir, it.name);
        if (it.isDirectory()) out.push(...await listHtmlFiles(full));
        else if (it.isFile() && HTML_EXTS.has(path.extname(it.name).toLowerCase())) out.push(full);
    }
    return out;
}

async function backup(p) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.copyFile(p, `${p}.bak.${ts}`);
}

function transformHtml(src) {
    let out = src;
    let changed = false;

    for (const re of RE_SCRIPTS) {
        const prev = out; out = out.replace(re, "<!-- removed: voice-coach script -->");
        if (out !== prev) changed = true;
    }
    for (const re of RE_LINKS) {
        const prev = out; out = out.replace(re, "<!-- removed: voice-coach css -->");
        if (out !== prev) changed = true;
    }

    // Kill switch injects
    const styleTag = `<style id="${STYLE_ID}">${KILL_CSS}</style>`;
    const scriptTag = `<script id="${SCRIPT_ID}">${KILL_JS}</script>`;
    const prev1 = out; out = injectBeforeClose(out, STYLE_ID, "head", styleTag);
    const prev2 = out; out = injectBeforeClose(out, SCRIPT_ID, "body", scriptTag);
    if (out !== prev1 || out !== prev2) changed = true;

    return { out, changed };
}

async function stubCoachFiles() {
    let count = 0;
    const STUB = `/* stubbed by nuke-voice-coach.mjs */
(function(){try{
  window.__MShareDisableVoiceCoach = true;
  const MS=(window.__MSHARE__=window.__MSHARE__||{});
  MS.VoiceCoach=MS.VoiceCoach||{init(){},show(){},hide(){},start(){},pause(){},resume(){},stop(){}};
  console.info("Voice Coach disabled (stub active).");
}catch(_){}})();`;

    // include absolute candidates too
    const exts = new Set();
    for (const rel of JS_CANDIDATES) {
        exts.add(path.join(ROOT, rel));
        exts.add(path.join(ROOT, rel.replace(/\.js$/i, ".mjs")));
        exts.add(path.join(ROOT, rel.replace(/\.js$/i, ".min.js")));
    }

    for (const file of exts) {
        try {
            const stat = await fs.stat(file).catch(() => null);
            if (!stat || !stat.isFile()) continue;
            const txt = await fs.readFile(file, "utf8").catch(() => null);
            if (txt == null) continue;
            await backup(file);
            await fs.writeFile(file, STUB, "utf8");
            console.log("✔ Stubbed", path.relative(ROOT, file));
            count++;
        } catch (_) { }
    }
    return count;
}

async function run() {
    const htmlFiles = await listHtmlFiles(ROOT);
    let patched = 0;

    for (const f of htmlFiles) {
        const src = await fs.readFile(f, "utf8");
        const { out, changed } = transformHtml(src);
        if (changed) {
            await backup(f);
            await fs.writeFile(f, out, "utf8");
            console.log("✔ Patched", path.relative(ROOT, f));
            patched++;
        }
    }

    const stubbed = await stubCoachFiles();

    if (patched === 0 && stubbed === 0) {
        console.log("No changes needed (coach not found or already disabled).");
    } else {
        console.log(`\nDone. Patched ${patched} HTML file(s), stubbed ${stubbed} JS file(s).`);
        console.log("The legacy Voice Coach panel has been removed. Voice Assistant remains.");
    }
}

run().catch(e => { console.error(e); process.exit(1); });
