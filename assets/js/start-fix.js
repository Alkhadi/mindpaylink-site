(function(){
  var $=function(s,el){return (el||document).querySelector(s)}, $$=function(s,el){return Array.from((el||document).querySelectorAll(s))};
  function isTechniquePage(){
    var p=(location.pathname.split('/').pop()||'').toLowerCase();
    return /^(box-breathing|4-7-8-breathing|coherent-5-5|sos|sos-60)\.html$/.test(p);
  }
  function normalizeButtons(){
    $$('button').forEach(function(b){ if(!b.getAttribute('type')) b.setAttribute('type','button'); });
    $$('a.btn:not([href]),a.btn[href=""]').forEach(function(a){ a.setAttribute('href','#'); });
  }
  function delegateStartStop(){
    if(isTechniquePage()) return;
    document.addEventListener('click',function(e){
      var el=e.target.closest('button, a.btn, [role="button"]'); if(!el) return;
      var txt=(el.innerText||el.textContent||'').trim().toLowerCase();
      var act=el.dataset.act||(/\bstart\b/.test(txt)?'start':(/\b(stop|end|finish|pause)\b/.test(txt)?'stop':''));
      if(!act) return;
      var scope=el.closest('#pacer,#svStudio,#pronLab,#searchTool,#schulte,#ran,.technique,.coach,.card,section,main')||document;
      var START=['[data-act="start"]','#pStart','#svPractice','#pronPractice','#sStart','#schStart','#ranGo','#vcPlay','#ladderPlay','#morphPlay'];
      var STOP =['[data-act="stop"]' ,'#pStop' ,'#svStop' ,'#pronStop' ,'#sStop' ,'#schStop' ,'#ranStop' ,'#vcStop' ,'#ladderStop' ,'#morphStop'];
      var list=act==='start'?START:STOP, target=null;
      for(var i=0;i<list.length;i++){ var q=list[i], f=scope.querySelector(q)||document.querySelector(q); if(f&&f!==el){ target=f; break; } }
      if(target){
        if(el.tagName==='A') e.preventDefault();
        try{ if(target.disabled) target.disabled=false }catch(_){}
        target.click();
      }
    },true);
  }
  function run(){ normalizeButtons(); delegateStartStop(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
