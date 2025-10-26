/* __mshare_voicebot_navsafe__ */
(function(){
  const KEY='mshare_voicebot_pos_v3';
  const MIN_TOP=96;
  const q=(s,c=document)=>c.querySelector(s);
  const rect=el=>el?el.getBoundingClientRect():null;
  const overlap=(a,b)=>a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);

  const getPanel    = ()=>q('#mshare-voicebot');
  const getHeader   = ()=>q('header, .site-header, #header2025, #mainNav, nav[role="navigation"]');
  const getHamburger= ()=>q('#navToggle, .nav-toggle, [data-nav-toggle], .hamburger, .menu-btn, .nav-button, button[aria-controls*="nav"]');

  function clearInlineInset(p){
    // remove 'inset:' if present and prefer explicit sides
    p.style.removeProperty('inset');
  }
  function applyMobileDefault(p){
    Object.assign(p.style,{left:'auto', right:'16px', top:'auto', bottom:'calc(16px + env(safe-area-inset-bottom))'});
    clearInlineInset(p);
  }
  function applyDesktopDefault(p){
    const h=getHeader(); const hb= h? (rect(h).bottom + window.scrollY) : MIN_TOP;
    const top=Math.max(MIN_TOP, hb - window.scrollY + 8);
    Object.assign(p.style,{left:'auto', right:'16px', top:top+'px', bottom:'auto'});
    clearInlineInset(p);
  }
  function restoreIfSafe(p){
    let saved=null; try{ saved=JSON.parse(localStorage.getItem(KEY)||'null'); }catch{}
    if(!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return false;
    Object.assign(p.style,{left:saved.left+'px', top:saved.top+'px', right:'auto', bottom:'auto'});
    clearInlineInset(p);
    const pr=rect(p), hr=rect(getHeader()), br=rect(getHamburger());
    if(!pr) return false;
    // reject if overlapping header/burger or too close to top
    if (overlap(pr,hr)||overlap(pr,br)||pr.top<MIN_TOP-8){ return false; }
    return true;
  }
  function clampViewport(p){
    const r=rect(p); if(!r) return;
    const vw=innerWidth, vh=innerHeight;
    const nx=Math.min(Math.max(8,r.left), vw-r.width-8);
    const ny=Math.min(Math.max(8,r.top),  vh-r.height-16);
    if (p.style.left!=='auto') p.style.left = nx+'px';
    if (p.style.top!=='auto')  p.style.top  = ny+'px';
  }
  function navSafeDock(p,{respectSaved}={}){
    const mobile = innerWidth<=900;
    if(!(respectSaved && restoreIfSafe(p))){
      mobile?applyMobileDefault(p):applyDesktopDefault(p);
      try{ localStorage.removeItem(KEY); }catch{}
    }
    // if still overlapping, force safe defaults
    const pr=rect(p), hr=rect(getHeader()), br=rect(getHamburger());
    if (overlap(pr,hr)||overlap(pr,br)){
      (innerWidth<=900?applyMobileDefault:applyDesktopDefault)(p);
      try{ localStorage.removeItem(KEY); }catch{}
    }
    clampViewport(p);
  }
  function hookReset(p){
    const btn=p.querySelector('[data-voice-action="reset-pos"]');
    if(btn) btn.addEventListener('click', ()=>{ try{localStorage.removeItem(KEY);}catch{} navSafeDock(p,{respectSaved:false}); });
  }
  function watchStyleSaves(p){
    // Save when position changes (from your drag code)
    const obs=new MutationObserver(()=> {
      const L=parseFloat(p.style.left), T=parseFloat(p.style.top);
      if(Number.isFinite(L)&&Number.isFinite(T)){
        try{ localStorage.setItem(KEY, JSON.stringify({left:L, top:T})); }catch{}
      }
    });
    obs.observe(p,{attributes:true, attributeFilter:['style']});
  }

  function init(){
    const p=getPanel(); if(!p) return;
    p.style.zIndex='9998'; p.style.touchAction='none'; // smooth handle drag
    navSafeDock(p,{respectSaved:true});
    hookReset(p); watchStyleSaves(p);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  // Re-run when panel is injected or on layout changes
  new MutationObserver(()=>{ const p=getPanel(); if(p) init(); }).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('resize', init); addEventListener('orientationchange', init);
})();