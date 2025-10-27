/* __mshare_va_v3_4__ */
(function(){ if(window.__mshareV3_4) return; window.__mshareV3_4=true;
  var KEYS={pos:"va_pos_v10", hidden:"va_hidden_v3_4", muted:"va_muted_v3_4"};
  var MIN_TOP=96, THR=90;
  var q=function(s,c){return (c||document).querySelector(s)};
  var R=function(el){return el?el.getBoundingClientRect():null};
  var overlap=function(a,b){return a&&b&&!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom)};
  var header=function(){return q("header, .site-header, #header2025, #mainNav, nav[role=\"navigation\"]")};
  var burger=function(){return q("#navToggle, .nav-toggle, [data-nav-toggle], .hamburger, .menu-btn, .nav-button, button[aria-controls*=\"nav\"]")};
  var findPanel=function(){return q("#mshare-voicebot, .mshare-voicebot, #voiceAssistant, #voice-coach, .voice-assistant, .voice-coach, .voice-coach-pro, [data-voice-coach], #mplVoiceAssistant")};
  var insidePanel=function(el){var p=findPanel(); return p? p.contains(el) : false;};
  /* ---- state ---- */
  var VA={ muted:true, pageActive:false, voiceName:"Daniel", voiceLang:"en-GB", rate:1, pitch:1, get synth(){return window.speechSynthesis} };
  try{ VA.muted = (localStorage.getItem(KEYS.muted)!=="0"); }catch(e){}
  /* ---- mobile TTS unlock ---- */
  var unlocked=false, audioCtx=null;
  function unlockAudio(){ if(unlocked) return; unlocked=true; try{ var AC=window.AudioContext||window.webkitAudioContext; if(AC){ audioCtx=new AC(); var osc=audioCtx.createOscillator(); var g=audioCtx.createGain(); g.gain.value=0; osc.connect(g).connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime+0.01);} }catch(e){} try{ window.speechSynthesis&&window.speechSynthesis.resume(); }catch(e){} }
  /* ---- Daniel -> en-GB -> en* ---- */
  function chooseVoice(){
    var list=(window.speechSynthesis&&window.speechSynthesis.getVoices&&window.speechSynthesis.getVoices())||[];
    var v=list.find(function(v){return /Daniel/i.test(v.name)})||list.find(function(v){return /^en-GB/i.test(v.lang)})||list.find(function(v){return /^en/i.test(v.lang)});
    if(v){ VA.voiceName=v.name; VA.voiceLang=v.lang; }
    var sel=q("#mshare-voice-voice"); if(sel){ var opt=[].slice.call(sel.options).find(function(o){return /Daniel\b/.test(o.text)||/\(en-GB\)/.test(o.text)}); if(opt) sel.value=opt.value; }
  }
  if(window.speechSynthesis){ chooseVoice(); window.speechSynthesis.onvoiceschanged=chooseVoice; setTimeout(chooseVoice, 800); }
  function utter(text){ var u=new SpeechSynthesisUtterance(text); u.lang=VA.voiceLang||"en-GB"; try{ var vs=window.speechSynthesis.getVoices&&window.speechSynthesis.getVoices(); u.voice=vs&&vs.find(function(v){return v.name===VA.voiceName})||null; }catch(e){} u.rate=VA.rate; u.pitch=VA.pitch; return u; }
  function speak(text){ if(VA.muted||VA.pageActive) return; try{ VA.synth.cancel(); unlockAudio(); VA.synth.speak(utter(text)); }catch(e){} }
  function stopSpeak(){ try{ VA.synth&&VA.synth.cancel(); }catch(e){} }
  /* ---- toggles ---- */
  function ensureToggle(){ var t=q("#vaToggle"); if(!t){ t=document.createElement("button"); t.id="vaToggle"; t.type="button"; t.textContent="Voice"; document.body.appendChild(t);} return t; }
  function ensureInternalHide(panel){ var b=panel.querySelector("#vaHideShow"); if(!b){ b=document.createElement("button"); b.id="vaHideShow"; b.type="button"; b.className="mshare-voicebot__btn"; b.textContent="Hide"; var h=panel.querySelector(".mshare-voicebot__handle")||panel.firstElementChild||panel; h.appendChild(b);} return b; }
  /* ---- docking / show-at-button ---- */
  function defaultAtToggle(panel,toggle){ panel.classList.add("va-docked"); var tr=R(toggle); panel.hidden=false; panel.style.visibility="hidden"; requestAnimationFrame(function(){ var pr=R(panel); var left=tr.right-pr.width, top=tr.bottom-pr.height; if(left<8) left=8; if(left>innerWidth-pr.width-8) left=innerWidth-pr.width-8; var hb=header()? (R(header()).bottom+scrollY):MIN_TOP; var minTop=Math.max(MIN_TOP,hb-scrollY+8); if(top<minTop) top=minTop; if(top>innerHeight-pr.height-16) top=innerHeight-pr.height-16; panel.style.left=left+"px"; panel.style.top=top+"px"; panel.style.right="auto"; panel.style.bottom="auto"; panel.style.visibility="visible"; }); }
  function restoreIfSafe(panel){ var s=null; try{s=JSON.parse(localStorage.getItem(KEYS.pos)||"null");}catch(e){} if(!s||!isFinite(s.left)||!isFinite(s.top)) return false; panel.style.left=s.left+"px"; panel.style.top=s.top+"px"; panel.style.right="auto"; panel.style.bottom="auto"; panel.classList.remove("va-docked"); var pr=R(panel),hr=R(header()),br=R(burger()); return !(overlap(pr,hr)||overlap(pr,br)||pr.top<(MIN_TOP-8)); }
  function clamp(panel){ var r=R(panel); if(!r) return; var nx=Math.min(Math.max(8,r.left), innerWidth-r.width-8); var hb=header()? (R(header()).bottom+scrollY):MIN_TOP; var minTop=Math.max(MIN_TOP,hb-scrollY+8); var ny=Math.min(Math.max(minTop,r.top), innerHeight-r.height-16); panel.style.left=nx+"px"; panel.style.top=ny+"px"; }
  var docking=false,lastDock=0;
  function safeDock(panel,toggle,opts){ var now=performance.now(); if(docking||(now-lastDock)<THR){ clearTimeout(safeDock._t); safeDock._t=setTimeout(function(){safeDock(panel,toggle,opts||{});},THR); return;} docking=true; requestAnimationFrame(function(){ if(!(opts&&opts.respectSaved&&restoreIfSafe(panel))) defaultAtToggle(panel,toggle); var pr=R(panel),hr=R(header()),br=R(burger()); if(overlap(pr,hr)||overlap(pr,br)) defaultAtToggle(panel,toggle); clamp(panel); lastDock=performance.now(); docking=false; }); }
  /* ---- precise drag ---- */
  function makeDraggable(panel){ var h=panel.querySelector(".mshare-voicebot__handle")||panel; h.style.touchAction="none"; var drag=false,sx=0,sy=0,ox=0,oy=0; h.addEventListener("pointerdown",function(e){ h.setPointerCapture&&h.setPointerCapture(e.pointerId); var r=R(panel); ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY; drag=true; }); h.addEventListener("pointermove",function(e){ if(!drag) return; var nx=ox+(e.clientX-sx), ny=oy+(e.clientY-sy); panel.style.left=nx+"px"; panel.style.top=ny+"px"; panel.style.right="auto"; panel.style.bottom="auto"; clamp(panel); }); function up(e){ if(!drag) return; drag=false; var pr=R(panel), hr=R(header()), br=R(burger()); if(overlap(pr,hr)||overlap(pr,br)||pr.top<(MIN_TOP-8)){ var t=ensureToggle(); safeDock(panel,t,{respectSaved:false}); try{localStorage.removeItem(KEYS.pos);}catch(x){} } else { try{localStorage.setItem(KEYS.pos, JSON.stringify({left:pr.left, top:pr.top}));}catch(x){} panel.classList.remove("va-docked"); } h.releasePointerCapture&&h.releasePointerCapture(e.pointerId); } h.addEventListener("pointerup",up); h.addEventListener("pointercancel",up); }
  /* ---- visibility & mute ---- */
  function showPanel(panel,toggle){ panel.hidden=false; toggle.style.display="none"; ensureInternalHide(panel).textContent="Hide"; safeDock(panel,toggle,{respectSaved:true}); }
  function hidePanel(panel,toggle){ panel.hidden=true; toggle.style.display=""; }
  /* ---- VA UI wiring ---- */
  function wireVAControls(panel){
    var startBtn=panel.querySelector("[data-voice-action=\"start\"]");
    var pauseBtn=panel.querySelector("[data-voice-action=\"pause\"]");
    var resumeBtn=panel.querySelector("[data-voice-action=\"resume\"]");
    var stopBtn=panel.querySelector("[data-voice-action=\"stop\"]");
    var repeatBtn=panel.querySelector("[data-voice-action=\"repeat\"]");
    var rateInp=panel.querySelector("#mshare-voice-rate");
    var pitchInp=panel.querySelector("#mshare-voice-pitch");
    var sel=panel.querySelector("#mshare-voice-voice");
    startBtn && startBtn.addEventListener("click", function(){ unlockAudio(); VA.muted=false; try{localStorage.setItem(KEYS.muted,"0");}catch(e){} try{VA.synth.cancel(); VA.synth.resume&&VA.synth.resume();}catch(e){} });
    resumeBtn && resumeBtn.addEventListener("click", function(){ unlockAudio(); if(!VA.muted){ try{VA.synth.resume&&VA.synth.resume();}catch(e){} } });
    pauseBtn && pauseBtn.addEventListener("click", function(){ try{VA.synth.pause&&VA.synth.pause();}catch(e){} });
    stopBtn && stopBtn.addEventListener("click", function(){ VA.muted=true; try{localStorage.setItem(KEYS.muted,"1");}catch(e){} stopSpeak(); });
    repeatBtn && repeatBtn.addEventListener("click", function(){ if(!VA.muted) speak("Repeat."); });
    if(rateInp){ rateInp.addEventListener("input", function(){ VA.rate=parseFloat(rateInp.value)||1; }); }
    if(pitchInp){ pitchInp.addEventListener("input", function(){ VA.pitch=parseFloat(pitchInp.value)||1; }); }
    if(sel){ sel.addEventListener("change", function(){ VA.voiceName=sel.value; }); }
  }
  /* ---- Page Start/Stop hard-sync (buttons/links/role=button) ---- */
  function matchStart(btn){ var t=(btn.getAttribute("aria-label")||btn.textContent||"").trim(); return /^start$/i.test(t) || btn.matches("[data-voice=start],[data-voice=play],[data-action=start]"); }
  function matchStop(btn){ var t=(btn.getAttribute("aria-label")||btn.textContent||"").trim(); return /^stop$/i.test(t) || btn.matches("[data-voice=stop],[data-action=stop]"); }
  document.addEventListener("click", function(ev){
    var btn=ev.target&&ev.target.closest&&ev.target.closest("button,[role=button],.btn,a"); if(!btn) return;
    if(insidePanel(btn)) return;
    if(matchStart(btn)){ VA.pageActive=true; VA.muted=true; try{localStorage.setItem(KEYS.muted,"1");}catch(e){} stopSpeak(); document.dispatchEvent(new CustomEvent("mshare:page-start",{bubbles:true})); }
    else if(matchStop(btn)){ VA.pageActive=false; VA.muted=true; try{localStorage.setItem(KEYS.muted,"1");}catch(e){} stopSpeak(); document.dispatchEvent(new CustomEvent("mshare:page-stop",{bubbles:true})); }
  }, true);
  /* ---- boot ---- */
  function wire(panel){ panel.style.removeProperty("inset"); panel.style.zIndex="9998";
    var toggle=ensureToggle(); var hideBtn=ensureInternalHide(panel);
    hideBtn.onclick=function(){ hidePanel(panel,toggle); };
    toggle.onclick=function(){ showPanel(panel,toggle); };
    var wasHidden=(localStorage.getItem(KEYS.hidden)==="1"); if(wasHidden){ hidePanel(panel,toggle); } else { showPanel(panel,toggle); }
    if(VA.muted){ try{localStorage.setItem(KEYS.muted,"1");}catch(e){} }
    makeDraggable(panel); wireVAControls(panel); chooseVoice();
    addEventListener("resize", function(){ safeDock(panel,toggle,{respectSaved:true}); });
    addEventListener("orientationchange", function(){ safeDock(panel,toggle,{respectSaved:true}); });
    var reset=panel.querySelector("[data-voice-action=\"reset-pos\"]"); if(reset){ reset.addEventListener("click", function(){ try{localStorage.removeItem(KEYS.pos);}catch(e){} safeDock(panel,toggle,{respectSaved:false}); }); }
    safeDock(panel,toggle,{respectSaved:true});
    ["click","touchstart","pointerdown"].forEach(function(ev){ document.addEventListener(ev, unlockAudio, {once:true, passive:true}); });
    window.mshareVA={ cancel:stopSpeak, muted:function(){return VA.muted;}, setMuted:function(m){VA.muted=!!m; try{localStorage.setItem(KEYS.muted,m?"1":"0");}catch(e){}}, chooseVoice:chooseVoice };
  }
  function init(){ var p=findPanel(); if(!p) return; if(p.__vaV3_4) return; p.__vaV3_4=true; wire(p); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
  new MutationObserver(function(){ var p=findPanel(); if(p) init(); }).observe(document.documentElement,{childList:true,subtree:true});
})();