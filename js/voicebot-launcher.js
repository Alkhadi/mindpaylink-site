(()=>{"use strict";
const LS_HIDDEN="mshare_voicebot_hidden_v1";
const LS_POS="mshare_voicebot_pos_v1";
const PANEL_ID="mshare-voicebot";
const SEL_PANEL="#"+PANEL_ID+", .mshare-voicebot, .voice-assistant, #voiceAssistant, [data-role='voice-assistant']";
const LAUNCH_ID="mshareVoiceLauncherBtn";
const HIDE_BTN_ID="mshareVoiceHideBtn";
const NAV_QUERY="header, .site-header, nav";
const HAMBURGER_QUERY=".hamburger, .menu-toggle, button[aria-label*=menu i], [aria-controls*=nav i]";

let panel=null, launcher=null, dragging=false, dx=0, dy=0;

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function savePos(el){const l=parseInt(el.style.left||"16",10)||16;const t=parseInt(el.style.top||"16",10)||16;localStorage.setItem(LS_POS, JSON.stringify({left:l, top:t}));}
function loadPos(){try{return JSON.parse(localStorage.getItem(LS_POS)||"");}catch{return null;}}

function bounds(el){const w=window.innerWidth,h=window.innerHeight,r=el.getBoundingClientRect();return{minL:4,minT:4,maxL:Math.max(4,w-r.width-4),maxT:Math.max(4,h-r.height-4)};}
function position(el,l,t){const b=bounds(el);el.style.left=clamp(l,b.minL,b.maxL)+"px";el.style.top=clamp(t,b.minT,b.maxT)+"px";el.style.right="auto";el.style.bottom="auto";savePos(el);}

function overlaps(a,b){ if(!a||!b) return false; return !(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom); }
function avoidNav(el){
  const r=el.getBoundingClientRect();
  const nav=document.querySelector(NAV_QUERY)?.getBoundingClientRect()||null;
  const ham=document.querySelector(HAMBURGER_QUERY)?.getBoundingClientRect()||null;
  let needs=false;

  // avoid header band
  if(nav && r.top < (nav.bottom+8)) needs=true;
  // avoid hamburger zone (usually top-right)
  if(ham && overlaps(r, ham)) needs=true;

  // avoid top-right corner generally on phones
  if(window.innerWidth<=768 && r.top<96 && r.right>(window.innerWidth-120)) needs=true;

  if(needs){
    const x=window.innerWidth - el.offsetWidth  - 16;
    const y=window.innerHeight- el.offsetHeight - 16;
    position(el, x, y);
  }
}

function enableDrag(el){
  const handle=el.querySelector(".mshare-voicebot__handle")||el; // handle-only to prevent accidental grabs
  handle.style.touchAction="none";
  handle.addEventListener("pointerdown",(e)=>{dragging=true;handle.setPointerCapture?.(e.pointerId);
    const r=el.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;});
  handle.addEventListener("pointermove",(e)=>{if(!dragging)return;position(el,e.clientX-dx,e.clientY-dy);});
  const stop=()=>{dragging=false;}; handle.addEventListener("pointerup",stop); handle.addEventListener("pointercancel",stop);
  window.addEventListener("resize",()=>{const l=parseInt(el.style.left||"16",10)||16;const t=parseInt(el.style.top||"16",10)||16;position(el,l,t); avoidNav(el);});
}

function showLauncher(){ if(launcher) return; const btn=document.createElement("button");
  btn.id=LAUNCH_ID; btn.type="button"; btn.textContent="🎤 Voice"; btn.setAttribute("aria-label","Open Voice Assistant");
  Object.assign(btn.style,{position:"fixed",right:"16px",bottom:"16px",zIndex:2147483000,borderRadius:"9999px",padding:"10px 14px",
    border:"1px solid #374151",background:"#111827",color:"#fff",boxShadow:"0 6px 18px rgba(0,0,0,.2)",cursor:"pointer",
    font:"600 14px/1 system-ui,-apple-system,Segoe UI,Roboto"});
  btn.addEventListener("click",()=>{localStorage.setItem(LS_HIDDEN,"0");hideLauncher();showPanel();});
  document.body.appendChild(btn); launcher=btn;
}
function hideLauncher(){ if(launcher){launcher.remove(); launcher=null;} }

function hidePanel(){ if(!panel) return; panel.style.display="none"; localStorage.setItem(LS_HIDDEN,"1"); showLauncher(); }
function showPanel(){ if(!panel) return; panel.style.display=""; localStorage.setItem(LS_HIDDEN,"0"); hideLauncher(); avoidNav(panel); }

function ensureHideButton(){
  if(!panel) return;
  if(panel.querySelector("#"+HIDE_BTN_ID)) return;
  const where=panel.querySelector(".mshare-voicebot__handle")||panel;
  const btn=document.createElement("button");
  btn.id=HIDE_BTN_ID; btn.type="button"; btn.textContent="Hide"; btn.setAttribute("aria-label","Hide Voice Assistant");
  Object.assign(btn.style,{marginLeft:"auto",padding:"6px 10px",borderRadius:"8px",border:"1px solid #e5e7eb",
    background:"#A8A9C6",color:"#111827",font:"600 12px/1 system-ui,-apple-system,Segoe UI,Roboto",cursor:"pointer",flex:"0 0 auto"});
  btn.addEventListener("click",hidePanel);
  // Make sure handle acts as a single-line flex row so Hide is visible
  try{ where.style.display="flex"; where.style.alignItems="center"; where.style.gap="8px"; }catch{}
  where.appendChild(btn);
}

function init(){
  panel=document.querySelector(SEL_PANEL);
  if(!panel) return;
  panel.style.position="fixed";
  panel.style.zIndex=2147483000;

  // default safe spot on phones; otherwise restore last
  const saved=loadPos();
  if(window.innerWidth<=768 && !saved){
    const x=window.innerWidth - (panel.offsetWidth||320) - 16;
    const y=window.innerHeight- (panel.offsetHeight||220) - 16;
    position(panel, Math.max(16,x), Math.max(96,y)); // keep away from header
  }else{
    position(panel, saved?.left??16, saved?.top??96);
  }

  enableDrag(panel);
  ensureHideButton();

  const hidden=localStorage.getItem(LS_HIDDEN)==="1";
  if(hidden) hidePanel(); else showPanel();
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init, {once:true});
else init();

// If the panel is injected after load, allow re-init
window.addEventListener("mshare-voice:panel-ready", init);
})();
