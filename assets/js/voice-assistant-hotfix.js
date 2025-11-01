(function(){
  const panel=document.getElementById("mshare-voicebot"); if(!panel) return;
  panel.style.position="fixed";
  const LS_POS="mshare_va_pos_v1", LS_VISIBLE="mshare_va_visible_v1";
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const setPos=(x,y)=>{panel.style.left=x+"px"; panel.style.top=y+"px";};
  function restorePos(){
    let pos=null; try{pos=JSON.parse(localStorage.getItem(LS_POS)||"null");}catch{}
    const r=panel.getBoundingClientRect(), W=innerWidth, H=innerHeight;
    let x=pos?.x ?? (W-r.width-16), y=pos?.y ?? (H-r.height-16);
    setPos(clamp(x,8,Math.max(8,W-r.width-8)), clamp(y,8,Math.max(8,H-r.height-8)));
  }
  // hide/show
  let visible=(localStorage.getItem(LS_VISIBLE)??"1")==="1";
  const toggle=document.createElement("button");
  toggle.className="mshare-voicebot__toggle";
  function paint(){toggle.textContent=visible?"Hide voice":"Show voice";toggle.setAttribute("aria-pressed",visible?"true":"false");}
  paint();
  toggle.addEventListener("click",()=>{visible=!visible;localStorage.setItem(LS_VISIBLE,visible?"1":"0");panel.classList.toggle("mshare-voicebot--hidden",!visible);paint();});
  document.body.appendChild(toggle);
  if(!visible) panel.classList.add("mshare-voicebot--hidden");
  // drag bounds
  const handle=panel.querySelector(".mshare-voicebot__handle"); if(handle){
    let sx=0,sy=0,ox=0,oy=0,drag=false;
    const start=e=>{const t=e.touches?e.touches[0]:e; drag=true; const r=panel.getBoundingClientRect(); sx=t.clientX; sy=t.clientY; ox=r.left; oy=r.top; e.preventDefault();};
    const move=e=>{if(!drag) return; const t=e.touches?e.touches[0]:e; const W=innerWidth,H=innerHeight, r=panel.getBoundingClientRect(); let x=ox+(t.clientX-sx), y=oy+(t.clientY-sy); x=clamp(x,8,Math.max(8,W-r.width-8)); y=clamp(y,8,Math.max(8,H-r.height-8)); setPos(x,y);};
    const end=()=>{if(!drag) return; drag=false; const r=panel.getBoundingClientRect(); localStorage.setItem(LS_POS,JSON.stringify({x:r.left,y:r.top}));};
    handle.addEventListener("pointerdown",start); addEventListener("pointermove",move); addEventListener("pointerup",end);
    handle.addEventListener("touchstart",start,{passive:false}); addEventListener("touchmove",move,{passive:false}); addEventListener("touchend",end);
  }
  const reset=panel.querySelector('[data-voice-action="reset-pos"]'); if(reset){reset.addEventListener("click",()=>{localStorage.removeItem(LS_POS); restorePos();});}
  restorePos(); addEventListener("resize",restorePos);
})();
