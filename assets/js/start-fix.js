(function(){
  var $=function(s,el){return (el||document).querySelector(s)}, $$=function(s,el){return Array.from((el||document).querySelectorAll(s))};
  function norm(t){return String(t||'').replace(/\s+/g,' ').trim().toLowerCase()}
  function isVoidLink(a){if(a.tagName!=='A')return false;var h=(a.getAttribute('href')||'').trim();return !h||h==='#'||h==='#!'||/^javascript:/i.test(h)}
  function hasStartWord(s){s=norm(s);return /(^|\b)(start|begin|go|run|play|practice|model)\b/.test(s)&&!/\b(stop|end|pause|finish|halt)\b/.test(s)}
  function hasStopWord(s){s=norm(s);return /(^|\b)(stop|end|finish|halt|pause)\b/.test(s)}
  function canonical(btn,kind){
    var container=btn.closest('#pacer,#searchTool,#schulte,#ran,#svStudio,#pronLab,#vcPhon,#vcLadder,.card,section,main')||document.body;
    var startSel=['#pStart','#sStart','#schStart','#ranGo','#svPractice','#pronPractice','#vcPlay','#ladderPlay','#morphPlay','#svCam'];
    var stopSel=['#pStop','#sStop','#schStop','#ranStop','#svStop','#pronStop','#vcStop','#ladderStop','#morphStop','#svCamOff'];
    var list=kind==='start'?startSel:stopSel;
    var inScope=list.map(function(sel){return $(sel,container)}).filter(Boolean)[0];
    if(inScope) return inScope;
    var global=list.map(function(sel){return $(sel)}).filter(Boolean)[0];
    return global||null;
  }
  function normalize(){
    $$('button').forEach(function(b){if(!(b.getAttribute('type')||'').trim()) b.setAttribute('type','button')});
    $$('a.btn:not([href]),a.btn[href=""]').forEach(function(a){a.setAttribute('href','#')});
  }
  function handle(e){
    var el=e.target.closest('button, a.btn, a[role="button"]'); if(!el) return;
    var txt=norm(el.textContent||el.value||'');
    var kind=el.dataset.act==='start'?'start':el.dataset.act==='stop'?'stop':hasStartWord(txt)?'start':hasStopWord(txt)?'stop':'';
    if(!kind) return;
    if(el.tagName==='A' && isVoidLink(el)) e.preventDefault();
    if(el.tagName==='BUTTON' && !el.getAttribute('type')){ el.setAttribute('type','button'); }
    var can=canonical(el,kind);
    if(can && can!==el){
      e.preventDefault();
      try{ if(can.disabled) can.disabled=false }catch(_){}
      can.click();
    }
  }
  document.addEventListener('click',handle,true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',normalize); else normalize();
})();
