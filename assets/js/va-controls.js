(()=>{const P=document.querySelector('#mshare-voicebot');if(!P)return;
  // --- show/hide ---
  function show(){P.classList.remove('is-hidden');localStorage.setItem('va_hidden','0');const t=document.getElementById('va-show-toggle');if(t)t.hidden=true;}
  function hide(){P.classList.add('is-hidden');localStorage.setItem('va_hidden','1');let t=document.getElementById('va-show-toggle');if(!t){t=document.createElement('button');t.id='va-show-toggle';t.type='button';t.title='Show Voice Assistant';t.textContent='Voice Assistant';document.body.appendChild(t);} t.hidden=false; t.onclick=show;}
  // add Hide button in handle (no new panel)
  const handle=P.querySelector('.mshare-voicebot__handle')||P.firstElementChild||P;
  let hideBtn=P.querySelector('[data-voice-action="hide"]');
  if(!hideBtn){ hideBtn=document.createElement('button'); hideBtn.type='button'; hideBtn.className='mshare-voicebot__btn mshare-voicebot__btn--ghost'; hideBtn.setAttribute('data-voice-action','hide'); hideBtn.textContent='Hide'; handle.appendChild(hideBtn); }
  hideBtn.onclick=hide;
  if(localStorage.getItem('va_hidden')==='1') hide(); else show();

  // --- full-range dragging (bounded to viewport) ---
  let drag=false,sx=0,sy=0,L=0,T=0;
  function clamp(v,min,max){return Math.min(Math.max(v,min),max);}
  function setPos(l,t){P.style.left=l+'px';P.style.top=t+'px';P.style.right='auto';P.style.bottom='auto';localStorage.setItem('va_pos',JSON.stringify({l,t}));}
  function down(e){const ev=e.touches?e.touches[0]:e; const r=P.getBoundingClientRect(); L=r.left+window.scrollX; T=r.top+window.scrollY; sx=ev.clientX; sy=ev.clientY; drag=true; e.preventDefault();}
  function move(e){ if(!drag)return; const ev=e.touches?e.touches[0]:e; const dx=ev.clientX-sx, dy=ev.clientY-sy; const w=window.innerWidth, h=window.innerHeight; const pr=P.getBoundingClientRect(); const l=clamp(L+dx,0,w-pr.width); const t=clamp(T+dy,0,h-pr.height); setPos(l,t); }
  function up(){drag=false;}
  handle.addEventListener('mousedown',down); window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  handle.addEventListener('touchstart',down,{passive:false}); window.addEventListener('touchmove',move,{passive:false}); window.addEventListener('touchend',up);

  try{const p=JSON.parse(localStorage.getItem('va_pos')||''); if(p&&typeof p.l==='number') setPos(p.l,p.t);}catch{}

  // --- smart, natural TTS (Web Speech), ignore noise ---
  function clean(t){ if(!t)return''; t=t.replace(/https?:\/\/\S+/gi,' '); t=t.replace(/[\u200B-\u200D\uFEFF]/g,''); t=t.replace(/[^\w\s.,;:!?£€$%()'’\-]/g,' '); t=t.replace(/\s{2,}/g,' ').trim(); return t; }
  function pickVoice(){const wants=['Daniel','Moira','en-GB','English (United Kingdom)']; const vs=speechSynthesis.getVoices(); for(const v of vs){ if(wants.some(w=>v.name.includes(w)||v.lang.includes('en-GB'))) return v; } return vs[0]||null; }
  let speaking=false, current=null;
  function speak(text){const t=clean(text); if(!t)return; const u=new SpeechSynthesisUtterance(t); u.rate=parseFloat(localStorage.getItem('va_rate')||'1'); u.pitch=parseFloat(localStorage.getItem('va_pitch')||'1'); const v=pickVoice(); if(v)u.voice=v; speaking=true; current=u; u.onend=()=>{speaking=false;current=null}; u.onerror=()=>{speaking=false;current=null}; speechSynthesis.cancel(); speechSynthesis.speak(u);}
  function stop(){speechSynthesis.cancel();speaking=false;current=null;}
  function pause(){speechSynthesis.pause();}
  function resume(){speechSynthesis.resume();}

  // Panel control wiring (uses existing data-voice-action buttons)
  P.addEventListener('click',e=>{
    const a=e.target.closest('[data-voice-action]'); if(!a)return;
    const act=a.getAttribute('data-voice-action');
    if(act==='start'){ const scope=document.querySelector('[data-voice-scope]')||document.querySelector('main')||document.body; show(); speak(scope.innerText||scope.textContent||''); }
    if(act==='pause') pause();
    if(act==='resume') resume();
    if(act==='stop') stop();
    if(act==='repeat' && current){ const t=current.text; stop(); setTimeout(()=>speak(t),80); }
    if(act==='hide') hide();
    if(act==='reset-pos'){ localStorage.removeItem('va_pos'); setPos(window.innerWidth-(P.offsetWidth||320)-16, 16); }
  });

  // SOS-60 Start button should trigger VA
  document.querySelectorAll('a,button,[role="button"]').forEach(el=>{
    if(/Start\s*SOS-?60\s*Now/i.test(el.textContent||'')){
      el.addEventListener('click',()=>{ const scope=document.getElementById('sos-60')||document.querySelector('main')||document.body; show(); speak(scope.innerText||'Starting SOS sixty breathing'); },{passive:true});
    }
  });

  // expose minimal API
  window.mshareVoice={speak,stop,pause,resume,show,hide};
})();