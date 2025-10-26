(()=>{ try{
  const VER='20251026-1639-va-fix', KEY='__mshare_swfix__';
  if(localStorage.getItem(KEY)===VER) return;
  localStorage.setItem(KEY, VER);

  if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
    navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>{ try{ r.unregister(); }catch{} }));
  }
  if(window.caches && caches.keys){
    caches.keys().then(ks=>ks.forEach(k=>{ try{ caches.delete(k); }catch{} }));
  }
  try{
    const u=new URL(location.href); u.searchParams.set('_v', VER);
    if(location.href!==u.toString()) location.replace(u.toString());
    else location.reload();
  }catch{ try{ location.reload(); }catch{} }
}catch(e){} })();
