(()=>{
  'use strict';
  if (window.__VA_LAUNCHER_READY__) return; window.__VA_LAUNCHER_READY__ = true;

  const D=document, W=window;
  const PANEL_SEL = '#mshare-voicebot, .mshare-voicebot, .voice-assistant, #voiceAssistant, [data-role="voice-assistant"]';
  const HANDLE_SEL = '.mshare-voicebot__handle, [data-va-handle]';
  const HIDE_BTN_ID = 'mshareVoiceHideBtn';
  const LAUNCHER_ID = 'mshareVoiceLauncher';
  const ZTOP = 2147483000;
  const KEYS = {
    HIDDEN: 'mshare_voicebot_hidden_v1',
    POS: 'mshare_voicebot_pos_v1'
  };

  const ui = { panel: null, handle: null, launcher: null };
  const state = { dragging:false, offsetX:0, offsetY:0 };

  const isSmall = ()=> W.innerWidth <= 768;
  const now = ()=> Date.now();
  let lastLaunchClick = 0;

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function readJSON(k, def){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def; }catch{ return def; } }
  function writeJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

  function bounds(panel){
    const r = panel.getBoundingClientRect();
    return {
      minLeft: 8,
      minTop: isSmall() ? 96 : 16, // keep clear of header/hamburger on phones
      maxLeft: Math.max(8, W.innerWidth - r.width - 8),
      maxTop:  Math.max(isSmall()?96:16, W.innerHeight - r.height - 8)
    };
  }

  function position(panel, left, top){
    const b = bounds(panel);
    const L = clamp(left, b.minLeft, b.maxLeft);
    const T = clamp(top,  b.minTop,  b.maxTop);
    panel.style.left = L + 'px';
    panel.style.top  = T + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    writeJSON(KEYS.POS, { left: L, top: T });
  }

  function ensureHideButton(){
    if (!ui.panel) return;
    if (D.getElementById(HIDE_BTN_ID)) return;

    const btn = D.createElement('button');
    btn.id = HIDE_BTN_ID;
    btn.type = 'button';
    btn.textContent = 'Hide';
    Object.assign(btn.style, {
      marginLeft: 'auto',
      padding: '6px 10px',
      border: '1px solid rgba(0,0,0,.12)',
      borderRadius: '10px',
      background: '#e5e7eb',
      color: '#111827',
      cursor: 'pointer'
    });

    const handle = ui.handle || ui.panel.querySelector(HANDLE_SEL) || ui.panel;
    handle.appendChild(btn);
    btn.addEventListener('click', hidePanel);
  }

  function ensureLauncher(){
    let l = D.getElementById(LAUNCHER_ID);
    if (l){ ui.launcher = l; return; }
    l = D.createElement('button');
    l.id = LAUNCHER_ID;
    l.type = 'button';
    l.textContent = '🎤 Voice';
    Object.assign(l.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: String(ZTOP),
      border: 'none',
      borderRadius: '9999px',
      padding: '10px 12px',
      background: '#115E84',
      color: '#fff',
      boxShadow: '0 8px 20px rgba(0,0,0,.25)',
      cursor: 'pointer'
    });
    l.addEventListener('click', ()=>{
      // tiny debounce
      if (now() - lastLaunchClick < 150) return;
      lastLaunchClick = now();
      showPanel();
    });
    D.body.appendChild(l);
    ui.launcher = l;
  }

  function hidePanel(){
    if (!ui.panel) return;
    ui.panel.style.display = 'none';
    ensureLauncher(); ui.launcher.style.display = 'inline-flex';
    localStorage.setItem(KEYS.HIDDEN, '1');
  }

  function showPanel(){
    if (!ui.panel) return;
    ui.panel.style.display = 'block';
    if (ui.launcher) ui.launcher.style.display = 'none';
    localStorage.setItem(KEYS.HIDDEN, '0');

    // If no saved pos, dock bottom-right away from header
    const pos = readJSON(KEYS.POS, null);
    if (!pos){
      const w = ui.panel.offsetWidth || 340;
      const h = ui.panel.offsetHeight || 220;
      let x = W.innerWidth - w - 16;
      let y = W.innerHeight - h - 16;
      if (isSmall()) y = Math.max(96, y);
      position(ui.panel, x, y);
    }
  }

  function attachDrag(){
    if (!ui.panel) return;
    ui.handle = ui.panel.querySelector(HANDLE_SEL) || ui.panel;

    // Handle-only: capture pointer on handle
    ui.handle.style.touchAction = 'none';
    ui.handle.style.cursor = 'move';

    ui.handle.addEventListener('pointerdown', (e)=>{
      try{ ui.handle.setPointerCapture(e.pointerId); }catch{}
      state.dragging = true;
      state.offsetX = e.clientX - ui.panel.offsetLeft;
      state.offsetY = e.clientY - ui.panel.offsetTop;
      e.preventDefault();
      e.stopPropagation();
    });

    W.addEventListener('pointermove', (e)=>{
      if (!state.dragging) return;
      const b = bounds(ui.panel);
      let x = e.clientX - state.offsetX;
      let y = e.clientY - state.offsetY;
      x = clamp(x, b.minLeft, b.maxLeft);
      y = clamp(y, b.minTop,  b.maxTop);
      ui.panel.style.left = x + 'px';
      ui.panel.style.top  = y + 'px';
    }, { passive:false });

    W.addEventListener('pointerup', (e)=>{
      if (!state.dragging) return;
      state.dragging = false;
      try{ ui.handle.releasePointerCapture(e.pointerId); }catch{}
      writeJSON(KEYS.POS, { left: parseInt(ui.panel.style.left||'16'), top: parseInt(ui.panel.style.top||'96') });
    });

    W.addEventListener('resize', ()=>{
      const pos = readJSON(KEYS.POS, null);
      if (pos) position(ui.panel, pos.left, pos.top);
    });
  }

  function init(){
    ui.panel = D.querySelector(PANEL_SEL);
    if (!ui.panel) return;

    Object.assign(ui.panel.style, {
      position: 'fixed',
      zIndex: String(ZTOP)
    });

    const saved = readJSON(KEYS.POS, null);
    if (saved) {
      position(ui.panel, saved.left, saved.top);
    } else {
      // Default docking: bottom-right; keep away from header on small screens
      const w = ui.panel.offsetWidth || 340;
      const h = ui.panel.offsetHeight || 220;
      let x = W.innerWidth - w - 16;
      let y = W.innerHeight - h - 16;
      if (isSmall()) y = Math.max(96, y);
      position(ui.panel, x, y);
    }

    attachDrag();
    ensureHideButton();

    // Restore hidden state
    const hidden = localStorage.getItem(KEYS.HIDDEN) === '1';
    if (hidden) { hidePanel(); } else { showPanel(); }
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, { once:true });
  else init();

  // If panel is injected later by the app, allow re-init
  W.addEventListener('mshare-voice:panel-ready', init);
})();
