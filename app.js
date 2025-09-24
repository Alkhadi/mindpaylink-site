/* M Share • Pro — 2025 app core
   - Profile model (JSON + URL overrides)
   - Nav wiring + share sheet
   - Stats (local-date aware)
   - Weekly chart + Today line
   - Bank helpers
   - PNG hero builder (avatar on photo bg)
   - Minimal PDF writer (valid A4, hyperlinks)
   - Device Locker (base64, quota, export/import)
   - QR modal (simple, CDN-free via chart API fallback)
*/
(() => {
  'use strict';
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => el.querySelectorAll(s);

  // -----------------------
  // Router-friendly nav
  // -----------------------
  function wireNav(){
    const nav = $('#mainNav'); const btn = $('#navToggle');
    if(btn) btn.addEventListener('click', ()=> nav.classList.toggle('open'));
    const qs = location.search || '';
    $$('[data-href]').forEach(a=> a.setAttribute('href', a.getAttribute('data-href') + qs));
    const brand = $('#brandLink'); if(brand) brand.setAttribute('href', 'index.html' + qs);
  }
  wireNav();

  // -----------------------
  // Profile: load default, apply URL overrides, persist locally
  // -----------------------
  const P = new URLSearchParams(location.search);
  function pick(...keys){ for(const k of keys){ const v=P.get(k); if(v!==null && v!=='') return v; } return ''; }
  const fallbackProfile = {
    name: 'Alkhadi Koroma',
    title: 'Professional Title · Flutter Developer',
    phone: '07736806367',
    email: 'ngummariato@gmail.com',
    site: 'https://google.com',
    addr: 'Flat 72, Priory Court,\n1 Cheltenham Road,\nLondon SE15 3BG,\nUnited Kingdom',
    avatar: 'assets/alkhadi.png',
    bg: 'assets/amz.jpg',
    wellbeing: 'https://wellbeing.example.com',
    acc: '93087283', sort: '09-01-35', iban: 'GB81ABBY09013593087283', ref: 'M SHARE',
    x:'', ig:'', yt:'', ln:''
  };
  const LOCAL_KEY='mshare_default_profile_v2';
  async function loadProfile(){
    try{
      const saved = JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');
      if(saved) return saved;
      const r = await fetch('assets/default_profile.json').catch(()=>null);
      if(r && r.ok){ const j = await r.json(); localStorage.setItem(LOCAL_KEY, JSON.stringify(j)); return j; }
    }catch{}
    localStorage.setItem(LOCAL_KEY, JSON.stringify(fallbackProfile));
    return fallbackProfile;
  }
  function withOverrides(base){
    const map = {
      name:pick('n','name'), title:pick('title'),
      phone:pick('ph','phone'), email:pick('em','email'), site:pick('s','site'),
      addr:pick('a','addr'), avatar:pick('av','avatar'), bg:pick('bg','background'),
      wellbeing:pick('wb','wellbeing'), acc:pick('ac','acc'), sort:pick('sc','sort'),
      iban:pick('ib','iban'), ref:pick('r','ref'), x:pick('x'), ig:pick('ig'), yt:pick('yt'), ln:pick('ln')
    };
    const out = {...base};
    for(const [k,v] of Object.entries(map)) if(v) out[k]=v;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(out));
    return out;
  }

  let data = fallbackProfile;
  // init async (but also expose sync defaults immediately)
  loadProfile().then(p => { data = withOverrides(p); });

  // Build cross-page query string
  function buildQP(d){
    const map = { n:d.name, title:d.title, ph:d.phone, em:d.email, s:d.site, a:d.addr, av:d.avatar, bg:d.bg, wb:d.wellbeing, ac:d.acc, sc:d.sort, ib:d.iban, r:d.ref };
    const parts=[]; for(const [k,v] of Object.entries(map)) if(v && String(v).trim()!=='') parts.push(k+'='+encodeURIComponent(v));
    return parts.length ? ('?'+parts.join('&')) : '';
  }
  const qp = buildQP(data);

  // -----------------------
  // Share sheet + helpers
  // -----------------------
  function makeShareText(){
    const lines = [
      `${data.name} — ${data.title}`,
      `Phone: ${data.phone}`, `Email: ${data.email}`,
      `Site: ${data.site}`, `Wellbeing: ${data.wellbeing}`,
      `Address: ${data.addr.replace(/\n/g, ', ')}`,
      `Buy me coffee: ${location.origin+location.pathname.replace(/[^/]*$/,'')+'bank.html'+qp}`
    ];
    return lines.join('\n');
  }
  function openShareSheet(){
    const sheet = $('#shareSheet'); if(!sheet) return;
    const txt = $('#shareText'); if(txt) txt.value = makeShareText();
    sheet.classList.add('open');
  }
  function closeShare(){ $('#shareSheet')?.classList.remove('open'); }
  $('#shareOpen')?.addEventListener('click', openShareSheet);
  $('#shareClose')?.addEventListener('click', closeShare);
  $('#shareBackdrop')?.addEventListener('click', closeShare);
  $('#copyShare')?.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText($('#shareText').value); toast('Copied.'); }catch{ toast('Copy failed'); }});
  $('#shareNative')?.addEventListener('click', async ()=>{
    const text = $('#shareText')?.value || makeShareText();
    if(navigator.share){ try{ await navigator.share({ text }); } catch{} }
    else { try{ await navigator.clipboard.writeText(text); toast('Copied for sharing'); }catch{} }
  });

  // -----------------------
  // Bank helpers
  // -----------------------
  function bankDetailsString(){
    return [
      `${data.name} — ${data.ref || 'M SHARE'}`,
      `Acc: ${data.acc}`, `Sort: ${data.sort}`, `IBAN: ${data.iban}`
    ].join('\n');
  }
  function openAppOrStore(scheme, name){
    const url = scheme;
    const timer = setTimeout(()=>{ window.open('https://www.google.com/search?q='+encodeURIComponent(name+' bank app'), '_blank'); }, 1200);
    location.href = url; setTimeout(()=>clearTimeout(timer), 2000);
  }

  // -----------------------
  // Stats (local-date aware)
  // -----------------------
  function localDateKey(d = new Date()){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  function parseDateKey(k){ const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d); }
  function dayDiff(a,b){ const A=new Date(a.getFullYear(),a.getMonth(),a.getDate()), B=new Date(b.getFullYear(),b.getMonth(),b.getDate()); return Math.round((B-A)/86400000); }
  const STATS_KEY='mshare_wellbeing_stats_v2';
  const MSStats = {
    load(){ try{ return JSON.parse(localStorage.getItem(STATS_KEY)||'{}')||{}; }catch{ return {}; } },
    save(s){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(s)); }catch{} },
    addSession({ techId, seconds, breaths }){
      const s=this.load();
      s.totalMinutes=(s.totalMinutes||0)+seconds/60; s.totalBreaths=(s.totalBreaths||0)+(breaths||0); s.totalSessions=(s.totalSessions||0)+1;
      const todayKey=localDateKey(new Date()); const daily=s.daily||{}; daily[todayKey]=(daily[todayKey]||0)+Math.round(seconds/60); s.daily=daily;
      const tk=s.techniques=s.techniques||{}; const t=tk[techId]||{totalMinutes:0,totalBreaths:0,dayStreak:0,lastCompletedDay:null,totalSessions:0};
      t.totalMinutes+=seconds/60; t.totalBreaths+=breaths||0; t.totalSessions=(t.totalSessions||0)+1;
      if(t.lastCompletedDay){ const gap=dayDiff(parseDateKey(t.lastCompletedDay), parseDateKey(todayKey)); if(gap===1) t.dayStreak=(t.dayStreak||0)+1; else if(gap>1) t.dayStreak=1; } else { t.dayStreak=1; }
      t.lastCompletedDay=todayKey; tk[techId]=t;
      s.dayStreak=Math.max(s.dayStreak||0,t.dayStreak||0); s.lastCompletedDay=todayKey;
      const ach=s.ach||{}; if((s.totalMinutes||0)>=10) ach.m10=true; if((s.totalMinutes||0)>=50) ach.m50=true; if((s.totalSessions||0)>=5) ach.s5=true; if((s.totalBreaths||0)>=200) ach.b200=true; s.ach=ach;
      this.save(s); drawWeeklyChart(); return s;
    },
    summary(){ const s=this.load(); return {minutes:Math.round(s.totalMinutes||0),breaths:s.totalBreaths||0,sessions:s.totalSessions||0,streak:s.dayStreak||0,daily:s.daily||{},ach:s.ach||{},last:s.lastCompletedDay||null}; }
  };

  // Weekly chart + today line
  function drawWeeklyChart(){
    const c=$('#weeklyChart'); const t=$('#todayLine'); if(!c && !t) return;
    const S=MSStats.summary(); if(t){ const now=new Date(); const fmt=new Intl.DateTimeFormat(undefined,{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); t.textContent='Today: '+fmt.format(now); }
    if(!c) return;
    const ctx=c.getContext('2d'); const today=new Date(); const days=[];
    for(let i=6;i>=0;i--){ const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i); const key=localDateKey(d); days.push({label:d.toLocaleDateString(undefined,{weekday:'short'}),v:S.daily[key]||0,isToday:i===0}); }
    const W=(c.width=c.clientWidth||600), H=(c.height=c.clientHeight||180), pad=28, max=Math.max(10,...days.map(d=>d.v));
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#0a1020'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(148,163,184,.35)'; ctx.lineWidth=1; for(let i=0;i<=2;i++){ const y=pad+i*((H-pad-10)/2); ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-10,y); ctx.stroke(); }
    const bw=Math.min(60,(W-80)/days.length-10);
    days.forEach((d,i)=>{ const x=50+i*((W-100)/days.length); const h=Math.max(2,(d.v/max)*(H-pad-20)); const y=H-20-h;
      ctx.fillStyle=d.isToday?'rgba(34,197,94,.95)':'rgba(56,189,248,.85)'; ctx.fillRect(x,y,bw,h);
      ctx.fillStyle='#94a3b8'; ctx.font='12px system-ui,-apple-system,Segoe UI'; ctx.fillText(d.label,x,H-6);
    });
  }
  setTimeout(drawWeeklyChart, 60); // after layout

  // -----------------------
  // PNG builder (hero card) + QR
  // -----------------------
  function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
  async function buildStyledCardCanvas({ canvas, includeQR=false }={}){
    const W=1224, H=1584; const cnv = canvas || Object.assign(document.createElement('canvas'), { width: W, height: H });
    const ctx = cnv.getContext('2d');
    // background photo
    try{ const bg = await loadImg(data.bg||fallbackProfile.bg); ctx.drawImage(bg,0,0,W,H); }catch{ ctx.fillStyle='#111'; ctx.fillRect(0,0,W,H); }
    // overlay gradient
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(0,0,0,.15)'); g.addColorStop(1,'rgba(0,0,0,.55)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // avatar circle
    const AV=360; const cx=W/2, cy=330;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, AV/2, 0, Math.PI*2); ctx.closePath(); ctx.fillStyle='#111'; ctx.fill();
    try{ const av=await loadImg(data.avatar||fallbackProfile.avatar); ctx.clip(); ctx.drawImage(av, cx-AV/2, cy-AV/2, AV, AV); }catch{}
    ctx.restore();
    ctx.lineWidth=8; ctx.strokeStyle='rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(cx, cy, AV/2, 0, Math.PI*2); ctx.stroke();
    // text
    ctx.fillStyle='#fff'; ctx.textAlign='center';
    ctx.font='bold 58px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillText(data.name||'', cx, cy+AV/2+72);
    ctx.font='600 34px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(255,255,255,.95)'; ctx.fillText(data.title||'', cx, cy+AV/2+120);
    ctx.font='500 28px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(236,253,245,.94)';
    const addrLines = (data.addr||'').split('\n'); addrLines.forEach((ln,i)=> ctx.fillText(ln, cx, cy+AV/2+170+i*34));

    // link buttons (rects for PDF annotations)
    const btns=[
      { label:'📞 Call',     url:`tel:${data.phone||''}` },
      { label:'💬 Text',     url:`sms:${data.phone||''}` },
      { label:'✉️ Email',    url:`mailto:${data.email||''}` },
      { label:'🌐 Website',  url:data.site||'' },
      { label:'🧘 Wellbeing',url:data.wellbeing||'' },
      { label:'🗺️ Directions', url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((data.addr||'').replace(/\n/g,' '))}` },
      { label:'💷 Buy me coffee', url: location.origin + location.pathname.replace(/[^/]*$/,'') + 'bank.html' + qp }
    ];
    const links=[];
    const bx=160, bw=W-320, by= cy+AV/2+220, bh=74, gap=16;
    ctx.font='600 28px ui-sans-serif,system-ui,Segoe UI,Roboto';
    btns.forEach((b,i)=>{
      const y=by + i*(bh+gap);
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2;
      roundRect(ctx, bx, y, bw, bh, 14); ctx.stroke(); ctx.fill();
      ctx.fillStyle='#e5f7ff'; ctx.fillText(b.label, cx, y+bh/2+10);
      links.push({ x:bx, y:y, w:bw, h:bh, url:b.url });
    });

    // optional QR (to this PDF page)
    if(includeQR){
      const qrUrl = location.origin + location.pathname.replace(/[^/]*$/,'') + 'pdf.html' + qp;
      const qrImg = await buildQRImage(qrUrl, 280); // canvas
      const qx=W-320, qy=80; ctx.drawImage(qrImg, qx, qy);
      ctx.font='500 22px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(255,255,255,.95)';
      ctx.fillText('Scan: open PDF', qx+140, qy+300);
      // also make annotation for QR area
      links.push({ x: qx, y: qy, w: qrImg.width, h: qrImg.height, url: qrUrl });
    }

    return { canvas: cnv, links };
  }
  function roundRect(ctx,x,y,w,h,r){ const rr=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }
  // lightweight QR (uses online chart API fallback if drawing fails)
  async function buildQRImage(text, size){
    // Simple fallback: use remote QR image (works offline only if cached later)
    const img = new Image(); img.crossOrigin='anonymous'; img.referrerPolicy='no-referrer';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    await new Promise((res)=>{ img.onload=res; img.onerror=res; });
    const cnv=document.createElement('canvas'); cnv.width=size; cnv.height=size; const cx=cnv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,size,size);
    try{ cx.drawImage(img,0,0,size,size); }catch{}
    return cnv;
  }

  // -----------------------
  // Minimal, valid PDF writer with JPEG background + link annotations
  // -----------------------
  function base64ToBytes(b64){ const bin=atob(b64.replace(/^data:.*;base64,/,'')); const len=bin.length, bytes=new Uint8Array(len); for(let i=0;i<len;i++) bytes[i]=bin.charCodeAt(i); return bytes; }
  function parseJpegSize(bytes){ // SOF0..SOF3
    let i=2; while(i<bytes.length){ if(bytes[i]!==0xFF){ i++; continue; } const marker=bytes[i+1]; const len=(bytes[i+2]<<8)|bytes[i+3]; if(marker>=0xC0 && marker<=0xC3){ return { height:(bytes[i+5]<<8)|bytes[i+6], width:(bytes[i+7]<<8)|bytes[i+8] }; } i+=2+len; } return {width:1224,height:1584}; }
  async function generateStyledPdf({ fromCanvas, links=[], includeQR=false }){
    // create JPEG from canvas
    const dataUrl = fromCanvas.toDataURL('image/jpeg', .92);
    const imgBytes = base64ToBytes(dataUrl);
    const dim = parseJpegSize(imgBytes);

    // A4 portrait 595x842
    const PW=595, PH=842;
    // Content stream: draw image on full page
    const contentStr = `q\n${PW} 0 0 ${PH} 0 0 cm\n/Im0 Do\nQ\n`;
    const encoder = [];
    const idx = []; let off=0;
    function push(s){ const bytes = (typeof s==='string')? new TextEncoder().encode(s) : s; idx.push(off); encoder.push(bytes); off += bytes.length; }
    function obj(n, body){ push(`${n} 0 obj\n`); push(body); push(`\nendobj\n`); }
    const annots = links.filter(l=>l.url).map((l,i)=>{
      // map canvas coords to PDF: Y invert + scale
      const sx = PW/1224, sy=PH/1584;
      const x1 = l.x*sx, y1 = PH - (l.y+l.h)*sy, x2=(l.x+l.w)*sx, y2=PH - (l.y)*sy;
      return { rect:[x1,y1,x2,y2], url:l.url };
    });

    // Build objects
    push('%PDF-1.4\n');
    obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
    obj(2, `<< /Type /Pages /Count 1 /Kids [3 0 R] >>`);
    // Annots array indices will be 6.. (after font + image)
    const annotsNums = annots.map((_,i)=> (6+i)+' 0 R').join(' ');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R ${annots.length?('/Annots ['+annotsNums+']'):''} >>`);
    obj(4, `<< /Length ${contentStr.length} >>\nstream\n${contentStr}endstream`);
    obj(5, `<< /Type /XObject /Subtype /Image /Name /Im0 /Width ${dim.width} /Height ${dim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
    push(imgBytes); push(`\nendstream\nendobj\n`);
    annots.forEach((a,i)=> obj(6+i, `<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [${a.rect.map(v=>v.toFixed(2)).join(' ')}] /A << /S /URI /URI (${a.url}) >> >>`));
    const xrefStart = off;
    push('xref\n');
    const count = 6 + annots.length;
    push(`0 ${count+1}\n`);
    push('0000000000 65535 f \n');
    for(let i=0;i<count;i++){ push(String(idx[i]).padStart(10,'0') + ' 00000 n \n'); }
    push(`trailer << /Size ${count+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
    // merge all chunks
    const out = new Blob(encoder.map(b=>b.buffer?b:new Uint8Array(b)), {type:'application/pdf'});
    return out;
  }

  // Quick download (official assets file or generated)
  async function quickDownloadPdf(){
    try{
      const r=await fetch('assets/m_share_profile.pdf').catch(()=>null);
      if(r && r.ok){ const b=await r.blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='m_share_profile.pdf'; document.body.appendChild(a); a.click(); a.remove(); return; }
    }catch{}
    const preview = await buildStyledCardCanvas({ includeQR:true });
    const blob = await generateStyledPdf({ fromCanvas: preview.canvas, links: preview.links, includeQR:true });
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='m_share_profile.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // -----------------------
  // Device Locker (base64, quota, export/import)
  // -----------------------
  const LOCK_KEY='mshare_pdf_locker_v2'; const MAX_BYTES=20*1024*1024; // 20MB default quota
  const DeviceLocker = {
    load(){ try{ return JSON.parse(localStorage.getItem(LOCK_KEY)||'[]')||[]; }catch{ return []; } },
    save(arr){ try{ localStorage.setItem(LOCK_KEY, JSON.stringify(arr)); }catch{} },
    usedBytes(){ return this.load().reduce((a,b)=>a+(b.size||0),0); },
    formatBytes(n){ if(n<1024) return `${n} B`; if(n<1024*1024) return `${(n/1024).toFixed(1)} KB`; return `${(n/1024/1024).toFixed(2)} MB`; },
    async addBlob(name, blob){
      const base64 = await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result)); fr.readAsDataURL(blob); });
      const rec={ name:name||'document.pdf', size: blob.size, mime: blob.type||'application/pdf', data: base64 };
      const list=this.load(); if(this.usedBytes()+blob.size > MAX_BYTES){ toast('Locker full — delete some files or export.'); return false; }
      list.push(rec); this.save(list); return true;
    },
    remove(i){ const list=this.load(); list.splice(i,1); this.save(list); },
    export(){ const blob=new Blob([localStorage.getItem(LOCK_KEY)||'[]'],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mshare_locker_backup.json'; document.body.appendChild(a); a.click(); a.remove(); },
    async import(file){ const text=await file.text(); try{ const arr=JSON.parse(text); if(!Array.isArray(arr)) throw new Error(); const bytes=arr.reduce((a,b)=>a+(b.size||0),0); if(bytes>MAX_BYTES){ toast('Backup exceeds device quota.'); return; } this.save(arr); }catch{ toast('Invalid locker backup.'); } },
    mount({ listEl, quotaEl, addInput, placeholderBtn, exportBtn, importInput, previewBuilder }){
      const render=()=>{
        if(quotaEl) quotaEl.textContent = this.formatBytes(this.usedBytes()) + ' / ' + this.formatBytes(MAX_BYTES);
        const list=this.load(); listEl.innerHTML=''; if(!list.length){ listEl.innerHTML='<div class="muted">No PDFs stored on this device yet.</div>'; return; }
        list.forEach((f,i)=>{
          const row=document.createElement('div'); row.className='kv';
          row.innerHTML = `<div><b>${(f.name||'PDF')}</b> <span class="muted">(${DeviceLocker.formatBytes(f.size||0)})</span></div>
            <div class="actions" style="margin-top:8px">
              <a class="btn" href="${f.data}" download="${f.name||'document.pdf'}">⬇ Download</a>
              <a class="btn" href="${f.data}" target="_blank" rel="noopener">🔎 Open</a>
              <button class="btn btn-danger" data-i="${i}">🗑 Remove</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('button[data-i]').forEach(b=> b.addEventListener('click',()=>{ this.remove(+b.dataset.i); render(); }));
      };
      render();
      addInput?.addEventListener('change', async (e)=>{ const file=e.target.files?.[0]; if(!file) return; if(file.type!=='application/pdf'){ toast('Please choose a PDF.'); addInput.value=''; return; }
        const ok=await this.addBlob(file.name, file); if(ok) render(); addInput.value=''; });
      placeholderBtn?.addEventListener('click', async ()=>{
        try{ const blob = await (typeof previewBuilder==='function'? previewBuilder(): (async()=>{ const x=await buildStyledCardCanvas({includeQR:true}); return generateStyledPdf({fromCanvas:x.canvas, links:x.links, includeQR:true}); })()); await this.addBlob('m_share_profile.pdf', blob); render(); }
        catch{ toast('Could not generate placeholder PDF.'); }
      });
      exportBtn?.addEventListener('click', ()=> this.export());
      importInput?.addEventListener('change', async (e)=>{ const f=e.target.files?.[0]; if(!f) return; await this.import(f); render(); importInput.value=''; });
    }
  };

  // -----------------------
  // VCard + QR modal + toast
  // -----------------------
  function genVCardAndDownload(){
    const v = [
      'BEGIN:VCARD','VERSION:3.0',
      `FN:${data.name}`, `TITLE:${data.title}`,
      `TEL;TYPE=CELL:${data.phone}`, `EMAIL;TYPE=WORK:${data.email}`,
      `URL:${data.site}`, `ADR;TYPE=WORK:;;${(data.addr||'').replace(/\n/g,';')}`,
      'END:VCARD'
    ].join('\n');
    const blob=new Blob([v],{type:'text/vcard'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='contact.vcf'; document.body.appendChild(a); a.click(); a.remove();
  }
  function showQrModal(){
    const sheet = $('#shareSheet'); if(!sheet) openShareSheet();
    const url = location.origin + location.pathname.replace(/[^/]*$/,'') + 'pdf.html' + qp;
    const img = new Image(); img.alt='QR code'; img.style='display:block;margin-top:8px;max-width:280px;border:1px solid var(--b);border-radius:12px;background:#fff';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
    const area = $('#shareText'); if(area){ area.value = makeShareText() + '\n\nQR → ' + url; area.parentElement.appendChild(img); }
    $('#shareSheet')?.classList.add('open');
  }
  function toast(msg){ try{ const d=document.createElement('div'); d.textContent=msg; d.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:18px;background:#0a1020;color:#e5e7eb;border:1px solid #1f2937;padding:10px 14px;border-radius:10px;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.35)'; document.body.appendChild(d); setTimeout(()=>d.remove(),1900);}catch{} }

  // -----------------------
  // Expose API
  // -----------------------
  window.__MSHARE__ = {
    data, qp,
    openShareSheet, genVCardAndDownload, showQrModal, toast,
    Stats: MSStats, drawWeeklyChart,
    bankDetailsString, openAppOrStore,
    buildStyledCardCanvas, generateStyledPdf, quickDownloadPdf,
    DeviceLocker
  };

  /* ===== M Share • Extension: SOS wiring + Admin gate (safe to append) ===== */
(() => {
  const MS = (window.__MSHARE__ = window.__MSHARE__ || {});

  // --- SHA-256 helper (for passcode hashing) ---
  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // --- Admin gate / storage visibility ---
  const ADMIN_TOKEN = 'mshare_admin_ok';
  // Default passcode is:  MShare@2025!  (change it below if you want)
  const PASS_SHA256 = 'ea17c32cd4c019ef90f07fa822e744c688db972b823b567344c2aca9a44c6a51';

  MS.isAdmin = () => sessionStorage.getItem(ADMIN_TOKEN) === '1';

  MS.revealStorageLink = () => {
    document.querySelectorAll('a[data-href="storage.html"]').forEach(a => {
      a.style.display = '';
    });
  };

  MS.requireAdmin = async () => {
    if (MS.isAdmin()) return true;
    const pass = prompt('Enter admin passcode:');
    if (!pass) return false;
    const ok = (await sha256(pass)) === PASS_SHA256;
    if (ok) {
      sessionStorage.setItem(ADMIN_TOKEN, '1');
      MS.revealStorageLink();
      return true;
    }
    alert('Incorrect passcode');
    return false;
  };

  // Hide "Storage" link for non-admin visitors
  if (!MS.isAdmin()) {
    document.querySelectorAll('a[data-href="storage.html"]').forEach(a => a.remove());
  }

  // --- SOS wiring: route the existing landing-page SOS button to sos.html ---
  // Your landing page already calls CoachPresets.panic(); we point that to sos.html.
  MS.CoachPresets = MS.CoachPresets || {};
  MS.CoachPresets.panic = function () {
    // We still provide breathing counts so SOS can pre-load a quick pattern if desired.
    const extra = new URLSearchParams({ in: '4', inHold: '4', out: '4', outHold: '4', breaths: '4', tts: 'off', vib: 'off' });
    const qpCore = (MS.qp || '').replace(/^\?/, '');
    const qs = qpCore ? qpCore + '&' + extra.toString() : extra.toString();
    return { page: 'sos.html', q: qs };
  };

  // Fallback: if some older inline script prevents navigation, force sos.html
  const sosBtn = document.getElementById('sosBtn');
  if (sosBtn) {
    sosBtn.addEventListener('click', (ev) => {
      // Let the page's original click handler run first, then check if we stayed put.
      setTimeout(() => {
        // If still on the same page, navigate to sos.html (preserving existing query string)
        if (/index\.html$|\/$/.test(location.pathname)) {
          const qs = MS.qp || '';
          location.href = 'sos.html' + qs;
        }
      }, 0);
    }, { once: true });
  }
})();


  // Footer year (if present)
  const y = $('#year'); if(y) y.textContent = new Date().getFullYear();
})();


