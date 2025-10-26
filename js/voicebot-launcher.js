(()=>{'use strict';
const D=document,W=window;
const PANEL_ID='mshare-voicebot';
const LAUNCH_ID='mshareVoiceLauncher';
const STYLE_ID='mshare-va-launcher-inline';
const LS_HIDDEN='mshare_voicebot_hidden_v1';
const LS_POS='mshare_voicebot_pos_v1';
const MIN_TOP=96, PAD=16, Z=2147483000;

function $(sel,ctx=D){return ctx.querySelector(sel)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function ensureStyles(){
  if(D.getElementById(STYLE_ID)) return;
  const s=D.createElement('style'); s.id=STYLE_ID;
  s.textContent=`
  #${PANEL_ID}{position:fixed!important; z-index:2147483000!important; touch-action:none}
  #${PANEL_ID} .mshare-voicebot__handle{cursor:move}
  #${PANEL_ID} .mshare-voicebot__btn{color:#111827!important; font-weight:600}
  #${PANEL_ID} .mshare-voicebot__btn[data-voice-action="start"]{color:#fff!important}
  #${PANEL_ID} [data-voice-action="hide"]{
    margin-left:.5rem; background:#A8A9C6; color:#111; border:1px solid rgba(0,0,0,.12);
    padding:.4rem .6rem; border-radius:10px
  }
  #${LAUNCH_ID}{
    position:fixed; right:${PAD}px; bottom:${PAD}px; z-index:2147483000;
    border:none; border-radius:999px; padding:.7rem .9rem;
    font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
    background:#115E84; color:#fff; box-shadow:0 6px 24px rgba(0,0,0,.18); cursor:pointer
  }`;
  D.head.appendChild(s);
}

function panelEl(){return D.getElementById(PANEL_ID) || D.querySelector('.mshare-voicebot')}
function savePos(L,T){try{localStorage.setItem(LS_POS,JSON.stringify({left:L,top:T}))}catch{}}

function position(panel,left,top){
  const r=panel.getBoundingClientRect();
  const maxL=W.innerWidth - r.width - PAD;
  const maxT=W.innerHeight - r.height - PAD;
  const L=clamp(left, PAD, Math.max(PAD,maxL));
  const T=clamp(top , MIN_TOP, Math.max(MIN_TOP,maxT));
  panel.style.left=L+'px'; panel.style.top=T+'px';
  panel.style.right='auto'; panel.style.bottom='auto';
  savePos(L,T);
}

function initialDock(panel){
  let saved=null; try{saved=JSON.parse(localStorage.getItem(LS_POS)||'null')}catch{}
  if(saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)){ position(panel,saved.left,saved.top); return; }
  const r=panel.getBoundingClientRect();
  const x=W.innerWidth - (r.width||320) - PAD;
  const y=W.innerHeight - (r.height||220) - PAD;
  if (W.matchMedia('(max-width: 768px)').matches){
    position(panel, Math.max(PAD,x), Math.max(MIN_TOP,y));
  } else {
    position(panel, PAD, Math.max(MIN_TOP, PAD*6));
  }
}

function makeHandleDrag(panel){
  const handle=panel.querySelector('.mshare-voicebot__handle')||panel.firstElementChild||panel;
  let dragging=false,sx=0,sy=0,sl=0,st=0;
  handle.addEventListener('pointerdown',e=>{
    dragging=true; handle.setPointerCapture?.(e.pointerId);
    const rr=panel.getBoundingClientRect(); sx=e.clientX; sy=e.clientY; sl=rr.left; st=rr.top; e.preventDefault();
  });
  W.addEventListener('pointermove',e=>{ if(!dragging) return; position(panel, sl+(e.clientX-sx), st+(e.clientY-sy)); });
  W.addEventListener('pointerup',e=>{ if(!dragging) return; dragging=false; try{handle.releasePointerCapture?.(e.pointerId)}catch{} });
}

function ensureHideShow(panel){
  if(!panel.querySelector('[data-voice-action="hide"]')){
    const b=D.createElement('button'); b.type='button'; b.className='mshare-voicebot__btn'; b.textContent='Hide';
    b.setAttribute('data-voice-action','hide');
    (panel.querySelector('.mshare-voicebot__handle')||panel.firstElementChild||panel).appendChild(b);
    b.addEventListener('click', hidePanel);
  }
  if(!D.getElementById(LAUNCH_ID)){
    const l=D.createElement('button'); l.id=LAUNCH_ID; l.type='button'; l.textContent='🎤 Voice'; l.style.display='none';
    l.addEventListener('click', showPanel); D.body.appendChild(l);
  }
}

function hidePanel(){
  const p=panelEl(); if(!p) return; p.style.display='none';
  const l=D.getElementById(LAUNCH_ID); if(l) l.style.display='inline-block';
  try{localStorage.setItem(LS_HIDDEN,'1')}catch{}
}
function showPanel(){
  const p=panelEl(); if(!p) return; initialDock(p); p.style.display='block';
  const l=D.getElementById(LAUNCH_ID); if(l) l.style.display='none';
  try{localStorage.setItem(LS_HIDDEN,'0')}catch{}
}

function init(){
  ensureStyles();
  const p=panelEl(); if(!p) return;
  p.style.position='fixed'; p.style.zIndex='2147483000';
  if(!p.style.top || !p.style.left) initialDock(p);
  makeHandleDrag(p); ensureHideShow(p);
  const hidden = (localStorage.getItem(LS_HIDDEN)==='1'); hidden?hidePanel():showPanel();
  W.addEventListener('resize',()=>{const x=panelEl(); if(!x) return; const r=x.getBoundingClientRect(); position(x,r.left,r.top);});
  try{W.dispatchEvent(new CustomEvent('mshare-voice:panel-ready'))}catch{}
}
if(D.readyState==='loading'){D.addEventListener('DOMContentLoaded',init,{once:true})} else {init()}
W.addEventListener('mshare-voice:reinit', init);
})();