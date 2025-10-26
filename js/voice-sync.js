(()=>{'use strict';
const D=document,W=window,SS=W.speechSynthesis; let state='idle', last=0, current=null;
const EVT='mshare-voice:state', allowed=['en-GB','en-US'];
function voices(){try{return (SS?.getVoices()||[]).filter(v=>allowed.includes(v.lang))}catch{return[]}}
function pickVoice(){const v=voices();return v.find(x=>x.lang==='en-GB')||v.find(x=>x.lang==='en-US')||v[0]||null}
function setState(s){state=s; try{D.dispatchEvent(new CustomEvent(EVT,{detail:s}))}catch{}}
function textToRead(){const sel=W.getSelection?.().toString().trim(); if(sel) return sel; const main=D.querySelector('main'); return (main?.innerText||D.body.innerText||'').trim().slice(0,2000)}
function cancelAll(){try{SS?.cancel()}catch{}}
function speak(txt){cancelAll(); const v=pickVoice(); const t=(txt&&String(txt).trim())||textToRead(); if(!t){setState('idle');return}
  const u=new SpeechSynthesisUtterance(t); if(v) u.voice=v; u.lang=v?.lang||'en-GB'; u.rate=1; u.pitch=1; u.volume=1;
  u.onstart=()=>{current=u; setState('speaking')}; u.onend=()=>{current=null; setState('idle')}; u.onerror=()=>{current=null; setState('idle')};
  try{SS?.speak(u)}catch{setState('idle')}
}
function pause(){try{SS?.pause(); setState('paused')}catch{}} function resume(){try{SS?.resume(); setState('speaking')}catch{}} function stop(){cancelAll(); current=null; setState('idle')}
function deb(fn){return e=>{const n=Date.now(); if(n-last<120) return; last=n; fn(e)}}
function bindControls(root=D){const Q=s=>Array.from(root.querySelectorAll(s));
  Q('[data-voice="start"]').forEach(el=>el.__vaStart||(el.addEventListener('click',deb(()=>speak())),el.__vaStart=1));
  Q('[data-voice="stop"]').forEach(el=>el.__vaStop||(el.addEventListener('click',deb(()=>stop())),el.__vaStop=1));
  Q('[data-voice="pause"]').forEach(el=>el.__vaPause||(el.addEventListener('click',deb(()=>pause())),el.__vaPause=1));
  Q('[data-voice="resume"]').forEach(el=>el.__vaResume||(el.addEventListener('click',deb(()=>resume())),el.__vaResume=1));
  Q('[data-voice="toggle"]').forEach(el=>el.__vaTog||(el.addEventListener('click',deb(()=>{if(state==='speaking')pause(); else if(state==='paused')resume(); else speak();})),el.__vaTog=1));
}
function bindPanel(){const p=D.getElementById('mshare-voicebot')||D.querySelector('.mshare-voicebot'); if(!p) return;
  const by=a=>p.querySelector(`[data-voice-action="${a}"]`); const on=(a,fn)=>{const b=by(a); if(b&&!b.__va){b.addEventListener('click',deb(fn)); b.__va=1}}
  on('start',()=>speak()); on('stop',()=>stop()); on('pause',()=>pause()); on('resume',()=>resume()); on('repeat',()=>speak());
}
D.addEventListener('DOMContentLoaded',()=>{bindControls(); bindPanel();
  try{new MutationObserver(ms=>ms.forEach(m=>m.addedNodes&&m.addedNodes.forEach(n=>{if(n.nodeType===1){bindControls(n); bindPanel();}}))).observe(D.body,{subtree:true,childList:true})}catch{}
  try{SS?.addEventListener?.('voiceschanged',()=>{})}catch{} setState(SS?.speaking?'speaking':'idle');
});
})();