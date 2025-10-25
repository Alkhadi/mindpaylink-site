(function(){
  const W = window, D = document;
  const onReady = (cb)=>{ if (D.readyState!=='loading') cb(); else D.addEventListener('DOMContentLoaded', cb, {once:true}); };
  const waitMS = (cb)=>{ (function poll(){ const V=W.__MSHARE__&&W.__MSHARE__.Voice; if(V&&V.__ready){cb(V);} else setTimeout(poll,80); })(); };

  onReady(()=>waitMS((Voice)=>{
    let state='idle';
    const q=(s,c=D)=>c.querySelector(s), qa=(s,c=D)=>Array.from(c.querySelectorAll(s));
    const panel=()=>D.getElementById('mshare-voicebot');

    function setState(s){
      if(state===s) return; state=s;
      D.documentElement.setAttribute('data-voice-state', s);
      const p=panel();
      if(p){
        p.classList.remove('is-idle','is-speaking','is-paused');
        p.classList.add(s==='speaking'?'is-speaking':s==='paused'?'is-paused':'is-idle');
        const btnStart=q('[data-voice-action="start"]',p);
        const btnPause=q('[data-voice-action="pause"]',p);
        const btnResume=q('[data-voice-action="resume"]',p);
        const btnStop=q('[data-voice-action="stop"]',p);
        if(btnStart){ btnStart.disabled=(s!=='idle'); btnStart.setAttribute('aria-pressed', s==='speaking'); }
        if(btnPause){ btnPause.disabled=(s!=='speaking'); }
        if(btnResume){ btnResume.disabled=(s!=='paused'); }
        if(btnStop){ btnStop.disabled=(s==='idle'); }
      }
      qa('[data-voice="start"]').forEach(b=>{ b.disabled=(s!=='idle'); b.setAttribute('aria-pressed', s==='speaking'); });
      qa('[data-voice="stop"]').forEach(b=>{ b.disabled=(s==='idle'); b.setAttribute('aria-pressed', s!=='idle'); });
      W.dispatchEvent(new CustomEvent('mshare-voice:state',{detail:{state:s}}));
    }

    const orig={ speak:Voice.speak, pause:Voice.pause, resume:Voice.resume, stop:Voice.stop };

    Voice.speak = async (t)=>{
      setState('speaking');
      const res = await orig.speak.call(Voice, t);
      if(!res || res.ok!==true){
        const ss=W.speechSynthesis; if(ss&&ss.paused) setState('paused'); else setState('idle');
        return res;
      }
      setState('idle'); return res;
    };
    Voice.pause = ()=>{ orig.pause.call(Voice); setState('paused'); };
    Voice.resume= ()=>{ orig.resume.call(Voice); setState('speaking'); };
    Voice.stop  = ()=>{ orig.stop.call(Voice);   setState('idle'); };

    function textFromButton(btn){
      const a=btn.getAttribute('data-voice-text'); if(a&&a.trim()) return a.trim();
      const sel=btn.getAttribute('data-voice-target'); if(sel){ const el=D.querySelector(sel); if(el){ const t=(el.innerText||el.textContent||'').trim(); if(t) return t; } }
      const scope=(btn.getAttribute('data-voice-scope')||'').toLowerCase();
      if(scope==='selection'){ const s=W.getSelection&&W.getSelection(); const t=s&&s.rangeCount?(s.toString()||'').trim():''; if(t) return t; }
      if(scope==='visible'){ try{ const main=D.querySelector('main'); const t=(main?.innerText||D.body.innerText||'').trim(); return t; }catch{} }
      return '';
    }

    function bindButtons(ctx=D){
      qa('[data-voice]', ctx).forEach(el=>{
        if(el.dataset.voiceBound) return; el.dataset.voiceBound="1";
        const type=el.getAttribute('data-voice');
        const stopProp=(e)=>{ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); };
        if(type==='start'){
          el.addEventListener('click',(e)=>{ stopProp(e); if(state!=='idle'){ Voice.stop(); }
            const t=textFromButton(el); if(t) Voice.speak(t); else Voice.speak();
          });
        } else if(type==='stop'){
          el.addEventListener('click',(e)=>{ stopProp(e); Voice.stop(); });
        } else if(type==='pause'){
          el.addEventListener('click',(e)=>{ stopProp(e); Voice.pause(); });
        } else if(type==='resume'){
          el.addEventListener('click',(e)=>{ stopProp(e); Voice.resume(); });
        } else if(type==='toggle'){
          el.addEventListener('click',(e)=>{ stopProp(e);
            if(state==='speaking') Voice.pause();
            else if(state==='paused') Voice.resume();
            else { const t=textFromButton(el); if(t) Voice.speak(t); else Voice.speak(); }
          });
        }
      });
    }

    bindButtons();
    const mo=new MutationObserver(m=>{ for(const x of m){ for(const n of Array.from(x.addedNodes)){ if(n.nodeType===1) bindButtons(n); } } });
    try{ mo.observe(D.body,{subtree:true,childList:true}); }catch{}

    const ss=W.speechSynthesis; if(ss&&ss.speaking) setState('speaking'); else setState('idle');
  }));
})();
