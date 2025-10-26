(()=>{ "use strict";
const MIN=4.5;
const SEL='main,section,article,.section,.card,button,.btn,.button,.cta';
function toRGB(c){ const m=(c||'').match(/\d+/g)||[]; return m.slice(0,3).map(Number); }
function lum(r,g,b){ r/=255; g/=255; b/=255; const f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); }
function contrast(a,b){ const L1=lum(...a),L2=lum(...b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); }
function fix(root=document){
  root.querySelectorAll(SEL).forEach(el=>{
    const cs=getComputedStyle(el);
    if(!cs || cs.backgroundColor==='transparent') return;
    const bg=toRGB(cs.backgroundColor), fg=toRGB(cs.color);
    if(bg.length<3 || fg.length<3) return;
    const ratio=contrast(fg,bg);
    if(ratio<MIN){
      const L=lum(...bg); el.style.color = (L>0.5 ? '#111827' : '#FFFFFF');
    }
  });
}
if(document.readyState==='loading') window.addEventListener('DOMContentLoaded', ()=>fix(), {once:true}); else fix();
try{ const mo=new MutationObserver(m=>{ for(const x of m){ for(const n of x.addedNodes){ if(n.nodeType===1) fix(n); } } }); mo.observe(document.body,{subtree:true,childList:true}); }catch{}
})();
