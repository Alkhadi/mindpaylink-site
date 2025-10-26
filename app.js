(()=>{try{
 const VER="20251026-1509-va-fix", KEY="__mshare_swfix__";
 if(localStorage.getItem(KEY)===VER) return;
 localStorage.setItem(KEY,VER);
 if(navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
   navigator.serviceWorker.getRegistrations().then(rs=>{ rs.forEach(r=>{ try{ r.unregister(); }catch(_e){} }); });
 }
 if(window.caches && caches.keys){
   caches.keys().then(keys=>{ keys.forEach(k=>{ try{ caches.delete(k); }catch(_e){} }); });
 }
 try{
   const u=new URL(location.href);
   u.searchParams.set("_v", VER);
   if(location.href!==u.toString()) location.replace(u.toString()); else location.reload();
 }catch(_e){ try{ location.reload(); }catch(_e2){} }
}catch(_err){}})();
// Legacy duplicate file (not referenced by any page). Kept as a harmless stub.
// The site uses the root-level `app.js` and unified header/footer scripts.
