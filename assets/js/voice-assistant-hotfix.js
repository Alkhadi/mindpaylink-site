
// assets/js/voice-assistant-hotfix.js (idempotent)
(function(){
  const sel = s => document.querySelector(s);
  const panel = sel('#mshare-voicebot') || sel('.mshare-voicebot');
  if(!panel) return;

  /* Add Hide button in handle (if missing) */
  const handle = panel.querySelector('.mshare-voicebot__handle') || panel.firstElementChild;
  if(handle && !handle.querySelector('[data-voice-action="hide"]')){
    const hideBtn = document.createElement('button');
    hideBtn.type='button';
    hideBtn.className='mshare-voicebot__btn';
    hideBtn.setAttribute('data-voice-action','hide');
    hideBtn.textContent='Hide';
    handle.appendChild(hideBtn);
  }

  /* Add floating Show button if missing */
  let toggle = sel('#mshare-voice-toggle');
  if(!toggle){
    toggle = document.createElement('div');
    toggle.id = 'mshare-voice-toggle';
    const b = document.createElement('button');
    b.type='button'; b.textContent='Voice';
    toggle.appendChild(b);
    document.body.appendChild(toggle);
  }
  const showBtn = toggle.querySelector('button');

  /* Persisted position + bounded drag */
  const key = 'mshare_voicebot_pos_v2';
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function applyPos(x,y){
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = panel.getBoundingClientRect();
    const maxX = vw - rect.width - 4;
    const maxY = vh - rect.height - 4;
    panel.style.left = clamp(x, 4, Math.max(4,maxX))+'px';
    panel.style.top  = clamp(y, 4, Math.max(4,maxY))+'px';
    panel.style.right = 'auto'; panel.style.bottom='auto'; panel.style.position='fixed';
  }
  function loadPos(){
    try{ const p = JSON.parse(localStorage.getItem(key)); if(p) applyPos(p.x,p.y); }catch{}
  }
  function savePos(){
    const r = panel.getBoundingClientRect();
    localStorage.setItem(key, JSON.stringify({x:r.left, y:r.top}));
  }

  // Initial sensible position (top-right, not covering header)
  if(!localStorage.getItem(key)) { panel.style.top='12px'; panel.style.right='12px'; }
  loadPos();

  // Dragging via handle
  const dragEl = panel.querySelector('.mshare-voicebot__handle') || panel;
  let dragging=false, dx=0, dy=0;
  dragEl.addEventListener('pointerdown', (e)=>{
    dragging=true; panel.setPointerCapture(e.pointerId);
    const r=panel.getBoundingClientRect(); dx=e.clientX-r.left; dy=e.clientY-r.top;
  });
  panel.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    applyPos(e.clientX-dx, e.clientY-dy);
  });
  panel.addEventListener('pointerup', (e)=>{ if(!dragging) return; dragging=false; savePos(); });

  /* Hide/Show */
  function hide(){ panel.setAttribute('hidden',''); toggle.style.display='block'; }
  function show(){ panel.removeAttribute('hidden'); toggle.style.display='none'; }
  panel.addEventListener('click',(e)=>{
    const a = e.target.closest('[data-voice-action]');
    if(!a) return;
    if(a.dataset.voiceAction==='hide') hide();
    if(a.dataset.voiceAction==='reset-pos'){ localStorage.removeItem(key); panel.style.top='12px'; panel.style.right='12px'; panel.style.left=''; panel.style.bottom=''; }
  });
  showBtn.addEventListener('click', show);

  /* Minimal Start/Stop that ignores non-useful characters */
  function pickVoice(nameLike){
    const list = speechSynthesis.getVoices();
    return list.find(v=> v.name.includes(nameLike)) || list.find(v=>/en-GB|English.*UK/.test(v.lang)) || list[0];
  }
  function cleanText(t){
    // keep letters, numbers and basic punctuation; collapse long whitespace
    return String(t).replace(/[^A-Za-z0-9s.,;:?!'’-–—()]/g,' ').replace(/s{2,}/g,' ').trim();
  }
  let currentUtter = null;
  function speakVisible(){
    const toRead = document.querySelector('[data-voice-target]')?.textContent
      || document.querySelector('main')?.textContent
      || document.body.textContent;
    const txt = cleanText(toRead).slice(0, 12000);
    if(!txt) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.rate = parseFloat(document.getElementById('mshare-voice-rate')?.value || '1');
    u.pitch= parseFloat(document.getElementById('mshare-voice-pitch')?.value || '1');
    const sel = document.getElementById('mshare-voice-voice');
    u.voice = sel ? pickVoice(sel.value) : pickVoice('Daniel');
    currentUtter = u; speechSynthesis.speak(u);
    const meta = document.getElementById('mshare-voice-meta'); if(meta) meta.textContent='Speaking…';
    u.onend = ()=>{ const m=document.getElementById('mshare-voice-meta'); if(m) m.textContent='Ready'; currentUtter=null; };
  }
  panel.addEventListener('click', (e)=>{
    const btn = e.target.closest('.mshare-voicebot__btn'); if(!btn) return;
    const act = btn.dataset.voiceAction;
    if(act==='start') speakVisible();
    if(act==='stop'){ speechSynthesis.cancel(); currentUtter=null; }
    if(act==='pause') speechSynthesis.pause();
    if(act==='resume') speechSynthesis.resume();
    if(act==='repeat') { if(currentUtter){ speechSynthesis.cancel(); speechSynthesis.speak(currentUtter); } else { speakVisible(); } }
  });

  // Only show the floating button if panel starts hidden
  if(panel.hasAttribute('hidden')) toggle.style.display='block';
})();
