(()=>{const MIN=4.5;
function lum(r,g,b){r/=255;g/=255;b/=255;[r,g,b]=[r,g,b].map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*r+0.7152*g+0.0722*b;}
function contrast(a,b){const L1=lum(...a),L2=lum(...b);return(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
function parse(c){const m=c.match(/\d+/g)||[];return m.map(Number);}
function fix(){document.querySelectorAll('main,section,article,div,button').forEach(el=>{
 const bg=getComputedStyle(el).backgroundColor,fg=getComputedStyle(el).color;
 if(!bg||!fg||bg==='transparent')return;
 const r=contrast(parse(fg),parse(bg));if(r<MIN){const [R,G,B]=parse(bg),L=lum(R,G,B);
 el.style.color=L>0.5?'#111827':'#FFF';}});}
window.addEventListener('load',fix);})();
