(function(){
  try{
    var VER = new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,12);
    var KEY = "__mshare_swfix__";
    if (localStorage.getItem(KEY)===VER) return;
    localStorage.setItem(KEY, VER);

    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
      navigator.serviceWorker.getRegistrations().then(function(rs){
        rs.forEach(function(r){ try{ r.unregister(); }catch(e){} });
      });
    }
    if (window.caches && caches.keys){
      caches.keys().then(function(keys){
        keys.forEach(function(k){ try{ caches.delete(k); }catch(e){} });
      });
    }
    try{
      var u=new URL(location.href);
      u.searchParams.set("_v", VER);
      if (location.href!==u.toString()) location.replace(u.toString());
    }catch(e){ try{ location.reload(); }catch(_){} }
  }catch(e){}
})();
