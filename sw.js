<script>
(async function(){
  // Register service worker, omitted here for brevity …
  self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open('mshare-v1').then(c => c.addAll([
      './', './index.html', './style.css', './app.js',
      './bank.html', './wellbeing.html', './pdf.html',
      './manifest.webmanifest'
    ]).catch(()=>{})));
  });
  self.addEventListener('activate', (e) => { self.clients.claim(); });
  self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (url.origin === location.origin) {
      e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    }
  });


  const p = new URLSearchParams(location.search);
  const get = (k,d='') => p.get(k) ?? d;

  const data = {
    name: get('n', 'Alkhadi Koroma'),
    title: get('title', 'M Share • Digital Profile'),
    phone: get('ph'),
    email: get('em'),
    site: get('s'),
    addr: get('a'),
    avatar: get('av', 'https://picsum.photos/400?random=7'),
    acc: get('ac'), sort: get('sc'), iban: get('ib'), ref: get('r','M SHARE'),
    x: get('x'), ig: get('ig'), yt: get('yt'), ln: get('ln')
  };

  // Assign values to the DOM, same as before …
  if (data.phone) { phoneA.href = 'tel:' + data.phone; phoneA.textContent = data.phone; }
  if (data.email) { emailA.href = 'mailto:' + data.email; emailA.textContent = data.email; }
  if (data.site)  { siteA.href = data.site; siteA.textContent = data.site; }
  if (data.addr)  { addr.innerHTML = '<a target="_blank" href="https://maps.google.com/?q=' + encodeURIComponent(data.addr) + '">' + data.addr + '</a>'; }

  acc.textContent  = data.acc || '—';
  sort.textContent = data.sort || '—';
  iban.textContent = data.iban || '—';
  ref.textContent  = data.ref || 'M SHARE';

  if (data.x)  xA.href  = data.x;
  if (data.ig) igA.href = data.ig;
  if (data.yt) ytA.href = data.yt;
  if (data.ln) lnA.href = data.ln;

  // Build a query string using short keys and omitting empty values.
  const parts = [];
  const add = (key, value) => { if (value && value.trim() !== '') parts.push(key + '=' + encodeURIComponent(value)); };
  add('n', data.name);
  add('ph', data.phone);
  add('em', data.email);
  add('s', data.site);
  add('a', data.addr);
  add('av', data.avatar);
  add('ac', data.acc);
  add('sc', data.sort);
  add('ib', data.iban);
  add('r', data.ref);
  add('x', data.x);
  add('ig', data.ig);
  add('yt', data.yt);
  add('ln', data.ln);
  const qp = parts.length ? '?' + parts.join('&') : '';

  toPdf.href       = 'pdf.html' + qp;
  toBank.href      = 'bank.html' + qp;
  toWellbeing.href = 'wellbeing.html' + qp;
})();
</script>
