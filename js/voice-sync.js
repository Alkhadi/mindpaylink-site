(()=>{
  'use strict';
  if (window.__VA_SYNC_READY__) return; window.__VA_SYNC_READY__ = true;

  const D=document, W=window;
  const EVT='mshare-voice:state';
  const SEL = {
    start:'[data-voice="start"]',
    stop:'[data-voice="stop"]',
    pause:'[data-voice="pause"]',
    resume:'[data-voice="resume"]',
    toggle:'[data-voice="toggle"]',
    panelStart:'#mshare-voicebot [data-voice-action="start"], .mshare-voicebot [data-voice-action="start"]',
    panelStop:'#mshare-voicebot [data-voice-action="stop"], .mshare-voicebot [data-voice-action="stop"]',
    panelPause:'#mshare-voicebot [data-voice-action="pause"], .mshare-voicebot [data-voice-action="pause"]',
    panelResume:'#mshare-voicebot [data-voice-action="resume"], .mshare-voicebot [data-voice-action="resume"]'
  };

  const allowedLangs = ['en-GB','en-US'];
  const state = { mode:'idle', lastClick:0, currentUtter:null };

  function dispatch(mode){ state.mode = mode; D.dispatchEvent(new CustomEvent(EVT,{ detail: mode })); }

  function debounceOk(){
    const now = Date.now();
    if (now - state.lastClick < 120) return false;
    state.lastClick = now;
    return true;
  }

  function listVoices(){
    try { return (W.speechSynthesis && W.speechSynthesis.getVoices && W.speechSynthesis.getVoices()) || []; }
    catch { return []; }
  }

  function pickVoice(){
    const vs = listVoices().filter(v => allowedLangs.includes((v.lang||'').trim()));
    if (!vs.length) return null;
    const gb = vs.find(v => (v.lang||'').toLowerCase().startsWith('en-gb'));
    return gb || vs[0];
  }

  function anyMediaActive(){
    try{
      const els = Array.from(D.querySelectorAll('audio,video'));
      return els.some(el=>{
        try { return !el.paused && !el.ended && el.currentTime>0; } catch { return false; }
      });
    }catch{ return false; }
  }

  function collectText(){
    const sel = W.getSelection && String(W.getSelection()).trim();
    if (sel) return sel;
    const main = D.querySelector('main');
    const t = (main?.innerText || D.body.innerText || '').trim();
    return t;
  }

  function stopImmediate(){
    try {
      if (W.speechSynthesis){
        W.speechSynthesis.cancel(); // hard stop, prevents overlap
      }
    } catch {}
    state.currentUtter = null;
    dispatch('idle');
  }

  async function speakNow(text){
    // fallback to VA speech only if no page media is active
    if (anyMediaActive()) { dispatch('speaking'); return; }

    stopImmediate(); // ensure no overlap
    if (!('speechSynthesis' in W)) return;
    const voice = pickVoice();
    const t = String(text || collectText() || '').trim();
    if (!t) return;

    const parts = t.match(/[^.!?]+[.!?]|\S+$/g) || [t];
    dispatch('speaking');

    for (let i=0;i<parts.length;i++){
      const seg = parts[i].trim(); if (!seg) continue;
      const u = new SpeechSynthesisUtterance(seg);
      state.currentUtter = u;
      if (voice) u.voice = voice;
      u.lang = (voice && voice.lang) || 'en-GB';
      u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;

      const done = new Promise((resolve)=>{ u.onend = u.onerror = ()=> resolve(true); });
      try { W.speechSynthesis.speak(u); } catch { break; }
      await done;

      if (state.mode !== 'speaking') break;
    }

    if (state.mode === 'speaking') dispatch('idle');
  }

  function bindWithin(root){
    const SEEN = '__va_bound__';
    const tag = (el)=>{ if (el[SEEN]) return false; try{ el[SEEN]=true; return true; }catch{ return false; } };

    // Page buttons
    root.querySelectorAll(SEL.start).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); speakNow(); });
    });
    root.querySelectorAll(SEL.stop).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); stopImmediate(); });
    });
    root.querySelectorAll(SEL.pause).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); try{ W.speechSynthesis.pause(); }catch{} dispatch('paused'); });
    });
    root.querySelectorAll(SEL.resume).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); try{ W.speechSynthesis.resume(); }catch{} dispatch('speaking'); });
    });
    root.querySelectorAll(SEL.toggle).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation();
        if (state.mode==='speaking'){ stopImmediate(); }
        else if (state.mode==='paused'){ try{ W.speechSynthesis.resume(); }catch{} dispatch('speaking'); }
        else { speakNow(); }
      });
    });

    // Panel buttons (if present)
    root.querySelectorAll(SEL.panelStart).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); speakNow(); });
    });
    root.querySelectorAll(SEL.panelStop).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); stopImmediate(); });
    });
    root.querySelectorAll(SEL.panelPause).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); try{ W.speechSynthesis.pause(); }catch{} dispatch('paused'); });
    });
    root.querySelectorAll(SEL.panelResume).forEach(el=>{
      if (!tag(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); try{ W.speechSynthesis.resume(); }catch{} dispatch('speaking'); });
    });
  }

  function init(){
    bindWithin(D);
    try{
      const mo = new MutationObserver(muts=>{
        for (const m of muts){
          for (const n of m.addedNodes) if (n && n.nodeType===1) bindWithin(n);
        }
      });
      mo.observe(D.body, { childList:true, subtree:true });
    }catch{}
  }

  if (D.readyState==='loading') D.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  // Expose minimal API (optional)
  W.MShareVoiceSync = {
    speak: (t)=> speakNow(String(t||'').trim()),
    stop: ()=> stopImmediate(),
    state: ()=> state.mode
  };
})();
