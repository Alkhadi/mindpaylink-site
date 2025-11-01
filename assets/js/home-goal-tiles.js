(function(){
  const hs=[...document.querySelectorAll("h2,h3,h4")];
  for(const h of hs){
    if(/pick your goal/i.test(h.textContent||"")){
      let el=h.nextElementSibling;
      for(let i=0;i<3 && el;i++){
        const links=el.querySelectorAll("a,button");
        if(links.length>=4){ el.setAttribute("data-goal-tiles",""); return; }
        el=el.nextElementSibling;
      }
    }
  }
})();
