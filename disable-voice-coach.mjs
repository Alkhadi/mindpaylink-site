// disable-voice-coach.mjs
// One-shot patch: stop the "voice coach" panel from displaying on ALL pages,
// while leaving the voice assistant (voicebot) intact.

import { promises as fs } from "fs";
import path from "path";
import url from "url";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", ".git", "server", "public"]);
const HTML_EXT = new Set([".html", ".htm"]);

// Patterns to strip <script>/<link> tags that load Voice Coach assets.
// NOTE: We deliberately avoid 'voicebot' so the narration assistant stays.
const SCRIPT_SRC_REMOVE = [
    /<script\b[^>]*\bsrc=["'][^"'<>]*voice[-_]?coach[^"'<>]*\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi,
    /<script\b[^>]*\bsrc=["'][^"'<>]*\/coach\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi, // common root file name
];
const LINK_HREF_REMOVE = [
    /<link\b[^>]*\bhref=["'][^"'<>]*voice[-_]?coach[^"'<>]*\.css[^"'<>]*["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["'][^"'<>]*voice[-_]?coach[^"'<>]*\.min\.css[^"'<>]*["'][^>]*>/gi];

// Inline script blocks that *init* the voice coach (catch both camel & kebab)
const INLINE_INIT_BLOCK = /<script\b[^>]*>([\s\S]*?)(?:voice[\s_-]?coach|VoiceCoach|MS\.VoiceCoach|mshare[-_]?voicecoach|window\.VoiceCoach)([\s\S]*?)<\/script>/gi;

// Hard hide selectors (belt & suspenders)
const KILL_STYLE_ID = "mshare-voicecoach-hide";
const KILL_STYLE = `
/* injected by disable-voice-coach.mjs */
#voice-coach, #mshare-voicecoach, .voice-coach, .voicecoach,
[data-voicecoach], [data-voice-coach], [data-widget="voice-coach"], [data-role="voice-coach"] {
  display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;
}
`;

// Runtime remover for anything created dynamically after load.
const KILL_SCRIPT_ID = "mshare-voicecoach-kill";
const KILL_SCRIPT = `
/* injected by disable-voice-coach.mjs */
(function () {
  try {
    window.__MShareDisableVoiceCoach = true;
    const SELECTORS = '#voice-coach, #mshare-voicecoach, .voice-coach, .voicecoach, [data-voicecoach], [data-voice-coach], [data-widget="voice-coach"], [data-role="voice-coach"]';
    const nuke = () => document.querySelectorAll(SELECTORS).forEach(el => el.remove());
    nuke();
    const mo = new MutationObserver(() => nuke());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
`;

// Walk the repo for HTML files
async function walk(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        if (IGNORE_DIRS.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            out.push(...(await walk(full)));
        } else if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            if (HTML_EXT.has(ext)) out.push(full);
        }
    }
    return out;
}

function insertBeforeCloseTag(html, id, tagName, block) {
    if (html.includes(`id="${id}"`)) return html; // already injected
    const re = new RegExp(`</${tagName}\\s*>`, "i");
    if (re.test(html)) {
        return html.replace(re, `${block}\n</${tagName}>`);
    }
    // Fallback: append at end
    return html + `\n${block}\n`;
}

function transformHtml(html) {
    let changed = false;
    let out = html;

    // Remove voice-coach <script src=...>
    for (const re of SCRIPT_SRC_REMOVE) {
        const prev = out;
        out = out.replace(re, (m) => {
            changed = true;
            return `<!-- voice-coach script stripped: ${m.replace(/--/g, "—")} -->`;
        });
        if (prev !== out) changed = true;
    }

    // Remove voice-coach <link href=...>
    for (const re of LINK_HREF_REMOVE) {
        const prev = out;
        out = out.replace(re, (m) => {
            changed = true;
            return `<!-- voice-coach css stripped: ${m.replace(/--/g, "—")} -->`;
        });
        if (prev !== out) changed = true;
    }

    // Disable inline initializers
    out = out.replace(INLINE_INIT_BLOCK, (_m, a, b) => {
        changed = true;
        const safe = (a + b).replace(/<\/script>/gi, "<\\/script>");
        return `<!-- voice-coach inline init stripped -->
<script>/* disabled voice-coach init */ void 0;</script>`;
    });

    // Inject kill CSS
    if (!out.includes(`id="${KILL_STYLE_ID}"`)) {
        const styleBlock = `<style id="${KILL_STYLE_ID}">${KILL_STYLE}</style>`;
        const prev = out;
        out = insertBeforeCloseTag(out, KILL_STYLE_ID, "head", styleBlock);
        if (prev !== out) changed = true;
    }

    // Inject kill runtime script (handles dynamically-created panels)
    if (!out.includes(`id="${KILL_SCRIPT_ID}"`)) {
        const scriptBlock = `<script id="${KILL_SCRIPT_ID}">${KILL_SCRIPT}</script>`;
        const prev = out;
        out = insertBeforeCloseTag(out, KILL_SCRIPT_ID, "body", scriptBlock);
        if (prev !== out) changed = true;
    }

    return { out, changed };
}

async function backupFile(file) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = `${file}.bak.${stamp}`;
    await fs.copyFile(file, bak);
    return bak;
}

async function run() {
    const files = await walk(ROOT);
    let touched = 0;

    for (const file of files) {
        const src = await fs.readFile(file, "utf8");
        const { out, changed } = transformHtml(src);
        if (changed) {
            await backupFile(file);
            await fs.writeFile(file, out, "utf8");
            touched++;
            console.log(`✔ Patched: ${path.relative(ROOT, file)}`);
        }
    }

    if (touched === 0) {
        console.log("No changes needed. (Voice-coach includes not found or already disabled.)");
    } else {
        console.log(`\nDone. Patched ${touched} file(s). Voice coach is now disabled site-wide.`);
    }
}

run().catch((err) => {
    console.error("Failed to disable voice coach:", err);
    process.exit(1);
});
