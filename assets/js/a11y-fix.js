(function(){
  function hasAccName(el){
    if(el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby')||el.hasAttribute('title')||el.hasAttribute('placeholder')) return true;
    var id=el.getAttribute('id'); if(!id) return false;
    return !!document.querySelector('label[for="'+id+'"]');
  }
  function labelFromContext(el){
    var name=el.getAttribute('name')||el.id||el.getAttribute('data-label')||'Control';
    name=String(name).replace(/[_\-]+/g,' ').trim();
    if(!name){ var lab=el.closest('label'); if(lab) name=(lab.textContent||'').trim(); }
    return name||'Control';
  }
  function fix(){
    var ctrls=[].slice.call(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
    ctrls.forEach(function(el){
      if(hasAccName(el)) return;
      var t=el.tagName.toLowerCase();
      var label=(t==='select'?'Select option':labelFromContext(el));
      el.setAttribute('aria-label',label);
      el.setAttribute('title',label);
      if(t==='input' && !el.getAttribute('placeholder')) el.setAttribute('placeholder',' ');
    });
    [].slice.call(document.querySelectorAll('button')).forEach(function(b){ if(!b.getAttribute('type')) b.setAttribute('type','button'); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fix); else fix();
})();
