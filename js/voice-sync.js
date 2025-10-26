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

  function collectText(){
    // Prefer selection; else main content; else body text.
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
    stopImmediate(); // ensure no overlap
    if (!('speechSynthesis' in W)) return;
    const voice = pickVoice();
    const t = String(text || collectText() || '').trim();
    if (!t) return;

    // chunk basic: split by sentence-ish
    const parts = t.match(/[^.!?]+[.!?]|\S+$/g) || [t];

    dispatch('speaking');

    for (let i=0;i<parts.length;i++){
      const seg = parts[i].trim(); if (!seg) continue;
      const u = new SpeechSynthesisUtterance(seg);
      state.currentUtter = u;
      if (voice) u.voice = voice;
      // conservative defaults; respect system language
      u.lang = (voice && voice.lang) || 'en-GB';
      u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;

      const done = new Promise((resolve)=>{
        u.onend = ()=> resolve(true);
        u.onerror = ()=> resolve(true);
      });

      try { W.speechSynthesis.speak(u); } catch { break; }
      await done;

      if (state.mode !== 'speaking') break; // stop/pause toggled during play
    }

    if (state.mode === 'speaking') dispatch('idle');
  }

  // Button bindings (page + panel), idempotent per node
  function bindWithin(root){
    const seenKey = '__va_bound__';
    const mark = (el)=>{ try{ if (el[seenKey]) return false; el[seenKey]=true; return true; }catch{ return false; } };

    root.querySelectorAll(SEL.start).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); speakNow(); });
    });

    root.querySelectorAll(SEL.stop).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); stopImmediate(); });
    });

    root.querySelectorAll(SEL.pause).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation();
        try{ W.speechSynthesis && W.speechSynthesis.pause(); }catch{}
        dispatch('paused');
      });
    });

    root.querySelectorAll(SEL.resume).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation();
        try{ W.speechSynthesis && W.speechSynthesis.resume(); }catch{}
        dispatch('speaking');
      });
    });

    root.querySelectorAll(SEL.toggle).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation();
        if (state.mode==='speaking'){ stopImmediate(); }
        else if (state.mode==='paused'){ try{ W.speechSynthesis.resume(); }catch{} dispatch('speaking'); }
        else { speakNow(); }
      });
    });

    // Panel buttons (if the VA panel provides them)
    root.querySelectorAll(SEL.panelStart).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); speakNow(); });
    });
    root.querySelectorAll(SEL.panelStop).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); stopImmediate(); });
    });
    root.querySelectorAll(SEL.panelPause).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); try{ W.speechSynthesis.pause(); }catch{} dispatch('paused'); });
    });
    root.querySelectorAll(SEL.panelResume).forEach(el=>{
      if (!mark(el)) return;
      el.addEventListener('click',(e)=>{ if(!debounceOk()) return; e.stopPropagation(); try{ W.speechSynthesis.resume(); }catch{} dispatch('speaking'); });
    });
  }

  function init(){
    bindWithin(D);
    // Observe future DOM
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

  // Expose minimal API for debugging/optional external use
  W.MShareVoiceSync = {
    speak: (t)=> speakNow(String(t||'').trim()),
    stop: ()=> stopImmediate(),
    state: ()=> state.mode
  };
})();
