const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const CSS_MARK = '<!-- __VA_PATCH_CSS_v2__ -->';
const JS_MARK  = '<!-- __VA_PATCH_JS_v2__ -->';

const cssBlock = `${CSS_MARK}
<style>
/* Voice Assistant minimal, mobile-safe add-ons */
#mshare-voicebot.mshare-voicebot{
  position: fixed; top: 24px; left: 16px; right:auto; bottom:auto;
  max-width: min(96vw, 420px); z-index: 9999;
  background:#0f172a; color:#e2e8f0; border:1px solid rgba(148,163,184,.25);
  border-radius:12px; box-shadow:0 12px 24px rgba(0,0,0,.35);
}
.mshare-voicebot__handle{ display:flex; align-items:center; gap:8px; padding:8px 10px; cursor:grab; user-select:none; }
.mshare-voicebot__handle:active{ cursor:grabbing; }
.mshare-voicebot__title{ margin:0; font-size:14px; font-weight:600; }
.mshare-voicebot__btn{ border:0; padding:6px 10px; border-radius:8px; background:#334155; color:#fff; cursor:pointer; }
.mshare-voicebot__btn:focus-visible{ outline:2px solid #38bdf8; outline-offset:2px; }
.mshare-voicebot__content{ padding:8px 10px; display:block; }
.mshare-voicebot__row{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
.mshare-voicebot__field{ min-width:0; flex:1 1 auto; }
.mshare-voicebot__cmd,.mshare-voicebot__select,.mshare-voicebot__range{ width:100%; }
.mshare-voicebot__meta{ font-size:12px; opacity:.9; padding:0 10px 10px; }

.mshare-voicebot__handle .dot{ width:4px; height:4px; border-radius:50%; background:#94a3b8; display:inline-block; margin-right:2px; }

.mshare-voicebot__body{ display:block; }
#mshare-voicebot[data-hidden="true"] .mshare-voicebot__body{ display:none; }

.mshare-voicebot__fab{
  position:fixed; right:16px; bottom:16px; display:none; padding:10px 12px;
  border-radius:999px; border:0; background:#334155; color:#fff;
  box-shadow:0 6px 16px rgba(0,0,0,.25); cursor:pointer; z-index:10000;
}
.mshare-voicebot__fab:focus-visible{ outline:2px solid #38bdf8; outline-offset:2px; }
#mshare-voicebot[data-hidden="true"] ~ .mshare-voicebot__fab{ display:inline-flex; }

@media (max-width:600px){
  #mshare-voicebot.mshare-voicebot{ left:8px; max-width:min(96vw,420px); }
  .mshare-voicebot__title{ font-size:13px; }
  .mshare-voicebot__btn{ font-size:12px; padding:6px 8px; }
}
</style>
${CSS_MARK.replace('--','/')}
`;

const jsBlock = `${JS_MARK}
<script>
(() => {
  const root = document.getElementById('mshare-voicebot');
  if (!root) return;

  // ==== state & helpers ====
  const KEY = 'mshare_va_pos_v2';
  const meta = document.getElementById('mshare-voice-meta');
  const body = document.getElementById('mshare-voicebot-panel') ||
               (function ensureBodyWrap() { return null; })();

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function setHidden(v){
    root.setAttribute('data-hidden', String(v));
    const tgl = root.querySelector('[data-voice-action="toggle"]');
    if (tgl) {
      tgl.setAttribute('aria-expanded', v ? 'false' : 'true');
      tgl.textContent = v ? 'Show' : 'Hide';
      tgl.title = v ? 'Show Voice Assistant' : 'Hide Voice Assistant';
    }
  }

  // ==== Hide/Show ====
  const toggleBtn = root.querySelector('[data-voice-action="toggle"]');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const hidden = root.getAttribute('data-hidden') === 'true';
      setHidden(!hidden);
    });
  }

  // ==== Reset position ====
  const resetBtn = root.querySelector('[data-voice-action="reset-pos"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      try { localStorage.removeItem(KEY); } catch {}
      root.style.top = '24px';
      root.style.left = '16px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    });
  }

  // ==== Drag (pointer events) with persistence ====
  const handle = root.querySelector('.mshare-voicebot__handle');
  if (handle) {
    let dragging = false, startX=0, startY=0, startTop=0, startLeft=0;

    function loadPos(){
      try {
        const p = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (p && Number.isFinite(p.top) && Number.isFinite(p.left)) {
          root.style.top = p.top + 'px';
          root.style.left = p.left + 'px';
          root.style.right = 'auto';
          root.style.bottom = 'auto';
        }
      } catch {}
    }
    function savePos(){
      const rect = root.getBoundingClientRect();
      try { localStorage.setItem(KEY, JSON.stringify({ top: rect.top + window.scrollY, left: rect.left + window.scrollX })); } catch {}
    }
    loadPos();

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startTop = rect.top + window.scrollY;
      startLeft = rect.left + window.scrollX;
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const top = startTop + dy;
      const left = startLeft + dx;

      const vw = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      const r  = root.getBoundingClientRect();
      const maxLeft = vw - r.width - 8 + window.scrollX;
      const maxTop  = (window.scrollY + vh) - r.height - 8;

      root.style.top  = clamp(top, 8, maxTop) + 'px';
      root.style.left = clamp(left, 8, maxLeft) + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    });

    window.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch {}
      savePos();
    });

    // On viewport changes (scroll/resize), keep position in-bounds
    ['resize','orientationchange','scroll'].forEach(ev => {
      window.addEventListener(ev, () => {
        const rect = root.getBoundingClientRect();
        const vw = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const maxLeft = vw - rect.width - 8 + window.scrollX;
        const maxTop  = (window.scrollY + vh) - rect.height - 8;
        const top  = rect.top + window.scrollY;
        const left = rect.left + window.scrollX;
        root.style.top  = clamp(top, 8, maxTop) + 'px';
        root.style.left = clamp(left, 8, maxLeft) + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
      }, { passive: true });
    });
  }

  // ==== Minimal speech controls (uses system voices) ====
  function cleanText(txt){ try { return txt.replace(/[^\\p{L}\\p{N}\\s.,;:'"!?\\-]/gu,'').replace(/\\s+/g,' ').trim(); }catch{ return txt; } }
  function speak(){
    try {
      const input = document.getElementById('mshare-voice-cmd');
      const txt = cleanText(input && input.value ? input.value : document.title || 'Welcome to MindPayLink.');
      const u = new SpeechSynthesisUtterance(txt);
      const vs = speechSynthesis.getVoices();
      u.voice = vs.find(v=>/en-GB/i.test(v.lang)) || vs.find(v=>/en-US/i.test(v.lang)) || vs[0] || null;
      u.rate  = Number(document.getElementById('mshare-voice-rate')?.value || 1);
      u.pitch = Number(document.getElementById('mshare-voice-pitch')?.value || 1);
      u.onstart = () => { const m = document.getElementById('mshare-voice-meta'); if (m) m.textContent = 'Reading…'; };
      u.onend   = () => { const m = document.getElementById('mshare-voice-meta'); if (m) m.textContent = 'Ready'; };
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  }
  function pause(){ try { speechSynthesis.pause(); } catch{} }
  function resume(){ try { speechSynthesis.resume(); } catch{} }
  function stop(){ try { speechSynthesis.cancel(); const m=document.getElementById('mshare-voice-meta'); if (m) m.textContent='Ready'; } catch{} }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-voice-action]');
    if (!btn) return;
    const act = btn.getAttribute('data-voice-action');
    if (act === 'start')  speak();
    if (act === 'pause')  pause();
    if (act === 'resume') resume();
    if (act === 'stop')   stop();
    if (act === 'repeat') speak();
  }, { passive:true });

  // Auto-show & start on SOS buttons
  document.addEventListener('click', (e) => {
    const sos = e.target.closest('[data-sos-start],[data-action="sos-start"],#sos-start,#btn-sos-start');
    if (sos) { setHidden(false); speak(); }
  }, { passive:true });

  // Defensive: CSS will be inlined by patcher.
})();
</script>
${JS_MARK.replace('--','/')}
`;

// Edit the VA section inside one <section id="mshare-voicebot">...</section>
function patchVAInHtml(s) {
  const secRE = /<section\b[^>]*id=["']mshare-voicebot["'][^>]*>[\s\S]*?<\/section>/i;
  const m = s.match(secRE);
  if (!m) return { s, touched:false };

  let block = m[0];
  let touched = false;

  // Remove inline style="...inset: ...;"
  block = block.replace(
    /(<section\b[^>]*id=["']mshare-voicebot["'][^>]*?)\sstyle=["'][^"']*inset\s*:[^"']*?["']([^>]*>)/i,
    (m, p1, p2) => { touched = true; return p1 + p2; }
  );

  // Ensure data-hidden="false" on the root
  block = block.replace(/(<section\b[^>]*id=["']mshare-voicebot["'][^>]*)(?=>)/i,
    (m, p1) => {
      if (/data-hidden=/i.test(m)) return m;
      touched = true; return p1 + ' data-hidden="false"';
    }
  );

  // Ensure toggle button in handle
  if (!/data-voice-action=["']toggle["']/.test(block)) {
    const toggleBtnHtml = '<button type="button" class="mshare-voicebot__btn" data-voice-action="toggle" aria-controls="mshare-voicebot-panel" aria-expanded="true" title="Hide Voice Assistant">Hide</button>\n';
    const beforeResetPattern = /(<div[^>]*class=["'][^"']*mshare-voicebot__handle[^"']*["'][^>]*>[\s\S]*?<h3[^>]*>[^<]*<\/h3>\s*)(<button[^>]*data-voice-action=["']reset-pos["'][^>]*>)/i;

    if (beforeResetPattern.test(block)) {
      block = block.replace(beforeResetPattern, (m, p1, p2) => { touched = true; return p1 + toggleBtnHtml + p2; });
    } else {
      // Fallback: append toggle at end of handle block
      block = block.replace(
        /(<div[^>]*class=["'][^"']*mshare-voicebot__handle[^"']*["'][^>]*>[\s\S]*?)(<\/div>)/i,
        (m, p1, p2) => { touched = true; return p1 + toggleBtnHtml + p2; }
      );
    }
  }

  // Ensure body wrapper around first content
  if (!/mshare-voicebot__body/.test(block)) {
    block = block.replace(/<div\s+class=["']mshare-voicebot__content["']>/i,
      (m) => { touched = true; return '<div class="mshare-voicebot__body" id="mshare-voicebot-panel">\n  ' + m; });
    // close wrapper before </section>
    block = block.replace(/\s*<\/section>\s*$/i, '\n</div>\n</section>');
  }

  // Ensure floating FAB after the section. Make sure to apply modified block, not original.
  if (!/mshare-voicebot__fab/.test(s)) {
    const fab = '\n<button type="button" class="mshare-voicebot__fab" data-voice-action="toggle" aria-controls="mshare-voicebot-panel" aria-expanded="false" title="Show Voice Assistant">Show Voice</button>\n';
    s = s.replace(secRE, () => block + fab);
    touched = true;
  } else {
    s = s.replace(secRE, block);
  }

  return { s, touched: touched || (block !== m[0]) };
}

const IGNORE_DIRS = new Set(['.git','node_modules','dist','build','.next','out','vendor']);
function listHtmlFiles(dir = '.') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) out.push(...listHtmlFiles(p));
    } else if (entry.isFile() && p.toLowerCase().endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

const pages = listHtmlFiles('.');
let changedFiles = 0;

for (const f of pages) {
  let s = fs.readFileSync(f, 'utf8');

  // Skip if file doesn't contain VA
  if (!/id=["']mshare-voicebot["']/.test(s)) continue;

  const before = s;

  // Inject CSS (once per file)
  if (!s.includes(CSS_MARK)) {
    s = s.replace(/<\/head>/i, cssBlock + '\n</head>');
  }

  // Patch the VA block
  const res = patchVAInHtml(s);
  s = res.s;

  // Inject JS (once per file)
  if (!s.includes(JS_MARK)) {
    s = s.replace(/<\/body>/i, jsBlock + '\n</body>');
  }

  if (s !== before) {
    fs.writeFileSync(f, s);
    changedFiles++;
  }
}

console.log('VA patched files:', changedFiles);

// Commit & push (best-effort) — kept local-only by default; comment out if you don’t want auto-add/commit.
try {
  cp.execSync('git add -A', { stdio:'inherit' });
  cp.execSync('git commit -m "fix(va): add Hide/Show + floating FAB; free drag with persistence; strip inline inset; idempotent patch" || true', { stdio:'inherit', shell:'/bin/bash' });

  // Push LIVE mirror if remote "live" exists, else push origin (commented to avoid auto-pushing to main)
  // const remotes = cp.execSync('git remote -v', { encoding:'utf8' });
  // if (/^live\\s+/m.test(remotes)) {
  //   cp.execSync('git push live HEAD:va-fix-v2', { stdio:'inherit' });
  // } else {
  //   cp.execSync('git push origin HEAD:va-fix-v2 || git push', { stdio:'inherit', shell:'/bin/bash' });
  // }
} catch (e) {
  console.log('Git commit/push skipped or failed (you can push manually).', e.message);
}

console.log('\\nPatch complete. Review diffs, then push your branch and open a PR.');
