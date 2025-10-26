(()=>{ "use strict";
const LS_HIDDEN='mshare_voicebot_hidden_v1';
const LS_POS='mshare_voicebot_pos_v1';
const PANEL_SEL='#mshare-voicebot, .mshare-voicebot';
const HANDLE_SEL='.mshare-voicebot__handle';
const BTN_HIDE_ID='mshareVoiceHideBtn';
const BTN_LAUNCH_ID='mshareVoiceLauncher';
const Z=2147483000;
const SAFE_TOP=96; // keep away from header/hamburger area

let panel, handle, launcher, dragging=false, offX=0, offY=0;

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function savePos(l,t){ localStorage.setItem(LS_POS, JSON.stringify({left:l, top:t})); }
function readPos(){ try{ return JSON.parse(localStorage.getItem(LS_POS)||''); }catch{ return null; } }

function ensureLauncher(){
  if(launcher && document.body.contains(launcher)) return launcher;
  launcher = document.createElement('button');
  launcher.id=BTN_LAUNCH_ID;
  launcher.type='button';
  launcher.textContent='🎤 Voice';
  Object.assign(launcher.style,{
    position:'fixed',right:'16px',bottom:'16px',zIndex:Z, border:'none',
    borderRadius:'999px', padding:'10px 14px', fontWeight:'700',
    boxShadow:'0 6px 16px rgba(0,0,0,.2)', cursor:'pointer',
    background:'#115E84', color:'#fff'
  });
  launcher.addEventListener('click', ()=>{ localStorage.setItem(LS_HIDDEN,'0'); showPanel(); });
  document.body.appendChild(launcher);
  return launcher;
}
function removeLauncher(){ if(launcher){ try{ launcher.remove(); }catch{} } }

function placeDefault(panelEl){
  const r = panelEl.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const left = clamp(vw - (r.width||320) - 16, 8, Math.max(8, vw- (r.width||320) - 8));
  const top  = clamp(vh - (r.height||220) - 16, SAFE_TOP, Math.max(SAFE_TOP, vh- (r.height||220) - 16));
  panelEl.style.left = left+'px';
  panelEl.style.top  = top+'px';
  savePos(left, top);
}
function applySaved(panelEl){
  const pos = readPos();
  if(pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)){
    const vw=innerWidth,vh=innerHeight;
    const r = panelEl.getBoundingClientRect();
    const left = clamp(pos.left, 8, Math.max(8, vw-(r.width||320)-8));
    const top  = clamp(pos.top,  SAFE_TOP, Math.max(SAFE_TOP, vh-(r.height||220)-8));
    panelEl.style.left = left+'px';
    panelEl.style.top  = top+'px';
    savePos(left, top);
  } else {
    placeDefault(panelEl);
  }
}

function showPanel(){
  if(!panel) return;
  panel.style.display='block';
  removeLauncher();
  localStorage.setItem(LS_HIDDEN,'0');
}
function hidePanel(){
  if(!panel) return;
  panel.style.display='none';
  ensureLauncher();
  localStorage.setItem(LS_HIDDEN,'1');
}

function addHideButton(){
  if(!handle) return;
  if(document.getElementById(BTN_HIDE_ID)) return;
  const btn=document.createElement('button');
  btn.id=BTN_HIDE_ID;
  btn.type='button';
  btn.textContent='Hide';
  btn.setAttribute('aria-label','Hide voice assistant panel');
  Object.assign(btn.style,{ marginLeft:'auto', background:'#A8A9C6', color:'#111', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'6px 10px', fontWeight:'600', cursor:'pointer' });
  btn.addEventListener('click', hidePanel);
  handle.appendChild(btn);
}

function onPointerDown(e){
  if(!panel) return;
  dragging=true;
  const r = panel.getBoundingClientRect();
  offX = e.clientX - r.left;
  offY = e.clientY - r.top;
  try{ e.target.setPointerCapture(e.pointerId); }catch{}
  e.preventDefault();
}
function onPointerMove(e){
  if(!dragging || !panel) return;
  const w=innerWidth,h=innerHeight, r = panel.getBoundingClientRect();
  let x = clamp(e.clientX - offX, 8, Math.max(8, w - r.width - 8));
  let y = clamp(e.clientY - offY, SAFE_TOP, Math.max(SAFE_TOP, h - r.height - 8));
  panel.style.left = x+'px';
  panel.style.top  = y+'px';
}
function onPointerUp(e){
  if(!dragging) return;
  dragging=false;
  if(panel){
    const l=parseInt(panel.style.left||'0',10), t=parseInt(panel.style.top||'0',10);
    savePos(l,t);
  }
  try{ e.target.releasePointerCapture(e.pointerId); }catch{}
}

function init(){
  panel = document.querySelector(PANEL_SEL);
  if(!panel) return;

  // Base styles & stacking
  panel.style.position='fixed';
  panel.style.zIndex=String(Z);
  panel.style.right='auto'; panel.style.bottom='auto';
  panel.style.touchAction='none'; // allow pointer drag on handle

  handle = panel.querySelector(HANDLE_SEL) || panel.firstElementChild || panel;
  if(handle){ handle.style.cursor='grab'; }

  // Ensure positioned safely
  applySaved(panel);
  window.addEventListener('resize', ()=>applySaved(panel));

  // Handle-only drag (avoid grabbing hamburger)
  if(handle){
    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  addHideButton();

  // Restore hidden/visible
  const hidden = localStorage.getItem(LS_HIDDEN)==='1';
  if(hidden) hidePanel(); else showPanel();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
else init();

// If panel injected later:
window.addEventListener('mshare-voice:panel-ready', init);
})();
