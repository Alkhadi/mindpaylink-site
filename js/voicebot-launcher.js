(() => {
  const LS_HIDDEN = 'mshare_voicebot_hidden_v1';
  const LS_POS = 'mshare_voicebot_pos_v1';
  const PANEL_SEL = '.voice-assistant, #voiceAssistant, [data-role="voice-assistant"]';
  const BTN_HIDE_ID = 'mshareVoiceHideBtn';
  const BTN_LAUNCH_ID = 'mshareVoiceLauncher';
  let panel, launcher, offset = {x:0,y:0}, drag = false, pos={x:40,y:40};

  const restore = () => {
    const st = localStorage.getItem(LS_HIDDEN);
    const ps = localStorage.getItem(LS_POS);
    if (ps) { try{pos=JSON.parse(ps);}catch{} }
    panel = document.querySelector(PANEL_SEL);
    if (!panel) return;
    Object.assign(panel.style,{
      position:'fixed', top:pos.y+'px', left:pos.x+'px', zIndex:9999, touchAction:'none'
    });
    makeDraggable(panel);
    if (st==='1') hidePanel(); else showPanel();
  };

  const hidePanel = () => {
    if (!panel) return;
    panel.style.display='none';
    if (!launcher){
      launcher=document.createElement('button');
      launcher.id=BTN_LAUNCH_ID;
      launcher.textContent='🎤 Voice';
      Object.assign(launcher.style,{
        position:'fixed', bottom:'1rem', right:'1rem', zIndex:9999,
        borderRadius:'50%', padding:'0.8rem', background:'#115E84', color:'#fff',
        border:'none', cursor:'pointer'
      });
      launcher.addEventListener('click', ()=>{ localStorage.setItem(LS_HIDDEN,'0'); showPanel(); });
      document.body.appendChild(launcher);
    }
    localStorage.setItem(LS_HIDDEN,'1');
  };

  const showPanel = () => {
    if (panel) panel.style.display='block';
    if (launcher) launcher.remove();
    localStorage.setItem(LS_HIDDEN,'0');
  };

  const makeDraggable = el => {
    el.addEventListener('pointerdown', e => {
      drag = true; offset.x = e.clientX - el.offsetLeft; offset.y = e.clientY - el.offsetTop;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      let x = e.clientX - offset.x, y = e.clientY - offset.y;
      x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x));
      y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y));
      el.style.left = x + 'px'; el.style.top = y + 'px';
    });
    el.addEventListener('pointerup', e => {
      drag=false; el.releasePointerCapture(e.pointerId);
      pos={x:parseInt(el.style.left),y:parseInt(el.style.top)};
      localStorage.setItem(LS_POS, JSON.stringify(pos));
    });
  };

  window.addEventListener('DOMContentLoaded', ()=>{
    restore();
    const btn = document.createElement('button');
    btn.id = BTN_HIDE_ID; btn.textContent='Hide';
    Object.assign(btn.style,{marginLeft:'0.5rem',background:'#A8A9C6',color:'#111'});
    btn.addEventListener('click', hidePanel);
    if (panel) panel.appendChild(btn);
  });
})();
