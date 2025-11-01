(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = $('#mshare-voicebot');
  if (!root) return;

  // Ensure a container for panel body exists
  let body = $('.mshare-voicebot__body', root);
  if (!body) {
    body = document.createElement('div');
    body.className = 'mshare-voicebot__body';
    body.id = 'mshare-voicebot-panel';
    while (root.firstChild) body.appendChild(root.firstChild);
    root.appendChild(body);
  }
  // Ensure handle exists
  let handle = $('.mshare-voicebot__handle', body);
  if (!handle) {
    handle = document.createElement('div');
    handle.className = 'mshare-voicebot__handle';
    handle.tabIndex = 0;
    handle.setAttribute('aria-label','Move');
    handle.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><h3 class="mshare-voicebot__title">Voice Assistant</h3>';
    body.prepend(handle);
  }

  // Ensure meta + content exists
  let content = $('.mshare-voicebot__content', body);
  if (!content) { content = Object.assign(document.createElement('div'), {className:'mshare-voicebot__content'}); body.appendChild(content); }
  let meta = $('#mshare-voice-meta', body);
  if (!meta) { meta = Object.assign(document.createElement('div'), {id:'mshare-voice-meta', className:'mshare-voicebot__meta'}); meta.textContent='Ready'; content.appendChild(meta); }

  // Ensure control buttons row exists (Start/Pause/Resume/Stop/Repeat)
  let row1 = $$('.mshare-voicebot__row', content).find(r => r.querySelector('[data-voice-action="start"]'));
  if (!row1) {
    row1 = Object.assign(document.createElement('div'), {className:'mshare-voicebot__row'});
    row1.innerHTML = `
      <button type="button" class="mshare-voicebot__btn" data-voice-action="start">Start</button>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="pause">Pause</button>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="resume">Resume</button>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="stop">Stop</button>
      <button type="button" class="mshare-voicebot__btn" data-voice-action="repeat">Repeat</button>`;
    content.prepend(row1);
  }

  // Ensure select + sliders row exists
  let rowSel = $$('.mshare-voicebot__row', content).find(r => r.querySelector('#mshare-voice-voice'));
  if (!rowSel) {
    rowSel = Object.assign(document.createElement('div'), {className:'mshare-voicebot__row'});
    rowSel.innerHTML = `
      <div class="mshare-voicebot__field" style="flex:1 1 55%">
        <label class="mshare-sr-only" for="mshare-voice-voice">Voice</label>
        <select id="mshare-voice-voice" class="mshare-voicebot__select">
          <option value="">Auto (best available)</option>
          <option value="Google UK English Female">Google UK English Female (en-GB)</option>
          <option value="Daniel">Daniel (en-GB)</option>
          <option value="Google US English">Google US English (en-US)</option>
        </select>
      </div>
      <div class="mshare-voicebot__field" style="flex:1 1 20%">
        <label class="mshare-sr-only" for="mshare-voice-rate">Rate</label>
        <input id="mshare-voice-rate" type="range" min="0.85" max="1.3" step="0.05" value="1" class="mshare-voicebot__range">
      </div>
      <div class="mshare-voicebot__field" style="flex:1 1 20%">
        <label class="mshare-sr-only" for="mshare-voice-pitch">Pitch</label>
        <input id="mshare-voice-pitch" type="range" min="0.85" max="1.2" step="0.05" value="1" class="mshare-voicebot__range">
      </div>`;
    content.appendChild(rowSel);
  }

  // Ensure Reset + Hide/Show in handle
  let btnToggle = $('[data-voice-action="toggle"]', handle);
  if (!btnToggle) {
    btnToggle = Object.assign(document.createElement('button'), {type:'button', className:'mshare-voicebot__btn'});
    btnToggle.dataset.voiceAction = 'toggle';
    btnToggle.setAttribute('aria-controls','mshare-voicebot-panel');
    handle.appendChild(btnToggle);
  }
  let btnReset = $('[data-voice-action="reset-pos"]', handle);
  if (!btnReset) {
    btnReset = Object.assign(document.createElement('button'), {type:'button', className:'mshare-voicebot__btn', title:'Reset position'});
    btnReset.dataset.voiceAction = 'reset-pos';
    btnReset.textContent = 'Reset';
    handle.appendChild(btnReset);
  }

  // Ensure FAB (show button when hidden)
  let fab = $('.mshare-voicebot__fab', root);
  if (!fab) {
    fab = Object.assign(document.createElement('button'), {type:'button', className:'mshare-voicebot__fab', title:'Show Voice Assistant'});
    fab.dataset.voiceAction = 'show';
    fab.textContent = 'Voice Assistant';
    root.appendChild(fab);
  }

  // ===== State + persistence =====
  const store = {
    posKey: 'mshare_va_pos_v1',
    hidKey: 'mshare_va_hidden_v1',
    savePos(x,y){ try{ localStorage.setItem(this.posKey, JSON.stringify({x,y})); }catch{} },
    loadPos(){ try{ return JSON.parse(localStorage.getItem(this.posKey)||''); }catch{ return null; } },
    saveHidden(h){ try{ localStorage.setItem(this.hidKey, h?'1':'0'); }catch{} },
    loadHidden(){ try{ return localStorage.getItem(this.hidKey)==='1'; }catch{ return false; } }
  };

  function setHidden(h){
    root.dataset.hidden = h ? 'true' : 'false';
    btnToggle.textContent = h ? 'Show' : 'Hide';
    btnToggle.title = h ? 'Show Voice Assistant' : 'Hide Voice Assistant';
    btnToggle.setAttribute('aria-expanded', h ? 'false' : 'true');
    store.saveHidden(h);
  }
  btnToggle.addEventListener('click', () => setHidden(root.dataset.hidden !== 'true'));
  fab.addEventListener('click', () => setHidden(false));
  btnReset.addEventListener('click', resetPos);

  // ===== Drag with bounds =====
  // If panel initially uses inline "inset: …", convert to top/left
  (function normalizeInline(){
    const s = getComputedStyle(root);
    if (s.inset && s.inset !== 'auto') {
      root.style.right = 'auto'; root.style.bottom = 'auto';
      root.style.top = (root.offsetTop||16) + 'px';
      root.style.left = (root.offsetLeft||16) + 'px';
    }
  })();

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function applyPos(x,y){
    root.style.top = y + 'px';
    root.style.left = x + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
    store.savePos(x,y);
  }
  function resetPos(){
    const m = 12;
    const x = window.innerWidth - (root.offsetWidth||320) - m;
    const y = m;
    applyPos(x,y);
  }
  function restorePos(){
    const m = 12, W = window.innerWidth, H = window.innerHeight;
    const w = root.offsetWidth||320, h = root.offsetHeight||220;
    let x = W - w - m, y = m;
    const p = store.loadPos();
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)){
      x = clamp(p.x, m, Math.max(m, W - w - m));
      y = clamp(p.y, m, Math.max(m, H - h - m));
    }
    applyPos(x,y);
  }
  let drag = {on:false, dx:0, dy:0};
  function down(e){
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    drag.on = true; handle.classList.add('is-dragging');
    const r = root.getBoundingClientRect(); drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
    root.setPointerCapture?.(e.pointerId);
  }
  function move(e){
    if (!drag.on) return;
    const m = 8, w = root.offsetWidth||320, h = root.offsetHeight||220;
    const x = clamp(e.clientX - drag.dx, m, window.innerWidth - w - m);
    const y = clamp(e.clientY - drag.dy, m, window.innerHeight - h - m);
    applyPos(x,y);
  }
  function up(e){ drag.on = false; handle.classList.remove('is-dragging'); root.releasePointerCapture?.(e.pointerId); }
  handle.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('resize', restorePos);

  // ===== Smart TTS =====
  const selVoice = $('#mshare-voice-voice', root);
  const rate = $('#mshare-voice-rate', root);
  const pitch = $('#mshare-voice-pitch', root);
  const bStart = $('[data-voice-action="start"]', root);
  const bStop = $('[data-voice-action="stop"]', root);
  const bPause = $('[data-voice-action="pause"]', root);
  const bResume = $('[data-voice-action="resume"]', root);
  const bRepeat = $('[data-voice-action="repeat"]', root);

  let voices = [];
  function loadVoices(){
    voices = speechSynthesis.getVoices() || [];
    if (!voices.length) setTimeout(loadVoices, 200);
  }
  if ('speechSynthesis' in window){ loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice(){
    const pref = (selVoice?.value||'').trim();
    const want = pref ? [pref] : ['Google UK English Female','Daniel','Google US English'];
    for (const n of want){ const v = voices.find(v => v.name===n); if (v) return v; }
    return voices.find(v => /en-|English|UK|US/i.test(v.name+v.lang)) || voices[0];
  }
  function isReadable(el){
    if (!el || el.nodeType!==1) return false;
    const t = el.tagName.toLowerCase();
    if (['script','style','noscript','svg','canvas','img','video','audio','source','track','iframe'].includes(t)) return false;
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden')==='true') return false;
    if (el.classList.contains('mshare-sr-only')) return false;
    if (['nav','header','footer','aside'].includes(t)) return false;
    return true;
  }
  function extractText(rootEl){
    const sel = window.getSelection?.(); const picked = sel && sel.rangeCount ? sel.toString().trim() : '';
    if (picked && picked.length>12) return picked;
    const w = document.createTreeWalker(rootEl||document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n){ const p = n.parentElement; if(!p||!isReadable(p)) return NodeFilter.FILTER_REJECT; const t=(n.textContent||'').trim(); return t?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT; }
    });
    const chunks = []; while (w.nextNode()) chunks.push(w.currentNode.textContent);
    let text = chunks.join(' ');
    text = text
      .replace(/\S+@\S+\.\S+/g,' ')
      .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi,' ')
      .replace(/\[[^\]]{1,40}\]/g,' ')
      .replace(/[^\p{L}\p{N}\s.,;:!?'"—-]/gu,' ')
      .replace(/[.,;:!?'"—-]{3,}/g,'. ')
      .replace(/\s{2,}/g,' ')
      .trim();
    return text;
  }
  function chunk(t, max=220){
    const parts=[]; while(t.length){ if(t.length<=max){parts.push(t);break;}
      let i=t.lastIndexOf('. ',max); if(i<max*0.6) i=t.lastIndexOf(', ',max); if(i<max*0.4) i=t.lastIndexOf(' ',max); if(i<=0) i=max;
      parts.push(t.slice(0,i+1).trim()); t=t.slice(i+1).trim();
    } return parts;
  }
  function setMeta(s){ if (meta) meta.textContent=s; }

  let lastText='';
  function start(targetSel){
    if (!('speechSynthesis' in window)) { setMeta('Speech not supported on this browser'); return; }
    const rootEl = (targetSel && document.querySelector(targetSel)) || document.querySelector('[data-read-target]') || document.querySelector('main') || document.body;
    const text = extractText(rootEl);
    if (!text){ setMeta('Nothing readable on the page'); return; }
    lastText=text; speechSynthesis.cancel();
    const v=pickVoice(); const r=Math.max(0.85, Math.min(1.3, parseFloat(rate?.value||'1'))); const p=Math.max(0.85, Math.min(1.2, parseFloat(pitch?.value||'1')));
    const parts=chunk(text);
    parts.forEach((T,i)=>{ const u=new SpeechSynthesisUtterance(T); if(v) u.voice=v; u.lang=(v&&v.lang)||'en-GB'; u.rate=r; u.pitch=p; if(i===0) u.onstart=()=>setMeta(`Speaking… (${parts.length} parts)`); if(i===parts.length-1) u.onend=()=>setMeta('Done'); speechSynthesis.speak(u); });
    setHidden(false);
  }
  function stop(){ speechSynthesis.cancel(); setMeta('Stopped'); }
  function pause(){ if (speechSynthesis.speaking) speechSynthesis.pause(); setMeta('Paused'); }
  function resume(){ if (speechSynthesis.paused) speechSynthesis.resume(); setMeta('Speaking…'); }
  function repeat(){ if (lastText){ speechSynthesis.cancel(); start(); } }

  bStart?.addEventListener('click', () => start());
  bStop?.addEventListener('click', stop);
  bPause?.addEventListener('click', pause);
  bResume?.addEventListener('click', resume);
  bRepeat?.addEventListener('click', repeat);

  // SOS-60: auto-show + read
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-sos-start]');
    if (!t) return;
    const txt=(t.textContent||'').toLowerCase();
    if (t.hasAttribute('data-sos-start') || /start\s*sos-?60\s*now/.test(txt)){
      setHidden(false);
      start('#sos-content');
    }
  }, true);

  // init
  setHidden(store.loadHidden());
  restorePos();
})();
