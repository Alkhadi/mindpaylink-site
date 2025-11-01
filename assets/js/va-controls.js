(() => {
  const va = document.getElementById('mshare-voicebot');
  if (!va) return;

  // Remove any inline pinning (e.g., style="inset: ...")
  try { va.style.inset = ''; } catch {}

  const body = va.querySelector('.mshare-voicebot__body') || va.querySelector('.mshare-voicebot__content') || va;
  const handle = va.querySelector('.mshare-voicebot__handle') || va;

  // Ensure Hide/Show toggle exists on the handle
  let toggleBtn = va.querySelector('[data-voice-action="toggle"]');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'mshare-voicebot__btn';
    toggleBtn.setAttribute('data-voice-action','toggle');
    toggleBtn.setAttribute('aria-controls','mshare-voicebot-panel');
    toggleBtn.textContent = 'Hide';
    handle.appendChild(toggleBtn);
  }

  // Create FAB (re-opener) — works if appended as a sibling or inside the section (CSS covers both)
  let fab = document.querySelector('.mshare-voicebot__fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'mshare-voicebot__fab';
    fab.textContent = 'Voice Assistant';
    // Prefer sibling after the section; fallback to inside
    if (va.parentElement) va.parentElement.appendChild(fab); else va.appendChild(fab);
  }

  const LSKEY = 'mshare_va_state_v2';
  function loadState(){
    try { return JSON.parse(localStorage.getItem(LSKEY) || '{}'); } catch { return {}; }
  }
  function saveState(st){ try { localStorage.setItem(LSKEY, JSON.stringify(st)); } catch {} }

  // Hidden state
  function setHidden(h){
    va.dataset.hidden = String(!!h);
    toggleBtn.textContent = h ? 'Show' : 'Hide';
    toggleBtn.setAttribute('aria-expanded', (!h).toString());
    const st = loadState(); st.hidden = !!h; saveState(st);
  }

  // Positioning (fixed, with viewport-aware clamping)
  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }
  function getVP(){
    const vp = window.visualViewport;
    return vp ? { w: vp.width, h: vp.height, ox: vp.offsetLeft, oy: vp.offsetTop } :
                { w: window.innerWidth, h: window.innerHeight, ox: 0, oy: 0 };
  }
  function panelSize(){
    const r = va.getBoundingClientRect();
    return { w: r.width || 320, h: r.height || 160 };
  }

  function applyPos(x, y){
    const { w, h, ox, oy } = getVP();
    const pad = 8;
    const sz = panelSize();
    const nx = clamp(x, ox + pad, ox + w - sz.w - pad);
    const ny = clamp(y, oy + pad, oy + h - sz.h - pad);
    va.style.left = nx + 'px';
    va.style.top  = ny + 'px';
  }

  // Restore last state/pos
  (function restore(){
    const st = loadState();
    if (typeof st.hidden === 'boolean') setHidden(st.hidden);
    const x = (typeof st.x === 'number') ? st.x : 16;
    const y = (typeof st.y === 'number') ? st.y : 16;
    applyPos(x, y);
  })();

  // Dragging on the handle
  let dragging = false, dx = 0, dy = 0;
  function startDrag(clientX, clientY){
    const r = va.getBoundingClientRect();
    dragging = true; dx = clientX - r.left; dy = clientY - r.top;
    handle.style.cursor = 'grabbing';
  }
  function moveDrag(clientX, clientY){
    if (!dragging) return;
    applyPos(clientX - dx, clientY - dy);
  }
  function endDrag(){
    if (!dragging) return;
    dragging = false; handle.style.cursor = 'grab';
    const r = va.getBoundingClientRect();
    const st = loadState(); st.x = r.left; st.y = r.top; saveState(st);
  }

  handle.addEventListener('pointerdown', e => { e.preventDefault(); handle.setPointerCapture(e.pointerId); startDrag(e.clientX, e.clientY); });
  handle.addEventListener('pointermove', e => moveDrag(e.clientX, e.clientY));
  handle.addEventListener('pointerup',   () => endDrag());
  handle.addEventListener('pointercancel', () => endDrag());

  // Keep clamped on viewport resize/zoom/scroll (no snap-to-top anymore)
  const reClamp = () => {
    const st = loadState();
    const x = (typeof st.x === 'number') ? st.x : 16;
    const y = (typeof st.y === 'number') ? st.y : 16;
    applyPos(x, y);
  };
  window.addEventListener('resize', reClamp);
  window.visualViewport?.addEventListener('resize', reClamp);
  window.visualViewport?.addEventListener('scroll', reClamp);

  // Toggle & reopen
  toggleBtn.addEventListener('click', () => setHidden(va.dataset.hidden !== 'true'));
  fab.addEventListener('click', () => setHidden(false));

  // Simple TTS controls (uses selected text or page title)
  const meta = va.querySelector('#mshare-voice-meta');
  function pickVoice(){
    const sel = document.getElementById('mshare-voice-voice');
    const all = speechSynthesis.getVoices();
    if (sel && sel.value) return all.find(v => v.name === sel.value) || null;
    return all.find(v => /en-GB/i.test(v.lang)) || all.find(v => /en-US/i.test(v.lang)) || all[0] || null;
  }
  function textToRead(){
    const sel = String(window.getSelection?.() || '').trim();
    if (sel) return sel;
    const m = document.querySelector('main'); if (m) return (m.innerText || m.textContent || '').slice(0, 5000);
    return (document.title || 'Welcome').trim();
  }
  function speak(){
    try {
      const t = textToRead();
      if (!t) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.voice = pickVoice();
      u.onstart = () => { if (meta) meta.textContent = 'Reading…'; };
      u.onend   = () => { if (meta) meta.textContent = 'Ready'; };
      speechSynthesis.speak(u);
    } catch {}
  }
  function pause(){ try { speechSynthesis.pause(); } catch {} }
  function resume(){ try { speechSynthesis.resume(); } catch {} }
  function stop(){ try { speechSynthesis.cancel(); if (meta) meta.textContent = 'Ready'; } catch {} }

  va.addEventListener('click', (e) => {
    const b = e.target.closest('[data-voice-action]');
    if (!b) return;
    const a = b.getAttribute('data-voice-action');
    if (a === 'toggle') setHidden(va.dataset.hidden !== 'true');
    if (a === 'start')  speak();
    if (a === 'pause')  pause();
    if (a === 'resume') resume();
    if (a === 'stop')   stop();
    if (a === 'repeat') speak();
  });

  // Auto-show & start if SOS buttons are tapped
  document.addEventListener('click', (e) => {
    const sos = e.target.closest('[data-sos-start],[data-action="sos-start"],#sos-start,#btn-sos-start');
    if (sos) { setHidden(false); speak(); }
  });

  // Ensure CSS linked if a page missed it
  if (!document.querySelector('link[href$="assets/css/va-controls.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'assets/css/va-controls.css';
    document.head.appendChild(link);
  }

  // voice list can load async on Chrome
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {};
  }
})();
