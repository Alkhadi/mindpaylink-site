(()=>{const D=document,W=window,EVT='mshare-voice:state';let state='idle';
const langs=['en-GB','en-US'];
function voices(){return (W.speechSynthesis?.getVoices()||[]).filter(v=>langs.includes(v.lang));}
function setState(s){state=s;D.dispatchEvent(new CustomEvent(EVT,{detail:s}));}
function stop(){if(W.speechSynthesis)W.speechSynthesis.cancel();setState('idle');}
function speak(t){const vs=voices();if(!vs.length){alert('No English voice available');return;}
const u=new SpeechSynthesisUtterance(t||D.body.innerText);u.voice=vs.find(v=>v.lang==='en-GB')||vs[0];
u.onstart=()=>setState('speaking');u.onend=()=>setState('idle');W.speechSynthesis.speak(u);}
function bind(){D.querySelectorAll('[data-voice="start"]').forEach(b=>b.onclick=()=>speak());
D.querySelectorAll('[data-voice="stop"]').forEach(b=>b.onclick=()=>stop());}
D.addEventListener('DOMContentLoaded',bind);})();
