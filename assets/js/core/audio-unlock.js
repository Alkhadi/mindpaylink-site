(()=>{'use strict';
  const ID='audioUnlockBanner';
  function mk(){ if(document.getElementById(ID)) return;
    const d=document.createElement('div'); d.id=ID;
    d.innerHTML='<div class="row"><div><b>Enable sound</b> — tap once so breathing voice can play.</div><div><button id="audioUnlockBtn" type="button">Enable sound</button></div></div>';
    document.body.appendChild(d);
  }
  async function resumeAC(){ try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
    window.__ac__=window.__ac__||new AC();
    if(window.__ac__.state==='suspended') await window.__ac__.resume();
    const o=window.__ac__.createOscillator(), g=window.__ac__.createGain(); g.gain.value=0;
    o.connect(g).connect(window.__ac__.destination); o.start(); o.stop(window.__ac__.currentTime+0.01); return true;
  }catch{return false;} }
  async function unlock(){ const ok=await resumeAC(); if(ok){ const el=document.getElementById(ID); if(el) el.style.display='none'; } }
  function init(){ mk(); const el=document.getElementById(ID); if(el) el.style.display='block';
    document.addEventListener('pointerdown', unlock, {once:false, passive:true});
    document.addEventListener('keydown', unlock, {once:false});
    document.getElementById('audioUnlockBtn')?.addEventListener('click', unlock);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  window.__AUDIO_UNLOCK__={unlock};
})();
