/* __mshare_voice_uxfix__ */
(function(){
  const KEY='mshare_voicebot_pos_v3', KEY_H='mshare_voicebot_hidden_v1';
  const MIN_TOP=96;
  const q=(s,c=document)=>c.querySelector(s);
  const rect=el=>el?el.getBoundingClientRect():null;
  const overlap=(a,b)=>a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);

  const panelSel = '#mshare-voicebot, .mshare-voicebot';

  function header(){return q('header, .site-header, #header2025, #mainNav, nav[role="navigation"]');}
  function burger(){return q('#navToggle, .nav-toggle, [data-nav-toggle], .hamburger, .menu-btn, .nav-button, button[aria-controls*="nav"]');}

  function clearInlineInset(p){ p.style.removeProperty('inset'); }

  function mobileDefault(p){
    Object.assign(p.style,{left:'auto', right:'16px', top:'auto', bottom:'calc(16px + env(safe-area-inset-bottom))'});
    clearInlineInset(p);
  }
  function desktopDefault(p){
    const h=header(); const hb = h ? (rect(h).bottom + window.scrollY) : MIN_TOP;
    const top = Math.max(MIN_TOP, hb - window.scrollY + 8);
    Object.assign(p.style,{left:'auto', right:'16px', top:top+'px', bottom:'auto'});
    clearInlineInset(p);
  }
  function restoreIfSafe(p){
    let s=null; try{s=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
    if(!s || !Number.isFinite(s.left) || !Number.isFinite(s.top)) return false;
    Object.assign(p.style,{left:s.left+'px', top:s.top+'px', right:'auto', bottom:'auto'}); clearInlineInset(p);
    const pr=rect(p), hr=rect(header()), br=rect(burger());
    if(overlap(pr,hr)||overlap(pr,br)||pr.top < MIN_TOP-8) return false;
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

  function dockSafe(p,{respectSaved}={}){
    const isMobile = innerWidth<=900;
    if(!(respectSaved && restoreIfSafe(p))){
      isMobile ? mobileDefault(p) : desktopDefault(p);
      try{ localStorage.removeItem(KEY); }catch{}
    }
    // still overlapping? force safe position
    const pr=rect(p), hr=rect(header()), br=rect(burger());
    if (overlap(pr,hr)||overlap(pr,br)){
      (innerWidth<=900?mobileDefault:desktopDefault)(p);
      try{ localStorage.removeItem(KEY); }catch{}
    }
    clampViewport(p);
  }

  function makeDraggable(p){
    const handle = p.querySelector('.mshare-voicebot__handle') || p;
    let dragging=false, sx=0, sy=0, ox=0, oy=0;
    const down=e=>{
      const r=rect(p); ox=r.left; oy=r.top;
      sx=(e.touches?e.touches[0].clientX:e.clientX);
      sy=(e.touches?e.touches[0].clientY:e.clientY);
      dragging=true; document.addEventListener('mousemove',move); document.addEventListener('touchmove',move,{passive:false});
      document.addEventListener('mouseup',up); document.addEventListener('touchend',up);
    };
    const move=e=>{
      if(!dragging) return;
      const cx=(e.touches?e.touches[0].clientX:e.clientX), cy=(e.touches?e.touches[0].clientY:e.clientY);
      const nx=ox+(cx-sx), ny=oy+(cy-sy);
      Object.assign(p.style,{left:nx+'px', top:ny+'px', right:'auto', bottom:'auto'}); e.preventDefault?.();
    };
    const up=()=>{
      dragging=false;
      // persist only if safe
      const pr=rect(p), hr=rect(header()), br=rect(burger());
      if (overlap(pr,hr)||overlap(pr,br) || pr.top < MIN_TOP-8) {
        dockSafe(p,{respectSaved:false});
      } else {
        try{ localStorage.setItem(KEY, JSON.stringify({left:pr.left, top:pr.top})); }catch{}
      }
      document.removeEventListener('mousemove',move); document.removeEventListener('touchmove',move);
      document.removeEventListener('mouseup',up); document.removeEventListener('touchend',up);
    };
    handle.addEventListener('mousedown',down); handle.addEventListener('touchstart',down,{passive:true});
  }

  function ensureToggle(p){
    let t = document.getElementById('vaToggle');
    if(!t){
      t=document.createElement('button');
      t.id='vaToggle'; t.type='button'; t.textContent='Voice';
      document.body.appendChild(t);
    }
    const apply=h=>{ p.hidden=!!h; try{localStorage.setItem(KEY_H, h?'1':'0');}catch{} };
    t.addEventListener('click',()=>apply(!p.hidden));
    try{ apply(localStorage.getItem(KEY_H)==='1'); }catch{ apply(false); }
  }

  function fixInlineAndZ(p){
    p.style.zIndex='9998'; p.style.touchAction='none'; // smoother drag on mobile
    p.style.removeProperty('inset');
  }

  function init(){
    const p = q(panelSel); if(!p) return;
    fixInlineAndZ(p);
    ensureToggle(p);
    dockSafe(p,{respectSaved:true});
    makeDraggable(p);

    // reset button clears saved pos
    const reset = p.querySelector('[data-voice-action="reset-pos"]');
    if (reset) reset.addEventListener('click', ()=>{ try{localStorage.removeItem(KEY);}catch{} dockSafe(p,{respectSaved:false}); });

    // monitor style changes (from other scripts) and keep nav-safe
    const mo = new MutationObserver(()=>{ dockSafe(p,{respectSaved:true}); });
    mo.observe(p,{attributes:true, attributeFilter:['style']});
    addEventListener('resize', ()=>dockSafe(p,{respectSaved:true}));
    addEventListener('orientationchange', ()=>dockSafe(p,{respectSaved:true}));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  new MutationObserver(()=>{ if (q(panelSel)) init(); }).observe(document.documentElement,{childList:true,subtree:true});
})();