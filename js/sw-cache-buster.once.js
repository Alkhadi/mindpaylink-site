(()=>{try{
 const VER='${VER}';
 const KEY='__mshare_swfix__';
 if(localStorage.getItem(KEY)===VER)return;
 localStorage.setItem(KEY,VER);
 if(navigator.serviceWorker)navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister())));
 if(window.caches) caches.keys().then(k=>k.forEach(x=>caches.delete(x)));
 const u=new URL(location.href);u.searchParams.set('_v',VER);
 location.replace(u.toString());
}catch(e){location.reload();}})();
