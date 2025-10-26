/* __mshare_va_hotfix__ */
(function(){
  const LS = {
    hidden: 'va_hidden',
    pos: 'va_pos_v2'
  };
  const q = (s,c=document)=>c.querySelector(s);
  const qq = (s,c=document)=>Array.from(c.querySelectorAll(s));
  function detectPanel(){
    return q('#voiceAssistant') || q('#voice-coach') || q('.voice-assistant') ||
           q('.voice-coach') || q('.voice-coach-pro') || q('[data-voice-coach]') ||
           q('#mplVoiceAssistant');
  }
  function ensureStart(panel){
    const hasStart = qq('button', panel).some(b => /\bstart\b/i.test(b.textContent||''));
    if (hasStart) return;
    const bar = q('.va-toolbar', panel) || panel;
    const btn = document.createElement('button');
    btn.className = 'va-btn primary va-start';
    btn.type = 'button';
    btn.textContent = 'Start';
    btn.title = 'Start voice assistant';
    btn.addEventListener('click', () => {
      const VC = window.__voiceCoach || window.voiceCoach || window.mplVoice || window.VoiceCoach || {};
      for (const name of ['start','resume','play','speak']) {
        if (typeof VC[name] === 'function') { try { VC[name](); } catch{} return; }
      }
      document.dispatchEvent(new CustomEvent('va-start',{bubbles:true}));
    });
    if (bar.firstChild) bar.insertBefore(btn, bar.firstChild); else bar.appendChild(btn);
  }
  function ensureTitlebar(panel){
    let tb = q('.va-titlebar', panel);
    if (!tb){
      tb = document.createElement('div');
      tb.className = 'va-titlebar';
      const h = document.createElement('strong');
      h.textContent = 'Voice Assistant';
      tb.appendChild(h);
      panel.insertBefore(tb, panel.firstChild);
    }
    return tb;
  }
  function ensureToolbar(panel){
    let bar = q('.va-toolbar', panel);
    if (!bar){
      bar = document.createElement('div'); bar.className = 'va-toolbar';
      panel.appendChild(bar);
    }
    return bar;
  }
  function ensureHandle(panel, titlebar){
    if (q('.va-handle', titlebar)) return;
    const btn = document.createElement('button');
    btn.type='button'; btn.className='va-handle'; btn.textContent='Move';
    titlebar.appendChild(btn);
    // drag logic (saves absolute top/left)
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    const onDown = (e)=>{
      dragging=true; btn.style.cursor='grabbing';
      const r = panel.getBoundingClientRect();
      ox = r.left; oy = r.top;
      sx = (e.touches? e.touches[0].clientX : e.clientX);
      sy = (e.touches? e.touches[0].clientY : e.clientY);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, {passive:false});
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchend', onUp);
    };
    const onMove = (e)=>{
      if (!dragging) return;
      const cx = (e.touches? e.touches[0].clientX : e.clientX);
      const cy = (e.touches? e.touches[0].clientY : e.clientY);
      const nx = ox + (cx - sx);
      const ny = oy + (cy - sy);
      Object.assign(panel.style, {left: nx+'px', top: ny+'px', right:'auto', bottom:'auto'});
      try { localStorage.setItem(LS.pos, JSON.stringify({left:nx, top:ny})); } catch {}
      e.preventDefault?.();
    };
    const onUp = ()=>{
      dragging=false; btn.style.cursor='grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };
    btn.addEventListener('mousedown', onDown);
    btn.addEventListener('touchstart', onDown, {passive:true});
  }
  function ensureToggle(panel){
    let t = document.getElementById('vaToggle');
    if (!t){
      t = document.createElement('button');
      t.id = 'vaToggle'; t.className='va-toggle'; t.type='button';
      t.setAttribute('aria-pressed','false');
      t.title = 'Show/Hide Voice Assistant';
      t.textContent = 'Voice';
      document.body.appendChild(t);
    }
    const apply = (hidden)=>{
      panel.hidden = !!hidden;
      t.setAttribute('aria-pressed', hidden ? 'true' : 'false');
      try { localStorage.setItem(LS.hidden, hidden ? '1' : '0'); } catch {}
    };
    t.addEventListener('click', ()=> apply(!panel.hidden));
    // restore saved state
    try { apply(localStorage.getItem(LS.hidden) === '1'); } catch { apply(false); }
  }
  function applyDefaultPosition(panel){
    // default top-right
    Object.assign(panel.style, {top:'96px', right:'16px', left:'auto', bottom:'auto'});
    try {
      const s = localStorage.getItem(LS.pos);
      if (s){
        const p = JSON.parse(s);
        if (Number.isFinite(p.left) && Number.isFinite(p.top)){
          Object.assign(panel.style, {left:p.left+'px', top:p.top+'px', right:'auto', bottom:'auto'});
        }
      }
    } catch {}
  }
  function ensureClasses(panel){
    // make sure panel has .va-panel wrapper class for CSS targeting
    if (!panel.classList.contains('va-panel')) panel.classList.add('va-panel');
  }

  function init(){
    const panel = detectPanel();
    if (!panel) return;
    ensureClasses(panel);
    const tb = ensureTitlebar(panel);
    ensureToolbar(panel);
    ensureStart(panel);
    ensureHandle(panel, tb);
    ensureToggle(panel);
    applyDefaultPosition(panel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
