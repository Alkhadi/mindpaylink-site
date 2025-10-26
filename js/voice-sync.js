(()=>{ "use strict";
const W=window, D=document;
const EVT='mshare-voice:state';
const SELS={ start:'[data-voice="start"]', stop:'[data-voice="stop"]', pause:'[data-voice="pause"]', resume:'[data-voice="resume"]', toggle:'[data-voice="toggle"]' };
const PANEL_BTNS={ start:'[data-voice-action="start"]', stop:'[data-voice-action="stop"]', pause:'[data-voice-action="pause"]', resume:'[data-voice-action="resume"]' };
const ALLOWED=['en-GB','en-US'];
let state='idle', lastClick=0;

function debounceOK(){ const now=Date.now(); if(now-lastClick<120) return false; lastClick=now; return true; }
function dispatch(s){ state=s; D.dispatchEvent(new CustomEvent(EVT,{detail:s})); }

function listVoices(){ try{ return (W.speechSynthesis && W.speechSynthesis.getVoices())||[]; }catch{ return []; } }
function pickVoice(){
  const vs=listVoices().filter(v=> ALLOWED.includes((v.lang||'').trim()));
  if(!vs.length) return null;
  const gb=vs.find(v=>/^en-GB/i.test(v.lang||'')); return gb||vs[0];
}

function visibleText(){
  const root=D.querySelector('main')||D.body; const parts=[];
  root.querySelectorAll('h1,h2,h3,h4,h5,p,li,blockquote,figure figcaption,article section,.content,.card,.section').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden') return;
    if(!el.offsetParent && cs.position!=='fixed') return;
    if(el.closest('nav,header,footer,[aria-hidden="true"],.modal,[role="dialog"]')) return;
    const t=(el.innerText||el.textContent||'').trim(); if(t) parts.push(t);
  });
  return parts.join('\n\n').trim() || (D.querySelector('main')?.innerText || D.body.innerText || '').trim();
}

function cancelAll(){ try{ if(W.speechSynthesis){ W.speechSynthesis.cancel(); } }catch{} }
function speakFallback(text){
  const v=pickVoice(); if(!v){ alert('No English voice found (en-GB/en-US).'); return; }
  const t = String(text||'').trim() || visibleText();
  if(!t) return;
  const u=new SpeechSynthesisUtterance(t);
  u.voice=v; u.rate=1; u.pitch=1; u.lang=v.lang;
  u.onstart=()=>dispatch('speaking');
  u.onend=()=>dispatch('idle');
  u.onerror=()=>dispatch('idle');
  // Immediate no-latency: cancel then speak
  cancelAll();
  setTimeout(()=>{ try{ W.speechSynthesis.speak(u); }catch{} },0);
}

function start(text){
  if(!debounceOK()) return;
  if(W.__MSHARE__ && W.__MSHARE__.Voice && W.__MSHARE__.Voice.speak){
    try{ cancelAll(); W.__MSHARE__.Voice.speak(text||''); return; }catch{}
  }
  speakFallback(text);
}
function stop(){
  if(!debounceOK()) return;
  if(W.__MSHARE__ && W.__MSHARE__.Voice && W.__MSHARE__.Voice.stop){
    try{ W.__MSHARE__.Voice.stop(); dispatch('idle'); return; }catch{}
  }
  cancelAll(); dispatch('idle');
}
function pause(){
  if(!debounceOK()) return;
  try{ if(W.speechSynthesis) W.speechSynthesis.pause(); }catch{}
  dispatch('paused');
}
function resume(){
  if(!debounceOK()) return;
  try{ if(W.speechSynthesis) W.speechSynthesis.resume(); }catch{}
  dispatch('speaking');
}

function textFrom(el){ const t=el?.getAttribute('data-voice-text')||''; return t.trim(); }

function bind(root=D){
  root.querySelectorAll(SELS.start).forEach(el=>{
    el.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); start(textFrom(el)); }, {passive:false});
  });
  root.querySelectorAll(SELS.stop).forEach(el=>{
    el.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); stop(); }, {passive:false});
  });
  root.querySelectorAll(SELS.pause).forEach(el=>{
    el.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); pause(); }, {passive:false});
  });
  root.querySelectorAll(SELS.resume).forEach(el=>{
    el.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); resume(); }, {passive:false});
  });
  root.querySelectorAll(SELS.toggle).forEach(el=>{
    el.addEventListener('click', e=>{
      e.preventDefault(); e.stopPropagation();
      if(state==='speaking') pause(); else if(state==='paused') resume(); else start(textFrom(el));
    }, {passive:false});
  });

  // Panel buttons
  const panel=document.querySelector('#mshare-voicebot, .mshare-voicebot');
  if(panel){
    const b=(sel,fn)=>{ const x=panel.querySelector(sel); if(x) x.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); fn(); }, {passive:false}); };
    b(PANEL_BTNS.start, ()=>start());
    b(PANEL_BTNS.stop,  ()=>stop());
    b(PANEL_BTNS.pause, ()=>pause());
    b(PANEL_BTNS.resume,()=>resume());
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ bind(); }, {once:true}); else bind();
// Rebind on DOM growth
try{
  const mo=new MutationObserver(muts=>{ for(const m of muts){ for(const n of m.addedNodes){ if(n.nodeType===1) bind(n); } }});
  mo.observe(D.body,{subtree:true,childList:true});
}catch{}
})();
