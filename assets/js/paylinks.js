(function(){
  'use strict';
  var STRIPE_URL = 'https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00';

  function isSupportAnchor(a){
    if(!a) return false;
    var id=(a.id||'').toLowerCase();
    var cls=(a.className||'').toLowerCase();
    var href=(a.getAttribute('href')||'').toLowerCase();
    var txt=(a.textContent||'').toLowerCase();
    if (/paypal/.test(href) || /paypal/.test(id) || /paypal/.test(cls) || /paypal/.test(txt)) return false;
    if (/(coffee|support|donate|tip)/.test(id)) return true;
    if (/(coffee|support|donate|tip)/.test(cls)) return true;
    if (/coffee\.html/.test(href)) return true;
    if (/support/.test(href)) return true;
    if (/(support\s*us|buy\s*me\s*coffee|support)/i.test(txt)) return true;
    return false;
  }

  function retarget(a){
    a.href = STRIPE_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.pay = 'stripe';
  }

  function addPayBar(afterEl){
    try{
      if(!afterEl) return;
      if(document.getElementById('payBarGlobal')) return;
      var bar = document.createElement('div');
      bar.id='payBarGlobal';
      bar.className='actions';
      bar.style.marginTop='10px';
      function mk(label,id){
        var b=document.createElement('a');
        b.className='btn'; b.id=id; b.href=STRIPE_URL; b.target='_blank'; b.rel='noopener'; b.textContent=label;
        return b;
      }
      var btns=[
        mk(' Apple Pay','payAppleGlobal'),
        mk('Google Pay','payGoogleGlobal'),
        mk('💳 Card','payCardGlobal'),
        mk('Cash App','payCashAppGlobal'),
        mk('Link by Stripe','payLinkGlobal')
      ];
      btns.forEach(function(b){ bar.appendChild(b); });
      var p = afterEl.parentElement || document.body;
      p.insertBefore(bar, afterEl.nextSibling);
      if(!window.ApplePaySession){ var ap=document.getElementById('payAppleGlobal'); if(ap) ap.style.display='none'; }
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', function(){
    // 1) Rewrite obvious existing links
    Array.prototype.forEach.call(document.querySelectorAll('a'), function(a){
      if (isSupportAnchor(a)) retarget(a);
    });

    // 2) Specific IDs people often use
    Array.prototype.forEach.call(document.querySelectorAll('#coffeeCTA, a[href*="coffee.html"]'), function(a){
      retarget(a);
    });

    // 3) If there is a visible support link, append Apple/Google/Card/etc bar after it
    var ref = document.querySelector('a[data-pay="stripe"], #coffeeCTA, a[href*="coffee.html"], a:contains("Buy me coffee"), a:contains("Support Us")');
    // :contains is not standard; grab again by text manually
    if(!ref){
      var all = document.querySelectorAll('a');
      for (var i=0;i<all.length;i++){
        var t=(all[i].textContent||'').toLowerCase();
        if(/(buy\s*me\s*coffee|support\s*us|support)/.test(t)){ ref=all[i]; break; }
      }
    }
    if(ref) addPayBar(ref);
  });
})();
