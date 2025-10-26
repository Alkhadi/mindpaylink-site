/* __mshare_va_v3__ */
(function(){ if(window.__mshareV3) return; window.__mshareV3=true;
  var KEYS={pos:"va_pos_v6", hidden:"va_hidden_v3"};
  var MIN_TOP=96, THR=120;
  var q=function(s,c){return (c||document).querySelector(s)};
  var R=function(el){return el?el.getBoundingClientRect():null};
  var overlap=function(a,b){return a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)};
  var header=function(){return q("header, .site-header, #header2025, #mainNav, nav[role=\"navigation\"]")};
  var burger=function(){return q("#navToggle, .nav-toggle, [data-nav-toggle], .hamburger, .menu-btn, .nav-button, button[aria-controls*=\"nav\"]")};
  var findPanel=function(){return q("#mshare-voicebot, .mshare-voicebot, #voiceAssistant, #voice-coach, .voice-assistant, .voice-coach, .voice-coach-pro, [data-voice-coach], #mplVoiceAssistant")};
  /* ---- TTS unlock ---- */
  var unlocked=false, audioCtx=null;
  function unlockAudio(){
    if(unlocked) return; unlocked=true;
    try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC){ audioCtx=new AC(); var osc=audioCtx.createOscillator(); var g=audioCtx.createGain(); g.gain.value=0; osc.connect(g).connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime+0.01);} }catch(e){}
    try{ if(window.speechSynthesis){ window.speechSynthesis.resume(); window.speechSynthesis.getVoices(); } }catch(e){}
  }
  function wireUnlockers(root){
    ["click","touchstart","pointerdown"].forEach(function(ev){ document.addEventListener(ev, unlockAudio, {once:true, passive:true}); });
    var btns=(root||document).querySelectorAll("[data-voice-action=\"start\"],[data-voice-action=\"resume\"]");
    btns.forEach(function(b){ b.addEventListener("click", unlockAudio, {once:true}); b.addEventListener("touchstart", unlockAudio, {once:true, passive:true}); });
  }
  /* ---- Toggle controls ---- */
  function ensureToggle(){ var t=q("#vaToggle"); if(!t){ t=document.createElement("button"); t.id="vaToggle"; t.type="button"; t.textContent="Voice"; document.body.appendChild(t); } return t; }
  function ensureInternalHide(panel){ var b=panel.querySelector("#vaHideShow"); if(!b){ b=document.createElement("button"); b.id="vaHideShow"; b.type="button"; b.className="mshare-voicebot__btn"; b.textContent="Hide";
      var handle=panel.querySelector(".mshare-voicebot__handle")||panel.firstElementChild||panel; handle.appendChild(b); } return b; }
  /* ---- Positioning ---- */
  function defaultAtToggle(panel, toggle){
    panel.classList.add("va-docked");
    var tr=R(toggle); panel.hidden=false; panel.style.visibility="hidden";
    requestAnimationFrame(function(){
      var pr=R(panel);
      var left = tr.right - pr.width; var top = tr.bottom - pr.height;
      if(left<8) left=8; if(left>innerWidth-pr.width-8) left=innerWidth-pr.width-8;
      var hb=header()? (R(header()).bottom + window.scrollY) : MIN_TOP; var minTop=Math.max(MIN_TOP, hb - window.scrollY + 8);
      if(top<minTop) top=minTop; if(top>innerHeight-pr.height-16) top=innerHeight-pr.height-16;
      panel.style.left=left+"px"; panel.style.top=top+"px"; panel.style.right="auto"; panel.style.bottom="auto"; panel.style.visibility="visible";
    });
  }
  function restoreIfSafe(panel){
    var s=null; try{s=JSON.parse(localStorage.getItem(KEYS.pos)||"null");}catch(e){}
    if(!s || !isFinite(s.left) || !isFinite(s.top)) return false;
    panel.style.left=s.left+"px"; panel.style.top=s.top+"px"; panel.style.right="auto"; panel.style.bottom="auto"; panel.classList.remove("va-docked");
    var pr=R(panel), hr=R(header()), br=R(burger());
    if(overlap(pr,hr)||overlap(pr,br) || pr.top < (MIN_TOP-8)) return false;
    return true;
  }
  function clamp(panel){
    var r=R(panel); if(!r) return;
    var nx=Math.min(Math.max(8,r.left), innerWidth - r.width - 8);
    var hb=header()? (R(header()).bottom + window.scrollY) : MIN_TOP; var minTop=Math.max(MIN_TOP, hb - window.scrollY + 8);
    var ny=Math.min(Math.max(minTop,r.top), innerHeight - r.height - 16);
    panel.style.left=nx+"px"; panel.style.top=ny+"px";
  }
  var docking=false, lastDock=0;
  function safeDock(panel, toggle, opts){
    var now=performance.now(); if(docking || (now-lastDock)<THR){ clearTimeout(safeDock._t); safeDock._t=setTimeout(function(){safeDock(panel,toggle,opts||{});}, THR); return; }
    docking=true;
    requestAnimationFrame(function(){
      if(!(opts&&opts.respectSaved && restoreIfSafe(panel))) defaultAtToggle(panel, toggle);
      var pr=R(panel), hr=R(header()), br=R(burger());
      if(overlap(pr,hr)||overlap(pr,br)) defaultAtToggle(panel, toggle);
      clamp(panel);
      lastDock=performance.now(); docking=false;
    });
  }
  /* ---- Drag & persist (pointer) ---- */
  function makeDraggable(panel){
    var handle=panel.querySelector(".mshare-voicebot__handle")||panel; handle.style.touchAction="none";
    var drag=false,sx=0,sy=0,ox=0,oy=0;
    handle.addEventListener("pointerdown",function(e){
      handle.setPointerCapture&&handle.setPointerCapture(e.pointerId);
      var r=R(panel); ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY; drag=true;
    });
    handle.addEventListener("pointermove",function(e){
      if(!drag) return; panel.style.left=(ox+(e.clientX-sx))+"px"; panel.style.top=(oy+(e.clientY-sy))+"px"; panel.style.right="auto"; panel.style.bottom="auto"; clamp(panel);
    });
    function up(e){
      if(!drag) return; drag=false; var pr=R(panel), hr=R(header()), br=R(burger());
      if(overlap(pr,hr)||overlap(pr,br) || pr.top<(MIN_TOP-8)){ var t=ensureToggle(); safeDock(panel,t,{respectSaved:false}); try{localStorage.removeItem(KEYS.pos);}catch(e){} }
      else { try{localStorage.setItem(KEYS.pos, JSON.stringify({left:pr.left, top:pr.top}));}catch(e){} panel.classList.remove("va-docked"); }
      handle.releasePointerCapture&&handle.releasePointerCapture(e.pointerId);
    }
    handle.addEventListener("pointerup",up);
    handle.addEventListener("pointercancel",up);
  }
  /* ---- Show/Hide wiring ---- */
  function showPanel(panel,toggle){ panel.hidden=false; toggle.style.display="none"; ensureInternalHide(panel).textContent="Hide"; safeDock(panel,toggle,{respectSaved:true}); }
  function hidePanel(panel,toggle){ panel.hidden=true; toggle.style.display=""; try{localStorage.setItem(KEYS.hidden,"1");}catch(e){} }
  function wire(panel){
    panel.style.removeProperty("inset"); panel.style.zIndex="9998";
    var toggle=ensureToggle();
    var hideBtn=ensureInternalHide(panel); hideBtn.onclick=function(){ hidePanel(panel,toggle); };
    toggle.onclick=function(){ try{localStorage.setItem(KEYS.hidden,"0");}catch(e){} showPanel(panel,toggle); };
    var wasHidden=(localStorage.getItem(KEYS.hidden)==="1"); if(wasHidden){ hidePanel(panel,toggle); } else { showPanel(panel,toggle); }
    makeDraggable(panel); wireUnlockers(panel);
    addEventListener("resize",function(){ safeDock(panel,toggle,{respectSaved:true}); });
    addEventListener("orientationchange",function(){ safeDock(panel,toggle,{respectSaved:true}); });
    var reset=panel.querySelector("[data-voice-action=\"reset-pos\"]"); if(reset){ reset.addEventListener("click", function(){ try{localStorage.removeItem(KEYS.pos);}catch(e){} safeDock(panel,toggle,{respectSaved:false}); }); }
  }
  function init(){ var p=findPanel(); if(!p) return; if(p.__vaV3) return; p.__vaV3=true; wire(p); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
  new MutationObserver(function(){ var p=findPanel(); if(p) init(); }).observe(document.documentElement,{childList:true,subtree:true});
})();