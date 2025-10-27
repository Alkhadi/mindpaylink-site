/* __tts_crossbrowser_shim__ (VER=202510272102-tts-shim) */
(function(){
  if (window.__ttsShimV1) return; window.__ttsShimV1=true;
  var synth = window.speechSynthesis, unlocked=false, voices=[];

  function unlock(){
    if (unlocked) return; unlocked=true;
    try{ synth && synth.resume && synth.resume(); }catch(e){}
    try{
      var AC=window.AudioContext||window.webkitAudioContext; if (AC) {
        var ac=new AC(), o=ac.createOscillator(), g=ac.createGain();
        g.gain.value=0; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+0.01);
      }
    }catch(e){}
  }
  ['pointerdown','click','touchstart','keydown'].forEach(ev=>{
    window.addEventListener(ev, function once(){ unlock(); window.removeEventListener(ev, once, true); }, {once:true,capture:true,passive:true});
  });

  function loadVoices(){ try{ voices = (synth && synth.getVoices) ? synth.getVoices()||[] : []; } catch(e){ voices=[]; } return voices.length>0; }
  function voicesReady(ms){
    ms=ms||5000;
    return new Promise(res=>{
      if (loadVoices()) return res(voices);
      var t0=Date.now(), iv=setInterval(function(){
        if (loadVoices() || (Date.now()-t0>ms)) { clearInterval(iv); res(voices); }
      }, 150);
      if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged=function(){ if (loadVoices()){ clearInterval(iv); res(voices); } };
    });
  }

  var PREFER=[/\bDaniel\b/i,/Google UK English Male/i,/Google UK English/i,/UK English/i];
  function pickVoice(){
    for (var i=0;i<PREFER.length;i++){ var v=voices.find(v=>PREFER[i].test(v.name)); if (v) return v; }
    var v=voices.find(v=>/^en-GB/i.test(v.lang)) || voices.find(v=>/^en-/i.test(v.lang));
    return v || voices[0] || null;
  }

  var Native=window.SpeechSynthesisUtterance;
  if (Native){
    var Patched=function(text){ var u=new Native(text); try{ u.lang=u.lang||'en-GB'; if (!u.voice && voices.length){ var pv=pickVoice(); if (pv) u.voice=pv; } }catch(e){} return u; };
    Patched.prototype=Native.prototype; window.SpeechSynthesisUtterance=Patched;
  }

  async function speak(text, opts){
    if (!text) return null; opts=opts||{};
    await voicesReady(5000); unlock();
    try{ synth.cancel(); }catch(e){}
    var u=new SpeechSynthesisUtterance(text);
    var v=pickVoice(); if (v) u.voice=v;
    u.lang='en-GB'; u.rate=(opts.rate??1); u.pitch=(opts.pitch??1);
    synth.speak(u); return u;
  }
  function stop(){ try{ synth.cancel(); }catch(e){} }

  window.MShareTTS={ ready:()=>voicesReady(5000), list:()=>voices.slice(), pickVoice:()=>pickVoice(), speak, stop };
  voicesReady(5000);
})();