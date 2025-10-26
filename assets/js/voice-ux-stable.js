/* __mshare_voice_stable__ */
(()=>{ if (window.__mshareVoiceStable) return; window.__mshareVoiceStable = true;
  const KEYS={pos:'mshare_voice_pos_v4', hidden:'mshare_voice_hidden_v1'};
  const MIN_TOP=96, THROTTLE_MS=120;
  const selPanel='#mshare-voicebot, .mshare-voicebot, #voiceAssistant, #voice-coach, .voice-assistant, .voice-coach, .voice-coach-pro, [data-voice-coach], #mplVoiceAssistant';
  const q=(s,c=document)=>c.querySelector(s);
  const R=el=>el?el.getBoundingClientRect():null;
  const overlap=(a,b)=>a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);
  const header=()=>q('header, .site-header, #header2025, #mainNav, nav[role="navigation"]');
  const burger=()=>q('#navToggle, .nav-toggle, [data-nav-toggle], .hamburger, .menu-btn, .nav-button, button[aria-controls*="nav"]');

  let docking=false, lastDock=0;
  const schedule=(p, respectSaved)=>{
    const now=performance.now();
    if (docking || (now-lastDock)<THROTTLE_MS){ clearTimeout(schedule._t); schedule._t=setTimeout(()=>schedule(p,respectSaved), THROTTLE_MS); return; }
    docking=true;
    requestAnimationFrame(()=>{ dock(p, respectSaved); docking=false; lastDock=performance.now(); });
  };

  function clearInset(p){ p.style.removeProperty('inset'); }
  function mobileDefault(p){ Object.assign(p.style,{left:'auto',right:'16px',top:'auto',bottom:'calc(16px + env(safe-area-inset-bottom))'}); clearInset(p); }
  function desktopDefault(p){
    const h=header(); const hb = h ? (R(h).bottom + window.scrollY) : MIN_TOP;
    const top=Math.max(MIN_TOP, hb - window.scrollY + 8);
    Object.assign(p.style,{left:'auto',right:'16px',top:top+'px',bottom:'auto'}); clearInset(p);
  }
  function restoreIfSafe(p){
    let s=null; try{s=JSON.parse(localStorage.getItem(KEYS.pos)||'null');}catch{}
    if (!s || !Number.isFinite(s.left) || !Number.isFinite(s.top)) return false;
    Object.assign(p.style,{left:s.left+'px',top:s.top+'px',right:'auto',bottom:'auto'}); clearInset(p);
    const pr=R(p), hr=R(header()), br=R(burger());
    return !(overlap(pr,hr)||overlap(pr,br) || pr.top < (MIN_TOP-8));
  }
  function clamp(p){
    const r=R(p); if(!r) return;
    const nx=Math.min(Math.max(8,r.left), innerWidth - r.width - 8);
    const ny=Math.min(Math.max(8,r.top),  innerHeight - r.height - 16);
    if (p.style.left!=='auto') p.style.left = nx+'px';
    if (p.style.top!=='auto')  p.style.top  = ny+'px';
  }
  function dock(p,respectSaved){
    // prevent recursive reactions while we touch styles
    p.dataset._docking='1';
    if (!(respectSaved && restoreIfSafe(p))) {
      (innerWidth<=900?mobileDefault:desktopDefault)(p);
      try{ localStorage.removeItem(KEYS.pos); }catch{}
    }
    const pr=R(p), hr=R(header()), br=R(burger());
    if (overlap(pr,hr)||overlap(pr,br)) { (innerWidth<=900?mobileDefault:desktopDefault)(p); try{ localStorage.removeItem(KEYS.pos);}catch{} }
    clamp(p);
    delete p.dataset._docking;
  }
  function draggable(p){
    const handle = p.querySelector('.mshare-voicebot__handle') || p;
    let drag=false, sx=0, sy=0, ox=0, oy=0;
    const down=e=>{ const r=R(p); ox=r.left; oy=r.top; sx=(e.touches?e.touches[0].clientX:e.clientX); sy=(e.touches?e.touches[0].clientY:e.clientY);
      drag=true; document.addEventListener('mousemove',move); document.addEventListener('touchmove',move,{passive:false});
      document.addEventListener('mouseup',up); document.addEventListener('touchend',up); };
    const move=e=>{ if(!drag) return; const cx=(e.touches?e.touches[0].clientX:e.clientX), cy=(e.touches?e.touches[0].clientY:e.clientY);
      Object.assign(p.style,{left:(ox+(cx-sx))+'px', top:(oy+(cy-sy))+'px', right:'auto', bottom:'auto'}); e.preventDefault?.(); };
    const up=()=>{ drag=false; const pr=R(p), hr=R(header()), br=R(burger());
      if (overlap(pr,hr)||overlap(pr,br) || pr.top<(MIN_TOP-8)) { schedule(p,false); }
      else { try{ localStorage.setItem(KEYS.pos, JSON.stringify({left:pr.left, top:pr.top})); }catch{} }
      document.removeEventListener('mousemove',move); document.removeEventListener('touchmove',move);
      document.removeEventListener('mouseup',up); document.removeEventListener('touchend',up); };
    handle.addEventListener('mousedown',down); handle.addEventListener('touchstart',down,{passive:true});
  }
  function toggleButton(p){
    let t=document.getElementById('vaToggle'); if(!t){ t=document.createElement('button'); t.id='vaToggle'; t.type='button'; t.textContent='Voice'; document.body.appendChild(t); }
    const apply=h=>{ p.hidden=!!h; try{ localStorage.setItem(KEYS.hidden, h?'1':'0'); }catch{} };
    t.onclick=()=>apply(!p.hidden);
    try{ apply(localStorage.getItem(KEYS.hidden)==='1'); }catch{ apply(false); }
  }
  function init(){
    const p = q(selPanel); if(!p) return;
    if (p.__vaStable) return; p.__vaStable = true;
    p.style.zIndex='9998'; p.style.touchAction='none'; p.style.removeProperty('inset');
    toggleButton(p); draggable(p); schedule(p,true);
    const reset=p.querySelector('[data-voice-action="reset-pos"]'); if (reset) reset.addEventListener('click',()=>{ try{localStorage.removeItem(KEYS.pos);}catch{} schedule(p,false); });
    // Lightweight observers (guarded)
    const mo=new MutationObserver(muts=>{
      if (p.dataset._docking==='1') return; // ignore our own writes
      if (muts.some(m=>m.type==='attributes' && m.attributeName==='style')) schedule(p,true);
    });
    mo.observe(p,{attributes:true,attributeFilter:['style']});
    addEventListener('resize', ()=>schedule(p,true));
    addEventListener('orientationchange', ()=>schedule(p,true));
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  // One-time discovery if panel is injected later
  const once=new MutationObserver(()=>{ const p=document.querySelector(selPanel); if (p){ init(); once.disconnect(); } });
  once.observe(document.documentElement,{childList:true,subtree:true});
})();