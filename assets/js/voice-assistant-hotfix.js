/* __mshare_va_hotfix__ nav-safe */
(function(){
  const q=(s,c=document)=>c.querySelector(s), qq=(s,c=document)=>Array.from(c.querySelectorAll(s));
  const LS={hidden:'va_hidden', pos:'va_pos_v2'};
  const MIN_TOP_DESKTOP = 96;

  const getHeader = () => q('header, .site-header, #header2025, #mainNav, nav[role="navigation"]');
  const getBurger = () => q('#navToggle, .nav-toggle, [data-nav-toggle], button[aria-controls*="nav"], #menuToggle, .hamburger, .menu-btn, .nav-button');

  const rect = el => el ? el.getBoundingClientRect() : null;
  const overlap = (a,b)=> a && b && !(a.right<=b.left || a.left>=b.right || a.bottom<=b.top || a.top>=b.bottom);

  function ensureStart(p){
    if (qq('button',p).some(b=>/\bstart\b/i.test((b.textContent||'').trim()))) return;
    const bar=q('.va-toolbar',p)||p;
    const btn=document.createElement('button');
    btn.className='va-btn primary va-start'; btn.type='button'; btn.textContent='Start';
    btn.addEventListener('click',()=>{
      const VC=window.__voiceCoach||window.voiceCoach||window.mplVoice||window.VoiceCoach||{};
      for(const k of ['start','resume','play','speak']) if(typeof VC[k]==='function'){ try{VC[k]();}catch{} return; }
      document.dispatchEvent(new CustomEvent('va-start',{bubbles:true}));
    });
    bar.firstChild?bar.insertBefore(btn,bar.firstChild):bar.appendChild(btn);
  }

  function ensureBars(p){
    let tb=q('.va-titlebar',p);
    if(!tb){ tb=document.createElement('div'); tb.className='va-titlebar';
      const h=document.createElement('strong'); h.textContent='Voice Assistant'; tb.appendChild(h);
      p.insertBefore(tb,p.firstChild);
    }
    let tool=q('.va-toolbar',p); if(!tool){ tool=document.createElement('div'); tool.className='va-toolbar'; p.appendChild(tool); }
    return tb;
  }

  function drag(p, handle){
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    const down=e=>{dragging=true; const r=p.getBoundingClientRect(); ox=r.left; oy=r.top;
      sx=(e.touches?e.touches[0].clientX:e.clientX); sy=(e.touches?e.touches[0].clientY:e.clientY);
      document.addEventListener('mousemove',move); document.addEventListener('touchmove',move,{passive:false});
      document.addEventListener('mouseup',up); document.addEventListener('touchend',up);};
    const move=e=>{
      if(!dragging) return;
      const cx=(e.touches?e.touches[0].clientX:e.clientX), cy=(e.touches?e.touches[0].clientY:e.clientY);
      const nx=ox+(cx-sx), ny=oy+(cy-sy);
      Object.assign(p.style,{left:nx+'px', top:ny+'px', right:'auto', bottom:'auto'});
      try{localStorage.setItem(LS.pos, JSON.stringify({left:nx, top:ny}));}catch{}
      e.preventDefault?.();
    };
    const up=()=>{dragging=false;
      document.removeEventListener('mousemove',move); document.removeEventListener('touchmove',move);
      document.removeEventListener('mouseup',up); document.removeEventListener('touchend',up);
      // snap if user drags into header/hamburger
      navSafeDock(p, {respectSaved:true});
    };
    handle.addEventListener('mousedown',down); handle.addEventListener('touchstart',down,{passive:true});
  }

  function clampOnScreen(p){
    const r=p.getBoundingClientRect(), vw=window.innerWidth, vh=window.innerHeight;
    const nx=Math.min(Math.max(8, r.left), vw - r.width - 8);
    const ny=Math.min(Math.max(8, r.top),  vh - r.height - 16);
    Object.assign(p.style,{left:nx+'px', top:ny+'px'});
  }

  function navSafeDock(p, opts={}){
    const vw=window.innerWidth, mobile = vw <= 900;
    const header = getHeader();
    const burger = getBurger();
    const headerBottom = header ? rect(header).bottom + window.scrollY : MIN_TOP_DESKTOP;
    const topMin = Math.max(MIN_TOP_DESKTOP, headerBottom - window.scrollY + 8);

    let saved=null; try{ saved = JSON.parse(localStorage.getItem(LS.pos) || 'null'); }catch{}

    // 1) Base dock
    if (mobile){
      Object.assign(p.style,{left:'auto', right:'16px', top:'auto', bottom:'calc(16px + env(safe-area-inset-bottom))'});
    } else {
      Object.assign(p.style,{left:'auto', right:'16px', top: topMin+'px', bottom:'auto'});
    }

    // 2) Restore saved if allowed and safe
    if (opts.respectSaved && saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)){
      Object.assign(p.style,{left:saved.left+'px', top:saved.top+'px', right:'auto', bottom:'auto'});
    }

    // 3) If overlapping header or hamburger, force bottom-right (mobile) or below header (desktop)
    const pr = rect(p), br = rect(burger), hr = rect(header);
    if (overlap(pr, hr) || overlap(pr, br)){
      if (mobile){
        Object.assign(p.style,{left:'auto', right:'16px', top:'auto', bottom:'calc(16px + env(safe-area-inset-bottom))'});
        try{ localStorage.removeItem(LS.pos); }catch{}
      } else {
        Object.assign(p.style,{left:'auto', right:'16px', top: topMin+'px', bottom:'auto'});
      }
    }

    // 4) Finally clamp to viewport
    requestAnimationFrame(()=>clampOnScreen(p));
  }

  function ensureToggle(p){
    let t=document.getElementById('vaToggle');
    if(!t){ t=document.createElement('button'); t.id='vaToggle'; t.className='va-toggle'; t.type='button'; t.textContent='Voice'; document.body.appendChild(t); }
    const apply=h=>{ p.hidden=!!h; try{localStorage.setItem(LS.hidden, h?'1':'0');}catch{} };
    t.addEventListener('click',()=>apply(!p.hidden));
    try{ apply(localStorage.getItem(LS.hidden)==='1'); }catch{ apply(false); }
  }

  function init(){
    const p = q('#voiceAssistant, #voice-coach, .voice-assistant, .voice-coach, .voice-coach-pro, [data-voice-coach], #mplVoiceAssistant');
    if(!p) return;
    p.classList.add('va-panel');
    const tb = ensureBars(p); ensureStart(p);
    let handle = tb.querySelector('.va-handle');
    if(!handle){ handle=document.createElement('button'); handle.type='button'; handle.className='va-handle'; handle.textContent='Move'; tb.appendChild(handle); }
    drag(p, handle); ensureToggle(p);
    navSafeDock(p, {respectSaved:true});

    let roTimer=null;
    const onRO = ()=>{ clearTimeout(roTimer); roTimer=setTimeout(()=>navSafeDock(p,{respectSaved:true}),120); };
    window.addEventListener('resize', onRO);
    window.addEventListener('orientationchange', onRO);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  window.addEventListener('mshare-voice:panel-ready', init);
})();