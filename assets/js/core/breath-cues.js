/* Auto play inhale/hold/exhale cues on breathing pages (Chrome/Tesla safe) */
(() => {
  'use strict';
  function can(type){ const a=document.createElement('audio'); return !!a.canPlayType && a.canPlayType(type) !== ''; }
  const preferMp3 = can('audio/mpeg');
  const src = (name) => `assets/audio/${name}.` + (preferMp3 ? 'mp3' : 'wav');

  function player(url){
    return () => {
      try { const a = new Audio(url); a.preload = 'auto'; a.play().catch(()=>{}); } catch {}
    };
  }
  const play = {
    inhale: player(src('inhale')),
    hold:   player(src('hold')),
    exhale: player(src('exhale')),
  };

  // One-time unlock (required by Chrome/Tesla)
  let unlocked = false;
  function unlock(){
    if (unlocked) return;
    unlocked = true;
    try { new Audio(src('inhale')).play().catch(()=>{}); } catch {}
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  }
  document.addEventListener('pointerdown', unlock, {once:true, passive:true});
  document.addEventListener('keydown', unlock, {once:true});

  function wire(){
    const phaseEl = document.getElementById('phase');
    const orb = document.getElementById('orb');
    let last = '';

    function onPhase(label){
      const t = String(label||'').toLowerCase();
      if (t === last) return; last = t;
      if (t.includes('inhale')) play.inhale();
      else if (t.includes('exhale')) play.exhale();
      else if (t.includes('hold'))   play.hold();
    }

    if (phaseEl){
      onPhase(phaseEl.textContent || '');
      new MutationObserver(() => onPhase(phaseEl.textContent || ''))
        .observe(phaseEl, {childList:true, characterData:true, subtree:true});
    }
    if (orb){
      new MutationObserver(() => {
        const cl = orb.className || '';
        if (cl.includes('exhale')) onPhase('exhale');
        else if (cl.includes('inhale')) onPhase('inhale');
      }).observe(orb, {attributes:true, attributeFilter:['class']});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();
})();
