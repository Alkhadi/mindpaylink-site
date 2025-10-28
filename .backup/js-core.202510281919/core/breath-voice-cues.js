/* Spoken phase cues (Chrome/Tesla):
   1) WebAudio decoded MP3/WAV
   2) <audio> element fallback
   3) Web Speech TTS fallback (en-GB)
   With auto unlock, preloading, and DOM watchers.
*/
(()=>{'use strict';
  const BASE='assets/audio/voice/';
  const CAND={ inhale:['inhale.mp3','inhale.wav'], hold:['hold.mp3','hold.wav'], exhale:['exhale.mp3','exhale.wav'] };
  const AC=window.AudioContext||window.webkitAudioContext;
  let ac=null, unlocked=false, waBuf={}, waReady=false, triedWA=false;

  function log(...a){ try{ console.log('[voice-cues]',...a);}catch{} }

  async function unlock(){ try{
    if(!ac && AC) ac=new AC();
    if(ac && ac.state==='suspended') await ac.resume();
    // silent tick
    if(ac){ const o=ac.createOscillator(), g=ac.createGain(); g.gain.value=0; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+0.01); }
    unlocked=true; document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock);
    log('unlocked audio');
    return true;
  }catch(e){ log('unlock failed', e?.message); return false; }}

  document.addEventListener('pointerdown', unlock, {once:false, passive:true});
  document.addEventListener('keydown', unlock, {once:false});

  async function fetchFirst(names){
    for(const n of names){
      try{ const res=await fetch(BASE+n, {cache:'no-store'}); if(res.ok){ return await res.arrayBuffer(); } }
      catch(e){ log('fetch error', n, e?.message); }
    } throw new Error('no audio file');
  }
  async function preloadWA(){
    if(waReady || triedWA) return;
    triedWA=true;
    if(!AC){ log('no AudioContext available'); return; }
    if(!ac) ac=new AC();
    try{
      const abIn = await fetchFirst(CAND.inhale);
      const abHo = await fetchFirst(CAND.hold);
      const abEx = await fetchFirst(CAND.exhale);
      waBuf.inhale = await ac.decodeAudioData(abIn.slice(0));
      waBuf.hold   = await ac.decodeAudioData(abHo.slice(0));
      waBuf.exhale = await ac.decodeAudioData(abEx.slice(0));
      waReady = true; log('webAudio preloaded');
    }catch(e){ log('webAudio preload failed', e?.message); }
  }

  // HTMLAudio fallback
  function mkEl(name){
    const el=document.createElement('audio');
    el.preload='auto'; el.crossOrigin='anonymous'; el.setAttribute('playsinline','');
    el.src = BASE + (CAND[name][0]); // prefer MP3 path first (exists)
    document.documentElement.appendChild(el);
    return el;
  }
  const tag={ inhale:null, hold:null, exhale:null };
  function ensureTags(){
    ['inhale','hold','exhale'].forEach(k=>{ if(!tag[k]) tag[k]=mkEl(k); });
  }

  function playWA(name, gain=1){
    if(!unlocked || !waReady || !waBuf[name] || !ac) return false;
    try{
      const src=ac.createBufferSource(), g=ac.createGain();
      src.buffer=waBuf[name]; g.gain.value=Math.max(0,Math.min(1,gain));
      src.connect(g).connect(ac.destination); src.start();
      return true;
    }catch(e){ log('playWA error', e?.message); return false; }
  }
  function playTag(name){
    try{ ensureTags(); tag[name].currentTime=0; tag[name].play().catch(()=>{}); return true; }catch{ return false; }
  }
  function speakTTS(text){
    try{
      if(!('speechSynthesis' in window)) return false;
      const u=new SpeechSynthesisUtterance(text);
      u.lang='en-GB'; u.rate=1.0; u.pitch=1.0; u.volume=1.0;
      window.speechSynthesis.cancel(); window.speechSynthesis.resume(); window.speechSynthesis.speak(u);
      return true;
    }catch{ return false; }
  }

  function play(name){
    // Path 1: WebAudio
    if(waReady && playWA(name)) return;
    // Path 2: <audio>
    if(playTag(name)) return;
    // Path 3: TTS
    speakTTS(name==='inhale'?'Inhale':name==='exhale'?'Exhale':'Hold');
  }

  function wire(){
    // Proactively show unlock banner if available
    setTimeout(()=>{ if(!unlocked && window.__AUDIO_UNLOCK__){ try{ document.getElementById('audioUnlockBanner').style.display='block'; }catch{} } }, 350);

    // Preload ASAP
    preloadWA();

    const phaseEl=document.getElementById('phase');
    const orb=document.getElementById('orb');

    const onPhaseTxt=(t)=>{
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

    // Ensure Start buttons trigger unlock
    ['startBtn','qsStart','beginFromInst'].forEach(id=>{
      const b=document.getElementById(id);
      if(b){ b.addEventListener('click', unlock, {once:false}); b.addEventListener('click', ()=>setTimeout(preloadWA,50)); }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire, {once:true}); else wire();
  window.MS_VOICE_CUES={unlock,play,preloadWA,state:()=>({unlocked,waReady})};
})();
