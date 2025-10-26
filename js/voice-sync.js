(()=>{"use strict";
const W=window,D=document,EVT_STATE="mshare-voice:state",allowed=/^en-(GB|US)\b/i;let state="idle";
if("speechSynthesis"in W){const o=W.speechSynthesis.getVoices?.bind(W.speechSynthesis);if(o && !W.speechSynthesis.__wrap){W.speechSynthesis.getVoices=function(){return (o()||[]).filter(v=>allowed.test(v.lang||""));};W.speechSynthesis.__wrap=true;}}
function setState(s){if(state===s)return;state=s;D.documentElement.dataset.voiceState=s;D.dispatchEvent(new CustomEvent(EVT_STATE,{detail:s}));
  const sr=D.getElementById("mshare-voice-meta"); if(sr) sr.textContent=s==="speaking"?"Speaking…":(s==="paused"?"Paused":"Ready");
  D.querySelectorAll('[data-voice-action="start"],[data-voice="start"]').forEach(b=>b.disabled=(s==="speaking"));
  D.querySelectorAll('[data-voice-action="stop"],[data-voice="stop"]').forEach(b=>b.disabled=(s!=="speaking"&&s!=="paused"));
  D.querySelectorAll('[data-voice-action="resume"],[data-voice="resume"]').forEach(b=>b.disabled=(s!=="paused"));
  D.querySelectorAll('[data-voice-action="pause"],[data-voice="pause"]').forEach(b=>b.disabled=(s!=="speaking"));
}
function isMedia(){return [...D.querySelectorAll("audio,video")].some(a=>{try{return !a.paused && !a.ended && a.currentTime>0;}catch{return false;}});}
function sel(){const s=W.getSelection&&W.getSelection();return s&&s.rangeCount?(s.toString()||"").trim():"";}
function visible(){const r=D.querySelector("main")||D.body, bs=[...r.querySelectorAll("h1,h2,h3,p,li,blockquote,figure figcaption,article section,.content,.card,.section")];const parts=[];
  bs.forEach(el=>{const cs=getComputedStyle(el);if(cs.display==="none"||cs.visibility==="hidden")return;if(!el.offsetParent&&cs.position!=="fixed")return;if(el.closest("nav,header,footer,[aria-hidden='true'],.modal,[role='dialog']"))return;
    const t=(el.innerText||el.textContent||"").trim();if(t)parts.push(t);});return parts.join("\n\n").trim();}
function vpick(){try{const vs=(W.speechSynthesis&&W.speechSynthesis.getVoices&&W.speechSynthesis.getVoices())||[];return vs.find(v=>/en-GB/i.test(v.lang||""))||vs.find(v=>/en-US/i.test(v.lang||""))||vs[0]||null;}catch{return null;}}
function MSV(){return (W.__MSHARE__&&W.__MSHARE__.Voice)||null;}
function speakViaPanel(t){const m=MSV(); if(!m||!m.speak) return false; setState("speaking"); m.speak(String(t||"").trim()||sel()||visible()); return true;}
function stopViaPanel(){const m=MSV(); if(m&&m.stop){m.stop();setState("idle");return true;}return false;}
function pauseViaPanel(){const m=MSV(); if(m&&m.pause){m.pause();setState("paused");return true;}return false;}
function resumeViaPanel(){const m=MSV(); if(m&&m.resume){m.resume();setState("speaking");return true;}return false;}
let cur=null;
function speakFallback(t){if(!("speechSynthesis"in W))return false;const c=String(t||"").trim()||sel()||visible();if(!c)return false;const u=new SpeechSynthesisUtterance(c);const v=vpick();if(v)u.voice=v;u.lang=(v&&v.lang)?v.lang:"en-GB";
  u.onstart=()=>setState("speaking");u.onend=()=>{cur=null;setState("idle");};u.onerror=()=>{cur=null;setState("idle");};cur=u;try{W.speechSynthesis.cancel();}catch{}W.speechSynthesis.speak(u);return true;}
function stopFallback(){try{W.speechSynthesis&&W.speechSynthesis.cancel();}catch{}cur=null;setState("idle");}
function pauseFallback(){try{W.speechSynthesis&&W.speechSynthesis.pause();}catch{}setState("paused");}
function resumeFallback(){try{W.speechSynthesis&&W.speechSynthesis.resume();}catch{}setState("speaking");}
function startSpeak(t){if(isMedia())return;if(!speakViaPanel(t))speakFallback(t);}
function stopSpeak(){if(!stopViaPanel())stopFallback();}
function pauseSpeak(){if(!pauseViaPanel())pauseFallback();}
function resumeSpeak(){if(!resumeViaPanel())resumeFallback();}
function tfrom(el){return el.getAttribute("data-voice-text")||el.getAttribute("aria-label")||"";}
function bind(ctx){const root=ctx||D;
  root.querySelectorAll('[data-voice="start"]').forEach(b=>{if(b.__b)return;b.__b=1;b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();startSpeak(tfrom(b));});});
  root.querySelectorAll('[data-voice="stop"]').forEach (b=>{if(b.__b)return;b.__b=1;b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();stopSpeak();});});
  root.querySelectorAll('[data-voice="pause"]').forEach(b=>{if(b.__b)return;b.__b=1;b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();pauseSpeak();});});
  root.querySelectorAll('[data-voice="resume"]').forEach(b=>{if(b.__b)return;b.__b=1;b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();resumeSpeak();});});
}
function init(){bind();const mo=new MutationObserver(ms=>ms.forEach(m=>Array.from(m.addedNodes||[]).forEach(n=>{if(n.nodeType===1)bind(n);})));try{mo.observe(D.body,{subtree:true,childList:true});}catch{}
  setState(("speechSynthesis"in W && W.speechSynthesis.speaking)?"speaking":"idle");}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
