/* Spoken phase cues: Inhale / Hold / Exhale (Chrome/Tesla safe).
   - Preloads MP3 (fallback WAV) with Web Audio
   - Unlocks on first user gesture
   - Plays on #phase text changes and orb class changes
*/
(() => {
  'use strict';
  const VOICE_BASE = 'assets/audio/voice/';
  const CANDIDATES = {
    inhale: ['inhale.mp3', 'inhale.wav'],
    hold:   ['hold.mp3',   'hold.wav'],
    exhale: ['exhale.mp3', 'exhale.wav']
  };

  let ac = null, unlocked = false, buffers = {}, ready = false;

  async function fetchFirstExisting(names){
    for (const n of names) {
      try {
        const res = await fetch(VOICE_BASE + n, { cache: 'no-store' });
        if (res.ok) return await res.arrayBuffer();
      } catch {}
    }
    throw new Error('No voice file found for ' + names[0]);
  }

  async function loadOne(name){
    const ab = await fetchFirstExisting(CANDIDATES[name]);
    return await ac.decodeAudioData(ab.slice(0));
  }

  async function preload(){
    if (ready) return;
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    // Minimal silent start to satisfy some policies
    try { const osc = ac.createOscillator(); const g = ac.createGain(); g.gain.value = 0; osc.connect(g).connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.01); } catch {}
    buffers.inhale = await loadOne('inhale');
    buffers.hold   = await loadOne('hold');
    buffers.exhale = await loadOne('exhale');
    ready = true;
  }

  async function unlock(){
    if (unlocked) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') await ac.resume();
      await preload();
      unlocked = true;
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    } catch {}
  }
  document.addEventListener('pointerdown', unlock, { once:true, passive:true });
  document.addEventListener('keydown', unlock, { once:true });

  function play(name, gain=1.0){
    if (!unlocked || !ready || !buffers[name]) return;
    try {
      const src = ac.createBufferSource();
      src.buffer = buffers[name];
      const g = ac.createGain();
      g.gain.value = Math.max(0.0, Math.min(1.0, gain));
      src.connect(g).connect(ac.destination);
      src.start();
    } catch {}
  }

  function wire(){
    const phaseEl = document.getElementById('phase');
    const orb = document.getElementById('orb');

    const onPhaseText = (txt) => {
      const t = String(txt||'').toLowerCase();
      if (t.includes('inhale')) play('inhale', 1.0);
      else if (t.includes('exhale')) play('exhale', 1.0);
      else if (t.includes('hold'))   play('hold',   0.9);
    };

    if (phaseEl){
      onPhaseText(phaseEl.textContent || '');
      new MutationObserver(() => onPhaseText(phaseEl.textContent || ''))
        .observe(phaseEl, { childList:true, characterData:true, subtree:true });
    }
    if (orb){
      new MutationObserver(() => {
        const c = orb.className || '';
        if (c.includes('exhale')) onPhaseText('exhale');
        else if (c.includes('inhale')) onPhaseText('inhale');
      }).observe(orb, { attributes:true, attributeFilter:['class'] });
    }

    // Also prime at Start buttons if present
    ['startBtn','qsStart','beginFromInst'].forEach(id=>{
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', unlock, { once:false });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();

  // Expose for diagnostics
  window.MS_VOICE_CUES = { unlock, preload, play, get state(){ return { unlocked, ready, has: Object.keys(buffers) }; } };
})();
