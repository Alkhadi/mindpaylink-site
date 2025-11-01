(() => {
  const va = document.querySelector('#mshare-voicebot');
  if (!va) return;

  // Ensure a consistent structure (handle + body)
  let body = va.querySelector('.mshare-voicebot__body');
  let handle = va.querySelector('.mshare-voicebot__handle');
  if (!body) {
    body = document.createElement('div');
    body.className = 'mshare-voicebot__body';
    while (va.firstChild) body.appendChild(va.firstChild);
    va.appendChild(body);
  }
  if (!handle) {
    handle = document.createElement('div');
    handle.className = 'mshare-voicebot__handle';
    handle.innerHTML = `
      <span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
      <h3 class="mshare-voicebot__title">Voice Assistant</h3>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="toggle" aria-expanded="true" aria-controls="mshare-voicebot-panel" title="Hide Voice Assistant">Hide</button>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="reset-pos" title="Reset position">Reset</button>
    `;
    va.prepend(handle);
  } else {
    // Make sure we have a toggle button in the handle
    if (!handle.querySelector('[data-voice-action="toggle"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mshare-voicebot__btn';
      btn.setAttribute('data-voice-action','toggle');
      btn.setAttribute('aria-expanded','true');
      btn.title = 'Hide Voice Assistant';
      btn.textContent = 'Hide';
      handle.appendChild(btn);
    }
    if (!handle.querySelector('[data-voice-action="reset-pos"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mshare-voicebot__btn';
      btn.setAttribute('data-voice-action','reset-pos');
      btn.title = 'Reset position';
      btn.textContent = 'Reset';
      handle.appendChild(btn);
    }
  }

  // Floating action button (always reliable even if DOM nesting changes)
  let fab = document.querySelector('.mshare-voicebot__fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.className = 'mshare-voicebot__fab';
    fab.type = 'button';
    fab.textContent = 'Voice';
    document.body.appendChild(fab);
  }

  const LS_HIDDEN = 'mshare_va_hidden';
  const LS_POS    = 'mshare_va_xy';

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function bounds(){
    const vw = window.innerWidth, vh = window.innerHeight;
    const r = va.getBoundingClientRect();
    return {
      minL: 8,
      maxL: vw - r.width - 8,
      minT: 8,
      maxT: vh - r.height - 8
    };
  }

  function saveXY(){
    const left = parseFloat(va.style.left || 16);
    const top  = parseFloat(va.style.top  || 16);
    localStorage.setItem(LS_POS, JSON.stringify({left, top}));
  }

  function restoreXY(){
    try{
      const p = JSON.parse(localStorage.getItem(LS_POS)||'{}');
      if (typeof p.left === 'number') va.style.left = `${p.left}px`;
      if (typeof p.top  === 'number') va.style.top  = `${p.top}px`;
    }catch{}
  }

  function setHidden(h){
    va.dataset.hidden = String(!!h);
    // Important: do not rely on CSS sibling selectors; toggle FAB here
    fab.style.display = h ? 'inline-flex' : 'none';
    // Maintain accessible name
    const tgl = va.querySelector('[data-voice-action="toggle"]');
    if (tgl){
      tgl.setAttribute('aria-expanded', h ? 'false' : 'true');
      tgl.textContent = h ? 'Show' : 'Hide';
      tgl.title = h ? 'Show Voice Assistant' : 'Hide Voice Assistant';
    }
    localStorage.setItem(LS_HIDDEN, h ? '1' : '0');
  }

  // Initial state
  const wasHidden = localStorage.getItem(LS_HIDDEN) === '1';
  setHidden(wasHidden);
  va.style.position = 'fixed';
  if (!va.style.left) va.style.left = '16px';
  if (!va.style.top)  va.style.top  = '16px';
  restoreXY();

  // Remove any inline "inset: ..." that pins it
  const sAttr = va.getAttribute('style') || '';
  if (/inset\s*:/.test(sAttr)) {
    va.setAttribute('style', sAttr.replace(/inset\s*:[^;"]+;?/g, '').trim());
    if (!va.style.position) va.style.position = 'fixed';
  }

  // Dragging (viewport-fixed)
  let dragging = false, startX=0, startY=0, baseL=0, baseT=0;
  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    const r = va.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    baseL = r.left; baseT = r.top;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    let L = baseL + dx, T = baseT + dy;
    const b = bounds();
    L = clamp(L, b.minL, b.maxL);
    T = clamp(T, b.minT, b.maxT);
    va.style.left = `${L}px`;
    va.style.top  = `${T}px`;
  }, {passive:true});
  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    handle.releasePointerCapture?.(e.pointerId);
    document.body.style.userSelect = '';
    saveXY();
  });
  window.addEventListener('scroll', () => {
    // Keep it in-viewport if user scrolls a lot
    const b = bounds();
    const L = clamp(parseFloat(va.style.left||16), b.minL, b.maxL);
    const T = clamp(parseFloat(va.style.top ||16), b.minT, b.maxT);
    va.style.left = `${L}px`;
    va.style.top  = `${T}px`;
  }, {passive:true});

  // Wiring
  va.addEventListener('click', (e) => {
    const b = e.target.closest('.mshare-voicebot__btn'); if (!b) return;
    const act = b.getAttribute('data-voice-action');
    if (act === 'toggle')   setHidden(va.dataset.hidden !== 'true' ? true : false);
    if (act === 'reset-pos'){ va.style.left='16px'; va.style.top='16px'; saveXY(); }
    if (act === 'start')    speak();
    if (act === 'pause')    pause();
    if (act === 'resume')   resume();
    if (act === 'stop')     stop();
    if (act === 'repeat')   speak();
  });

  fab.addEventListener('click', () => setHidden(false));

  // Basic narration (non-robotic fallback via SpeechSynthesis)
  const meta = va.querySelector('#mshare-voice-meta');
  function speak() {
    try {
      const txt = document.querySelector('[data-voice-text]')?.textContent
        || document.querySelector('main,h1,h2,p,article,section')?.textContent?.trim()
        || 'Voice assistant ready.';
      const u = new SpeechSynthesisUtterance(txt.replace(/[^\p{L}\p{N}\s.,;:'"-]/gu, ''));
      const vs = speechSynthesis.getVoices();
      u.voice = vs.find(v=>/en-GB/i.test(v.lang)) || vs.find(v=>/en-US/i.test(v.lang)) || vs[0] || null;
      u.onstart = ()=> meta && (meta.textContent='Reading…');
      u.onend   = ()=> meta && (meta.textContent='Ready');
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  }
  function pause(){ try{ speechSynthesis.pause(); }catch{} }
  function resume(){ try{ speechSynthesis.resume(); }catch{} }
  function stop(){ try{ speechSynthesis.cancel(); meta && (meta.textContent='Ready'); }catch{} }

  // Auto-show + start if SOS button is tapped
  document.addEventListener('click', (e) => {
    const sos = e.target.closest('[data-sos-start],[data-action="sos-start"],#sos-start,#btn-sos-start');
    if (sos) { setHidden(false); speak(); }
  });

  // Ensure CSS is linked even if page missed it
  if (!document.querySelector('link[href$="assets/css/va-controls.css"]')){
    const link=document.createElement('link'); link.rel='stylesheet'; link.href='assets/css/va-controls.css';
    document.head.appendChild(link);
  }
})();
