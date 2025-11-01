(function(){
  const LS_POS = 'mshare_va_xy';
  const LS_HID = 'mshare_va_hidden';

  const va = document.getElementById('mshare-voicebot');
  if (!va) return;

  // 1) Ensure structure & controls exist
  let handle = va.querySelector('.mshare-voicebot__handle');
  let body   = va.querySelector('.mshare-voicebot__body') || va.querySelector('.mshare-voicebot__content') || va;
  if (!handle) {
    // If a custom HTML variant exists, don’t create a new panel — just bail.
    return;
  }

  // Add Hide/Show + keep Reset
  if (!handle.querySelector('[data-voice-action="toggle"]')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'mshare-voicebot__btn';
    toggleBtn.dataset.voiceAction = 'toggle';
    toggleBtn.setAttribute('aria-controls', 'mshare-voicebot-panel');
    toggleBtn.textContent = 'Hide';
    handle.appendChild(toggleBtn);
  }

  // If body wrapper missing id, set it for a11y
  if (!body.id) body.id = 'mshare-voicebot-panel';

  // Floating Show button (only visible when hidden)
  let fab = document.querySelector('.mshare-voicebot__fab');
  if (!fab){
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'mshare-voicebot__fab';
    fab.textContent = 'Show Voice Assistant';
    document.body.appendChild(fab);
  }

  // 2) Show/Hide state + persistence
  function setHidden(h){
    va.setAttribute('data-hidden', String(!!h));
    localStorage.setItem(LS_HID, String(!!h));
    fab.style.display = h ? 'inline-flex' : 'none';
    // Update toggle label
    const t = handle.querySelector('[data-voice-action="toggle"]');
    if (t){ t.textContent = h ? 'Show' : 'Hide'; t.setAttribute('aria-expanded', String(!h)); }
  }

  // Restore hidden state
  setHidden(localStorage.getItem(LS_HID) === 'true');

  // 3) Drag anywhere (no snap), clamp to viewport, persist position
  let dragging = false, startX=0, startY=0, baseL=0, baseT=0;

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function restoreXY(){
    try{
      const saved = JSON.parse(localStorage.getItem(LS_POS) || 'null');
      if (saved && typeof saved.left === 'number' && typeof saved.top === 'number'){
        va.style.left = saved.left + 'px';
        va.style.top  = saved.top  + 'px';
      }
    }catch{}
  }
  restoreXY();

  function saveXY(){
    const left = parseFloat(va.style.left || '16') || 16;
    const top  = parseFloat(va.style.top  || '16') || 16;
    localStorage.setItem(LS_POS, JSON.stringify({left, top}));
  }

  function bounds(){
    const r = va.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    return {
      minL: 8,
      maxL: vw - r.width - 8,
      minT: 8,
      maxT: vh - r.height - 8
    };
  }

  function onPointerDown(e){
    const tgt = e.target.closest('.mshare-voicebot__handle');
    if (!tgt) return;
    dragging = true;
    const r = va.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    baseL = r.left; baseT = r.top;
    va.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e){
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const b = bounds();
    const newL = clamp(baseL + dx, b.minL, b.maxL);
    const newT = clamp(baseT + dy, b.minT, b.maxT);
    va.style.left = newL + 'px';
    va.style.top  = newT + 'px';
  }
  function onPointerUp(e){
    if (!dragging) return;
    dragging = false;
    saveXY();
  }

  va.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, {passive:false});
  window.addEventListener('pointerup', onPointerUp, {passive:true});
  window.addEventListener('resize', () => { // keep inside viewport after rotate/resize
    const b = bounds();
    const L = clamp(parseFloat(va.style.left||'16')||16, b.minL, b.maxL);
    const T = clamp(parseFloat(va.style.top ||'16')||16, b.minT, b.maxT);
    va.style.left = L+'px'; va.style.top = T+'px'; saveXY();
  });

  // 4) Wire buttons (Start/Pause/Resume/Stop/Repeat + Toggle + Reset)
  const btnArea = va; // whole section (delegation)
  const voiceSel = document.getElementById('mshare-voice-voice');
  const rateInp  = document.getElementById('mshare-voice-rate');
  const pitchInp = document.getElementById('mshare-voice-pitch');
  const meta     = document.getElementById('mshare-voice-meta');

  function cleanText(s){
    // reduce non-letter noise, keep basic punctuation; collapse whitespace
    return (s||'')
      .replace(/[^\p{L}\p{N}\p{Pc}\p{Pd}\p{Ps}\p{Pe}\p{Pi}\p{Pf}\p{Po}\s]/gu,' ')
      .replace(/\s{2,}/g,' ')
      .trim();
  }
  function chosenVoice(){
    const wanted = (voiceSel && voiceSel.value) || '';
    const voices = (typeof speechSynthesis !== 'undefined') ? speechSynthesis.getVoices() : [];
    if (wanted){
      const m = voices.find(v => v.name === wanted) || voices.find(v => v.lang && wanted.toLowerCase().includes(v.lang.toLowerCase()));
      if (m) return m;
    }
    // Prefer en-GB > en-US > any English > first
    return voices.find(v => /en-GB/i.test(v.lang)) ||
           voices.find(v => /en-US/i.test(v.lang)) ||
           voices.find(v => /^en/i.test(v.lang))   ||
           voices[0] || null;
  }

  function selectionOrMain(){
    const sel = String(window.getSelection?.().toString() || '');
    if (sel.trim()) return sel;
    const main = document.querySelector('main, .content, .page, [role="main"]');
    if (main && main.innerText) return main.innerText;
    return document.body.innerText || document.title || 'Voice Assistant is ready.';
  }

  let currentUtter = null;
  function speak(){
    const txt = cleanText(selectionOrMain()).slice(0, 8000); // keep it safe
    if (!txt) return;
    stop();
    if (typeof speechSynthesis === 'undefined'){
      meta && (meta.textContent = 'Speech not supported on this browser.');
      return;
    }
    const u = new SpeechSynthesisUtterance(txt);
    const v = chosenVoice();
    if (v) u.voice = v;
    if (rateInp)  u.rate  = Math.min(1.3, Math.max(0.85, parseFloat(rateInp.value || '1')));
    if (pitchInp) u.pitch = Math.min(1.3, Math.max(0.85, parseFloat(pitchInp.value || '1')));
    u.onstart = () => { currentUtter = u; meta && (meta.textContent = `Reading… ${u.voice?.name||''}`.trim()); };
    u.onend   = () => { currentUtter = null; meta && (meta.textContent = 'Ready'); };
    u.onerror = () => { currentUtter = null; meta && (meta.textContent = 'TTS error'); };
    speechSynthesis.speak(u);
  }
  function pause(){ try{ speechSynthesis.pause(); }catch{} }
  function resume(){ try{ speechSynthesis.resume(); }catch{} }
  function stop(){ try{ speechSynthesis.cancel(); currentUtter=null; }catch{} }

  btnArea.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-voice-action]');
    if (!btn) return;
    const act = btn.dataset.voiceAction;
    if (act === 'toggle') setHidden(va.getAttribute('data-hidden') !== 'true' ? true : false);
    if (act === 'reset-pos'){ va.style.left='16px'; va.style.top='16px'; saveXY(); }
    if (act === 'start')  speak();
    if (act === 'pause')  pause();
    if (act === 'resume') resume();
    if (act === 'stop')   stop();
    if (act === 'repeat') speak();
  });

  // Show from FAB
  fab.addEventListener('click', () => setHidden(false));

  // If SOS-60 buttons exist, ensure VA shows and starts reading
  document.addEventListener('click', (e) => {
    const sos = e.target.closest('[data-sos-start],[data-action="sos-start"],#sos-start,#btn-sos-start');
    if (sos) { setHidden(false); speak(); }
  });

  // voices sometimes load async (Chrome)
  if (typeof speechSynthesis !== 'undefined'){
    speechSynthesis.onvoiceschanged = () => {};
  }
})();
