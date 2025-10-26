(()=>{"use strict";
const MIN=4.5;function srgbToLin(c){c/=255;return(c<=0.03928)?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function lum(r,g,b){return 0.2126*srgbToLin(r)+0.7152*srgbToLin(g)+0.0722*srgbToLin(b);}
function parseRGB(s){const m=(s||"").match(/(\d+)\D+(\d+)\D+(\d+)/);if(!m)return null;return [m[1]|0,m[2]|0,m[3]|0];}
function ratio(fg,bg){const L1=lum(fg[0],fg[1],fg[2]),L2=lum(bg[0],bg[1],bg[2]);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return(hi+0.05)/(lo+0.05);}
function findBg(el){let e=el;while(e&&e!==document.documentElement){const cs=getComputedStyle(e),bg=cs.backgroundColor;if(bg&&bg!=="transparent"&&bg!=="rgba(0, 0, 0, 0)")return parseRGB(bg);e=e.parentElement;}
  return parseRGB(getComputedStyle(document.body).backgroundColor)||[255,255,255];}
function fix(){const body=document.body;const palette=["#F2F2FF","#A8A9C6","#F7F7FB"];const dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
  body.style.backgroundColor=dark?palette[0]:palette[1];
  const q=document.querySelectorAll("main, section, article, .card, .panel, .content, button, .btn, .button, .cta");
  q.forEach(el=>{if(el.closest("header, footer, nav"))return;const cs=getComputedStyle(el),fg=parseRGB(cs.color),bg=findBg(el);if(!fg||!bg)return;
    const r=ratio(fg,bg); if(r<MIN){const L=lum(bg[0],bg[1],bg[2]);el.style.color=(L>0.5)?"#111827":"#FFFFFF";}});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fix,{once:true});else fix();
})();
