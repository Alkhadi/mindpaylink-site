(() => {
  const SEL = '#mshare-voicebot';
  const el = document.querySelector(SEL);
  if (!el) return;

  // Remove any old inline "inset: ..." which causes jump-to-top on layout/scroll
  (function stripInset() {
    const s = el.getAttribute('style') || '';
    if (/inset\s*:/i.test(s)) {
      const clean = s.replace(/inset\s*:[^;]+;?/ig, '')
                     .replace(/\s{2,}/g,' ').trim();
      if (clean) el.setAttribute('style', clean); else el.removeAttribute('style');
    }
  })();

  // Ensure structural hooks
  let body = el.querySelector('.mshare-voicebot__body');
  if (!body) {
    body = document.createElement('div');
    body.className = 'mshare-voicebot__body';
    body.innerHTML = el.innerHTML;
    el.innerHTML = '';
    el.appendChild(body);
  }

  let handle = el.querySelector('.mshare-voicebot__handle');
  if (!handle) {
    handle = document.createElement('div');
    handle.className = 'mshare-voicebot__handle';
    handle.innerHTML = `
      <span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
      <h3 class="mshare-voicebot__title">Voice Assistant</h3>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="toggle" aria-expanded="true" aria-controls="mshare-voicebot-panel" title="Hide Voice Assistant">Hide</button>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="reset-pos" title="Reset position">Reset</button>
    `;
    body.prepend(handle);
  } else {
    // Add missing Hide button if not present
    if (!handle.querySelector('[data-voice-action="toggle"]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mshare-voicebot__btn';
      b.setAttribute('data-voice-action','toggle');
      b.setAttribute('aria-expanded','true');
      b.setAttribute('aria-controls','mshare-voicebot-panel');
      b.title = 'Hide Voice Assistant';
      b.textContent = 'Hide';
      handle.appendChild(b);
    }
    // Ensure Reset exists
    if (!handle.querySelector('[data-voice-action="reset-pos"]')) {
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'mshare-voicebot__btn';
      r.setAttribute('data-voice-action','reset-pos');
      r.title = 'Reset position';
      r.textContent = 'Reset';
      handle.appendChild(r);
    }
  }

  // Add Show FAB (appears only when hidden)
  if (!el.querySelector('.mshare-voicebot__fab')) {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'mshare-voicebot__fab';
    fab.textContent = 'Voice Assistant';
    fab.addEventListener('click', () => setHidden(false));
    el.appendChild(fab);
  }

  // Positioning helpers
  const margin = 8; // keep a bit of space from edges

  function getPos() {
    const cs = window.getComputedStyle(el);
    const top  = parseFloat(cs.top)  || 72;
    const left = parseFloat(cs.left) || 16;
    return { top, left };
  }
  function clamp(x, min, max){ return Math.max(min, Math.min(x, max)); }
  function applyPos(left, top, save=true){
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const maxLeft = Math.max(margin, vw - rect.width  - margin);
    const maxTop  = Math.max(margin, vh - rect.height - margin);
    left = clamp(left, margin, maxLeft);
    top  = clamp(top,  margin, maxTop);
    el.style.position = 'fixed';
    el.style.left = left + 'px';
    el.style.top =  top  + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
    if (save) localStorage.setItem('mshare_va_pos', JSON.stringify({left, top}));
  }
  function restorePos(){
    try{
      const raw = localStorage.getItem('mshare_va_pos');
      if (!raw) return applyPos(16, 72, false);
      const {left, top} = JSON.parse(raw);
      applyPos(left, top, false);
    } catch { applyPos(16, 72, false); }
  }

  // Hide/show
  function setHidden(h){
    el.dataset.hidden = h ? 'true' : 'false';
    const tgl = el.querySelector('[data-voice-action="toggle"]');
    if (tgl){
      tgl.setAttribute('aria-expanded', h ? 'false' : 'true');
      tgl.textContent = h ? 'Show' : 'Hide';
      tgl.title = h ? 'Show Voice Assistant' : 'Hide Voice Assistant';
    }
  }

  // Dragging logic (pointer events, works on touch + mouse)
  let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  handle.addEventListener('pointerdown', (ev) => {
    dragging = true;
    handle.setPointerCapture(ev.pointerId);
    const pos = getPos();
    origLeft = pos.left; origTop = pos.top;
    startX = ev.clientX; startY = ev.clientY;
    handle.style.cursor = 'grabbing';
    ev.preventDefault();
  });
  handle.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    applyPos(origLeft + dx, origTop + dy, false);
  });
  const endDrag = (ev) => {
    if (!dragging) return;
    dragging = false;
    handle.style.cursor = 'grab';
    const pos = getPos();
    applyPos(pos.left, pos.top, true); // re-clamp + save
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', () => {
    // keep current pos within new viewport; don't snap to top
    const pos = getPos();
    applyPos(pos.left, pos.top, true);
  });

  // Wire header buttons
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-voice-action]');
    if (!b) return;
    const act = b.getAttribute('data-voice-action');
    if (act === 'toggle') return setHidden(el.dataset.hidden !== 'true');
    if (act === 'reset-pos') return applyPos(16, 72, true);
  });

  // Ensure default visible & restored position
  if (!el.hasAttribute('data-hidden')) el.dataset.hidden = 'false';
  restorePos();

  // Basic smart speech hooks (keep your existing reading flow; this just avoids symbols)
  const ss = window.speechSynthesis;
  let utter = null;
  function cleanText(t){
    // Remove non-speech junk while keeping punctuation that helps prosody
    return String(t).replace(/[^\p{L}\p{N}\p{Z}\.\,\;\:\!\?\'\"\-\(\)]/gu, ' ')
                    .replace(/\s{2,}/g,' ')
                    .trim();
  }
  function pickVoice(prefer){
    const voices = ss.getVoices();
    if (prefer){
      const v = voices.find(v => v.name === prefer);
      if (v) return v;
    }
    // Prefer UK female if available, else any en-*
    return voices.find(v => /en-GB/i.test(v.lang) && /female/i.test(v.name))
        || voices.find(v => /en-GB/i.test(v.lang))
        || voices.find(v => /en/i.test(v.lang))
        || voices[0] || null;
  }
  function speak(text, opts = {}){
    stop();
    const t = cleanText(text || document.querySelector('main')?.innerText || document.body.innerText || '');
    if (!t) return;
    utter = new SpeechSynthesisUtterance(t);
    const prefer = (document.getElementById('mshare-voice-voice')?.value || '').trim();
    utter.voice = pickVoice(prefer);
    utter.rate  = parseFloat(document.getElementById('mshare-voice-rate')?.value || '1.0');
    utter.pitch = parseFloat(document.getElementById('mshare-voice-pitch')?.value || '1.0');
    ss.cancel(); ss.speak(utter);
    setHidden(false);
    el.querySelector('.mshare-voicebot__meta')?.replaceChildren(document.createTextNode('Reading…'));
    utter.onend = () => el.querySelector('.mshare-voicebot__meta')?.replaceChildren(document.createTextNode('Ready'));
  }
  function pause(){ if (ss.speaking && !ss.paused) ss.pause(); }
  function resume(){ if (ss.paused) ss.resume(); }
  function stop(){ ss.cancel(); utter = null; }

  // Bind existing VA buttons in the panel
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.mshare-voicebot__btn');
    if (!b) return;
    const act = b.getAttribute('data-voice-action');
    if (act === 'start')  speak();
    if (act === 'pause')  pause();
    if (act === 'resume') resume();
    if (act === 'stop')   stop();
    if (act === 'repeat') speak();
  });

  // If your page has SOS buttons, auto-show VA on start
  document.addEventListener('click', (e) => {
    const sos = e.target.closest('[data-sos-start],[data-action="sos-start"],#sos-start,#btn-sos-start');
    if (sos) { setHidden(false); speak(); }
  });

  // In case voices load asynchronously on some browsers
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {};
  }
})();
