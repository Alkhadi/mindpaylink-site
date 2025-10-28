(()=>{ 'use strict';
  const BANNER_ID='audioUnlockBanner';
  function mk(){
    if(document.getElementById(BANNER_ID)) return;
    const d=document.createElement('div'); d.id=BANNER_ID;
    d.innerHTML = '<div class="row"><div><b>Enable sound</b> — tap once so breathing voice can play.</div><div><button id="audioUnlockBtn" type="button">Enable sound</button></div></div>';
    document.body.appendChild(d);
  }
  function show(){ const el=document.getElementById(BANNER_ID); if(el) el.style.display='block'; }
  function hide(){ const el=document.getElementById(BANNER_ID); if(el) el.style.display='none'; }
  async function resumeAC(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
      window.__ac__=window.__ac__||new AC();
      if(window.__ac__.state==='suspended'){ await window.__ac__.resume(); }
      // silent tick
      const o=window.__ac__.createOscillator(), g=window.__ac__.createGain();
      g.gain.value=0; o.connect(g).connect(window.__ac__.destination); o.start(); o.stop(window.__ac__.currentTime+0.01);
      return true;
    }catch{ return false; }
  }
  async function unlock(){ const ok = await resumeAC(); if(ok){ hide(); document.removeEventListener('pointerdown',unlock); document.removeEventListener('keydown',unlock); } }
  function init(){
    mk();
    const btn = ()=>document.getElementById('audioUnlockBtn');
    document.addEventListener('pointerdown', unlock, {once:false, passive:true});
    document.addEventListener('keydown', unlock, {once:false});
    setTimeout(()=>{ show(); btn()?.addEventListener('click', unlock); }, 250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  window.__AUDIO_UNLOCK__={unlock};
})();
