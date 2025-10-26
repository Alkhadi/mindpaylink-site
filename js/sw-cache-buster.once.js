(()=>{try{
 const VER='__AUTO__';
 const KEY='__mshare_swfix__';
 if(localStorage.getItem(KEY)===VER)return;
 localStorage.setItem(KEY,VER);
 if(navigator.serviceWorker){
   navigator.serviceWorker.getRegistrations().then(rs=>{
     rs.forEach(r=>{try{r.unregister();}catch(e){}});
   });
 }
 if(window.caches){
   caches.keys().then(keys=>{
     keys.forEach(k=>{try{caches.delete(k);}catch(e){}});
   });
 }
 try{
   const u=new URL(location.href);
   u.searchParams.set('_v',VER);
   if(location.href!==u.toString()) location.replace(u.toString());
 }catch(e){location.reload();}
}catch(e){console.error(e);}})();
