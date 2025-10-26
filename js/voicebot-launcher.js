(()=>{"use strict";
const LS_HIDDEN="mshare_voicebot_hidden_v1";
const LS_POS="mshare_voicebot_pos_v1";
const PANEL_ID="mshare-voicebot";
const SEL_PANEL='#'+PANEL_ID+', .mshare-voicebot, .voice-assistant, #voiceAssistant, [data-role="voice-assistant"]';
const LAUNCH_ID="mshareVoiceLauncherBtn";
const HIDE_BTN_ID="mshareVoiceHideBtn";
let panel=null, launcher=null, dragging=false, dx=0, dy=0;
function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function savePos(el){const l=parseInt(el.style.left||"16",10)||16;const t=parseInt(el.style.top||"16",10)||16;localStorage.setItem(LS_POS, JSON.stringify({left:l, top:t}));}
function loadPos(){try{ return JSON.parse(localStorage.getItem(LS_POS)||""); }catch{return null;}}
function bounds(el){const w=window.innerWidth,h=window.innerHeight,r=el.getBoundingClientRect();return{minL:4,minT:4,maxL:Math.max(4,w-r.width-4),maxT:Math.max(4,h-r.height-4)};}
function position(el,l,t){const b=bounds(el);el.style.left=clamp(l,b.minL,b.maxL)+"px";el.style.top=clamp(t,b.minT,b.maxT)+"px";el.style.right="auto";el.style.bottom="auto";savePos(el);}
function enableDrag(el){const handle=el.querySelector(".mshare-voicebot__handle")||el;handle.style.touchAction="none";
  handle.addEventListener("pointerdown",(e)=>{dragging=true;handle.setPointerCapture?.(e.pointerId);const r=el.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;});
  handle.addEventListener("pointermove",(e)=>{if(!dragging)return;position(el,e.clientX-dx,e.clientY-dy);});
  const stop=()=>{dragging=false;};handle.addEventListener("pointerup",stop);handle.addEventListener("pointercancel",stop);
  window.addEventListener("resize",()=>{const l=parseInt(el.style.left||"16",10)||16;const t=parseInt(el.style.top||"16",10)||16;position(el,l,t);});
}
function showLauncher(){ if(launcher) return; const btn=document.createElement("button"); btn.id=LAUNCH_ID; btn.type="button"; btn.textContent="🎤 Voice";
  Object.assign(btn.style,{position:"fixed",right:"16px",bottom:"16px",zIndex:2147483000,borderRadius:"9999px",padding:"10px 14px",border:"1px solid #374151",
  background:"#111827",color:"#fff",boxShadow:"0 6px 18px rgba(0,0,0,.2)",cursor:"pointer",font:"600 14px/1 system-ui,-apple-system,Segoe UI,Roboto"});
  btn.addEventListener("click",()=>{localStorage.setItem(LS_HIDDEN,"0");hideLauncher();showPanel();});document.body.appendChild(btn);launcher=btn;}
function hideLauncher(){ if(launcher){ launcher.remove(); launcher=null; } }
function hidePanel(){ if(!panel) return; panel.style.display="none"; localStorage.setItem(LS_HIDDEN,"1"); showLauncher(); }
function showPanel(){ if(!panel) return; panel.style.display=""; localStorage.setItem(LS_HIDDEN,"0"); hideLauncher(); }
function ensureHideButton(){ if(!panel) return; if(panel.querySelector("#"+HIDE_BTN_ID)) return;
  const where=panel.querySelector(".mshare-voicebot__handle")||panel; const btn=document.createElement("button"); btn.id=HIDE_BTN_ID; btn.type="button"; btn.textContent="Hide";
  Object.assign(btn.style,{marginLeft:"auto",padding:"6px 10px",borderRadius:"8px",border:"1px solid #e5e7eb",background:"#A8A9C6",color:"#111827",font:"600 12px/1 system-ui,-apple-system,Segoe UI,Roboto",cursor:"pointer"});
  btn.addEventListener("click",hidePanel); where.appendChild(btn);
}
function init(){ panel=document.querySelector(SEL_PANEL); if(!panel) return;
  panel.style.position="fixed"; panel.style.zIndex=2147483000; const pos=loadPos(); const l=pos?.left??16, t=pos?.top??16; position(panel,l,t);
  enableDrag(panel); ensureHideButton(); const hidden=localStorage.getItem(LS_HIDDEN)==="1"; if(hidden) hidePanel(); else showPanel();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
window.addEventListener("mshare-voice:panel-ready", init);
})();
