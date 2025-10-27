/* __voicecoach_defaults_v2__ — Daniel (en-GB) default + safe unlock */
(function(){
  if (window.__vcDefaultsV2) return; window.__vcDefaultsV2=true;
  var synth = window.speechSynthesis, unlocked=false, chosen=null;

  function pickVoice() {
    try {
      var list = synth && synth.getVoices ? synth.getVoices() : [];
      chosen = list.find(v=>/\bDaniel\b/i.test(v.name)) || list.find(v=>/^en-GB/i.test(v.lang)) || null;
      return chosen;
    } catch(e) { return null; }
  }
  function ensureUnlock(){
    if (unlocked) return;
    unlocked = true;
    try{ synth.resume && synth.resume(); }catch(e){}
    try{
      var AC = window.AudioContext||window.webkitAudioContext;
      if (AC){ var ac=new AC(), o=ac.createOscillator(), g=ac.createGain(); g.gain.value=0; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+0.01); }
    }catch(e){}
  }
  // Monkey-patch utterance to default to Daniel/en-GB if caller didn't set voice
  var Old=window.SpeechSynthesisUtterance;
  if (Old){
    var Patched=function(text){ var u=new Old(text); try{
      u.lang = u.lang || 'en-GB';
      var pv = pickVoice(); if (pv && !u.voice) u.voice = pv;
    } catch(e){} return u; };
    Patched.prototype = Old.prototype;
    window.SpeechSynthesisUtterance = Patched;
  }
  if (synth && synth.onvoiceschanged!==undefined) synth.onvoiceschanged = pickVoice;
  setTimeout(pickVoice, 250);

  // “TTS on by default after first user gesture”
  ['click','touchstart','pointerdown','keydown'].forEach(ev=>{
    window.addEventListener(ev, function once(){ ensureUnlock(); window.removeEventListener(ev, once, true); }, {once:true,capture:true,passive:true});
  });

  // Expose minimal API for your coach code (optional use)
  window.MShareVoiceCoach = {
    getDefaultVoice: ()=> (pickVoice()||null),
    unlocked: ()=> unlocked
  };
})();