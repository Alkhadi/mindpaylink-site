(()=>{'use strict';
  // Deterministic spoken cues for breathing pages (global fix).
  // – Arm only on Start
  // – Valid next-phase gating
  // – Min elapsed before accepting Hold
  // – British English TTS defaults (Daniel > Serena/Kate > any en-GB)
  // – Asset fallbacks in /assets/audio/voice and /assets/audio

  const CAND = {
    inhale: [
      'assets/audio/voice/inhale.mp3',
      'assets/audio/voice/inhale.wav',
      'assets/audio/inhale.wav',
      'assets/audio/inhale.mp3'
    ],
    hold: [
      'assets/audio/voice/hold.mp3',
      'assets/audio/voice/hold.wav',
      'assets/audio/hold.wav',
      'assets/audio/hold.mp3'
    ],
    exhale: [
      'assets/audio/voice/exhale.mp3',
      'assets/audio/voice/exhale.wav',
      'assets/audio/exhale.wav',
      'assets/audio/exhale.mp3'
    ]
  };

  const AC = window.AudioContext || window.webkitAudioContext;
  let ac = null, unlocked = false;
  let waBuf = {}, waReady = false, triedWA = false;

  // runtime state
  let armed = false;
  let state = '';                 // last accepted canonical phase
  let lastPlayedAt = 0;
  let phaseStartAt = 0;

  const $ = (id)=>document.getElementById(id);
  const now = ()=>performance.now();

  function num(elId, def=0){
    const el = $(elId);
    const v = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(v) ? v : def;
  }
  const inhaleDur = ()=>Math.max(0, num('inS', 4));
  const exhaleDur = ()=>Math.max(0, num('outS', 4));
  const h1Zero    = ()=>num('h1S', 4) <= 0;
  const h2Zero    = ()=>num('h2S', 4) <= 0;

  function canonicalPhase(s){
    s = String(s||'').toLowerCase();
    if (/\binhale\b/.test(s)) return 'inhale';
    if (/\bexhale\b/.test(s)) return 'exhale';
    if (/\bhold\b/.test(s))   return 'hold';
    return '';
  }

  function allowedNext(from){
    // valid transitions (holds may be skipped if 0)
    switch(from){
      case '':        return ['inhale'];
      case 'inhale':  return h1Zero() ? ['exhale'] : ['hold'];
      case 'hold':    return ['exhale','inhale'];     // could be hold1->exhale or hold2->inhale
      case 'exhale':  return h2Zero() ? ['inhale'] : ['hold'];
      default:        return ['inhale'];
    }
  }

  // Additional guard: do not accept "hold" until sensible time has passed in the previous phase.
  function meetsTimingGuard(prev, next){
    if (next !== 'hold') return true;
    const elapsed = now() - phaseStartAt;
    // Require ≥ 60% of previous phase duration before we acknowledge an early "hold".
    if (prev === 'inhale'){
      return elapsed >= 0.6 * inhaleDur() * 1000;
    }
    if (prev === 'exhale'){
      return elapsed >= 0.6 * exhaleDur() * 1000;
    }
    return true;
  }

  function pickGBVoice(){
    try{
      const list = window.speechSynthesis?.getVoices?.() || [];
      return list.find(v => /en-GB/i.test(v.lang) && /Daniel/i.test(v.name))
          || list.find(v => /en-GB/i.test(v.lang) && /(Serena|Kate)/i.test(v.name))
          || list.find(v => /en-GB/i.test(v.lang))
          || list[0] || null;
    }catch{ return null; }
  }

  function speakTTS(word){
    try{
      if (!('speechSynthesis' in window)) return false;
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-GB'; u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
      const v = pickGBVoice(); if (v) u.voice = v;
      try { window.speechSynthesis.cancel(); window.speechSynthesis.resume(); } catch {}
      window.speechSynthesis.speak(u);
      return true;
    }catch{ return false; }
  }

  async function unlock(){
    try{
      if (!ac && AC) ac = new AC();
      if (ac && ac.state === 'suspended') await ac.resume();
      if (ac){
        const o = ac.createOscillator(), g = ac.createGain();
        g.gain.value = 0; o.connect(g).connect(ac.destination);
        o.start(); o.stop(ac.currentTime + 0.01);
      }
      unlocked = true; return true;
    }catch{ return false; }
  }
  document.addEventListener('pointerdown', unlock, {passive:true});
  document.addEventListener('keydown', unlock);

  async function fetchFirst(urls){
    for (const u of urls){
      try{
        const r = await fetch(u, {cache:'no-store'});
        if (r.ok) return await r.arrayBuffer();
      }catch{}
    }
    throw new Error('no-audio-assets');
  }

  async function preloadWA(){
    if (waReady || triedWA) return;
    triedWA = true;
    if (!AC) return;
    if (!ac) ac = new AC();
    try{
      waBuf.inhale = await ac.decodeAudioData((await fetchFirst(CAND.inhale)).slice(0));
      waBuf.hold   = await ac.decodeAudioData((await fetchFirst(CAND.hold)).slice(0));
      waBuf.exhale = await ac.decodeAudioData((await fetchFirst(CAND.exhale)).slice(0));
      waReady = true;
    }catch{/* fall back to <audio> or TTS */}
  }

  const tag = {};
  function ensureTag(k){
    if (!tag[k]){
      const el = document.createElement('audio');
      el.preload = 'auto';
      el.setAttribute('playsinline','');
      el.src = (CAND[k]||[])[0] || '';
      document.documentElement.appendChild(el);
      tag[k] = el;
    }
  }
  function playWA(k){
    if (!unlocked || !waReady || !waBuf[k] || !ac) return false;
    try{
      const s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = waBuf[k]; g.gain.value = 1; s.connect(g).connect(ac.destination); s.start();
      return true;
    }catch{ return false; }
  }
  function playTag(k){
    try{
      ensureTag(k); tag[k].currentTime = 0; tag[k].play().catch(()=>{});
      return true;
    }catch{ return false; }
  }
  function play(name){
    const t = now();
    // Debounce: avoid back-to-back fires within 250ms
    if (t - lastPlayedAt < 250) return;
    // Additional protection: first ~800ms after Start, never accept an immediate Hold
    if (name === 'hold' && (t - phaseStartAt) < 800) return;

    if (playWA(name)) { lastPlayedAt = t; return; }
    if (playTag(name)) { lastPlayedAt = t; return; }
    speakTTS(name==='inhale'?'Inhale':name==='exhale'?'Exhale':'Hold');
    lastPlayedAt = t;
  }

  function wire(){
    const phaseEl = $('phase');
    const orbEl   = $('orb');

    function currentPhase(){
      let cand = '';
      if (phaseEl) cand = canonicalPhase(phaseEl.textContent);
      if (!cand && orbEl){
        const c = String(orbEl.className||'').toLowerCase();
        if (c.includes('exhale')) cand = 'exhale';
        else if (c.includes('inhale')) cand = 'inhale';
      }
      return cand;
    }

    function accept(cand){
      if (!armed) return;
      if (!cand) return;
      if (cand === state) return;

      // Only allow valid next steps and timing constraints
      const okNext = allowedNext(state).includes(cand);
      if (!okNext) return;
      if (!meetsTimingGuard(state, cand)) return;

      state = cand;
      phaseStartAt = now();
      play(cand);
    }

    // Observe content changes
    if (phaseEl){
      new MutationObserver(()=>{ accept( currentPhase() ); })
        .observe(phaseEl, {childList:true, characterData:true, subtree:true});
    }
    if (orbEl){
      new MutationObserver(()=>{ if (!phaseEl) accept( currentPhase() ); })
        .observe(orbEl, {attributes:true, attributeFilter:['class']});
    }

    // Arm/disarm on UI controls
    function arm(){
      armed = true; state = ''; lastPlayedAt = 0; phaseStartAt = now();
      try{ if ('speechSynthesis' in window){ window.speechSynthesis.getVoices(); } }catch{}
      setTimeout(preloadWA, 50);
    }
    function disarm(){ armed = false; state = ''; }

    ['startBtn','qsStart','beginFromInst'].forEach(id=>{
      const b=$(id); if(b){ b.addEventListener('click', unlock); b.addEventListener('click', arm); }
    });
    ['resetBtn','hardStopBtn','qsStop','againBtn','backSetup'].forEach(id=>{
      const b=$(id); if(b){ b.addEventListener('click', disarm); }
    });

    // Optional unlock banner support
    setTimeout(()=>{ const banner=$('audioUnlockBanner'); if (banner && !unlocked) banner.style.display='block'; }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, {once:true});
  } else {
    wire();
  }
})();
