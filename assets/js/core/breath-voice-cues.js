(()=>{'use strict';
  const BASE='assets/audio/voice/';
  const CAND={ inhale:['inhale.mp3','inhale.wav'], hold:['hold.mp3','hold.wav'], exhale:['exhale.mp3','exhale.wav'] };
  const AC=window.AudioContext||window.webkitAudioContext;
  let ac=null, unlocked=false, waBuf={}, waReady=false, triedWA=false;

  function log(...a){ try{ console.log('[voice-cues]',...a);}catch{} }

  async function unlock(){ try{
    if(!ac && AC) ac=new AC();
    if(ac && ac.state==='suspended') await ac.resume();
    if(ac){ const o=ac.createOscillator(), g=ac.createGain(); g.gain.value=0; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+0.01); }
    unlocked=true; return true;
  }catch(e){ log('unlock failed', e?.message); return false; } }
  document.addEventListener('pointerdown', unlock, {once:false, passive:true});
  document.addEventListener('keydown', unlock, {once:false});

  async function fetchFirst(names){
    for(const n of names){ try{ const r=await fetch(BASE+n,{cache:'no-store'}); if(r.ok){ return await r.arrayBuffer(); } } catch(e){ log('fetch',n,e?.message);} }
    throw new Error('no audio');
  }
  async function preloadWA(){
    if(waReady||triedWA) return; triedWA=true; if(!AC){ log('no AudioContext'); return; }
    if(!ac) ac=new AC();
    try{
      waBuf.inhale = await ac.decodeAudioData((await fetchFirst(CAND.inhale)).slice(0));
      waBuf.hold   = await ac.decodeAudioData((await fetchFirst(CAND.hold)).slice(0));
      waBuf.exhale = await ac.decodeAudioData((await fetchFirst(CAND.exhale)).slice(0));
      waReady=true; log('webAudio ready');
    }catch(e){ log('decode fail', e?.message); }
  }

  const tag={}; function ensureTag(k){ if(!tag[k]){ const el=document.createElement('audio'); el.preload='auto'; el.crossOrigin='anonymous'; el.setAttribute('playsinline',''); el.src=BASE+CAND[k][0]; document.documentElement.appendChild(el); tag[k]=el; } }
  function playWA(k,gain=1){ if(!unlocked||!waReady||!waBuf[k]||!ac) return false; try{ const s=ac.createBufferSource(), g=ac.createGain(); s.buffer=waBuf[k]; g.gain.value=Math.max(0,Math.min(1,gain)); s.connect(g).connect(ac.destination); s.start(); return true; }catch{ return false; } }
  function playTag(k){ try{ ensureTag(k); tag[k].currentTime=0; tag[k].play().catch(()=>{}); return true; }catch{ return false; } }

  // Robust en-GB TTS selection (Daniel → Serena/Kate → any en-GB → first)
  function pickGBVoice(){
    const vs=window.speechSynthesis?.getVoices?.()||[];
    return vs.find(v=>/en-GB/i.test(v.lang)&&/Daniel/i.test(v.name))
        || vs.find(v=>/en-GB/i.test(v.lang)&&/(Serena|Kate)/i.test(v.name))
        || vs.find(v=>/en-GB/i.test(v.lang))
        || vs[0]||null;
  }
  function speakTTS(phrase){
    try{
      if(!('speechSynthesis' in window)) return false;
      const u=new SpeechSynthesisUtterance(phrase); u.lang='en-GB'; u.rate=1.0; u.pitch=1.0; u.volume=1.0;
      const v=pickGBVoice(); if(v) u.voice=v;
      window.speechSynthesis.cancel(); window.speechSynthesis.resume(); window.speechSynthesis.speak(u);
      return true;
    }catch{ return false; }
  }
  window.speechSynthesis?.addEventListener?.('voiceschanged', ()=>{}); // triggers voice list population

  function play(name){
    if(waReady && playWA(name)) return;
    if(playTag(name)) return;
    speakTTS(name==='inhale'?'Inhale':name==='exhale'?'Exhale':'Hold');
  }

  function wire(){
    setTimeout(()=>{ if(!unlocked && window.__AUDIO_UNLOCK__){ try{ document.getElementById('audioUnlockBanner').style.display='block'; }catch{} } },350);
    preloadWA();

    const phaseEl=document.getElementById('phase');
    const orb=document.getElementById('orb');

    const onPhaseTxt=t=>{
      const s=String(t||'').toLowerCase();
      if(s.includes('inhale')) play('inhale');
      else if(s.includes('exhale')) play('exhale');
      else if(s.includes('hold'))   play('hold');
    };

    if(phaseEl){
      onPhaseTxt(phaseEl.textContent||'');
      new MutationObserver(()=>onPhaseTxt(phaseEl.textContent||''))
        .observe(phaseEl,{childList:true,characterData:true,subtree:true});
    }
    if(orb){
      new MutationObserver(()=>{
        const c=orb.className||'';
        if(c.includes('exhale')) onPhaseTxt('exhale');
        else if(c.includes('inhale')) onPhaseTxt('inhale');
      }).observe(orb,{attributes:true,attributeFilter:['class']});
    }

    ['startBtn','qsStart','beginFromInst'].forEach(id=>{
      const b=document.getElementById(id);
      if(b){ b.addEventListener('click', unlock, {once:false}); b.addEventListener('click', ()=>setTimeout(preloadWA,50)); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire, {once:true}); else wire();
})();
