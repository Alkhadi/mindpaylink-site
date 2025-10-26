(() => {
  const D=document,W=window;
  const EVT='mshare-voice:state';
  let state='idle';
  const allowedLangs=['en-GB','en-US'];
  function filterVoices(){
    const v=W.speechSynthesis?.getVoices()||[];
    return v.filter(vv=>allowedLangs.includes(vv.lang));
  }
  function setState(s){state=s;D.dispatchEvent(new CustomEvent(EVT,{detail:s}));}
  function stopSpeaking(){
    if(W.speechSynthesis) W.speechSynthesis.cancel();
    setState('idle');
  }
  function speak(txt){
    const vs=filterVoices(); if(!vs.length){alert('No EN voice available');return;}
    const u=new SpeechSynthesisUtterance(txt||D.body.innerText);
    u.voice=vs.find(v=>v.lang==='en-GB')||vs[0];
    u.onstart=()=>setState('speaking');u.onend=()=>setState('idle');
    W.speechSynthesis.speak(u);
  }
  function bind(){
    D.querySelectorAll('[data-voice="start"]').forEach(b=>b.onclick=()=>speak());
    D.querySelectorAll('[data-voice="stop"]').forEach(b=>b.onclick=()=>stopSpeaking());
  }
  D.addEventListener('DOMContentLoaded',bind);
})();
