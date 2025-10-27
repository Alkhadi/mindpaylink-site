/* __progress_tracker_v2__ — local-only, offline-first */
(function(){
  if (window.__mplProgressV2) return; window.__mplProgressV2=true;

  var ZONE='Europe/London';
  var KEY='mpl_progress_v2';
  var state = (function(){
    try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; }
  })();
  if (!state.days) state.days = {};           // { 'YYYY-MM-DD': {sec: N, breaths: N, sessions: N} }
  if (!state.totals) state.totals = {sec:0, breaths:0, sessions:0};
  if (!state.last) state.last = {start:null};
  if (!state.streak) state.streak = 0;

  function todayKey(){
    var fmt=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
    var p=fmt.formatToParts(new Date()); var y=p.find(x=>x.type==='year').value, m=p.find(x=>x.type==='month').value, d=p.find(x=>x.type==='day').value;
    return y+'-'+m+'-'+d;
  }
  function prettyNow(){
    var d=new Date();
    var day=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,weekday:'long'}).format(d);
    var date=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,day:'2-digit',month:'long',year:'numeric'}).format(d);
    var time=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',minute:'2-digit'}).format(d);
    return day+' '+date+' at '+time;
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }

  // Heuristic breaths per minute per page (fallback=6)
  function pageBPM(){
    var meta=document.querySelector('meta[name="mshare:bpm"]');
    if (meta && meta.content) { var n=parseFloat(meta.content); if (isFinite(n)&&n>0) return n; }
    var title=(document.title||'').toLowerCase();
    if (title.includes('4-7-8')) return 4.5;
    if (title.includes('box')) return 6;
    if (title.includes('coherent')||title.includes('5-5')) return 6;
    return 6;
  }

  function beginSession(){
    if (state.last.start) return; // already running
    state.last.start = Date.now();
    (state._bpm = pageBPM());
    save();
  }
  function endSession(){
    if (!state.last.start) return;
    var now=Date.now(), durSec=Math.max(0, Math.round((now - state.last.start)/1000));
    state.last.start=null;
    var k=todayKey();
    if (!state.days[k]) state.days[k]={sec:0, breaths:0, sessions:0};
    state.days[k].sec += durSec;
    var breaths = Math.round((state._bpm||6) * (durSec/60));
    state.days[k].breaths += breaths;
    state.days[k].sessions += 1;
    state.totals.sec     += durSec;
    state.totals.breaths += breaths;
    state.totals.sessions+= 1;
    // streak: consecutive days up to today with sec>0
    recomputeStreak();
    save(); render();
  }
  function recomputeStreak(){
    var d=new Date();
    var streak=0;
    for (var i=0;i<3650;i++){
      var di=new Date(d.getTime()-i*86400000);
      var k=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(di).split('/').reverse().join('-');
      if (state.days[k] && state.days[k].sec>0) streak++;
      else break;
    }
    state.streak=streak;
  }

  // Wire to page Start/Stop buttons generically (no VA)
  function looksLike(el, word){ return el && (el.textContent||'').trim().toLowerCase().includes(word); }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button,[role=button],.btn,a');
    if (!b) return;
    var id=(b.id||'').toLowerCase();
    var data=b.dataset||{};
    if (data.action==='start' || data.breath==='start' || looksLike(b,'start') || looksLike(b,'begin')) beginSession();
    if (data.action==='stop'  || data.breath==='stop'  || looksLike(b,'stop')  || looksLike(b,'end'))   endSession();
  }, true);
  window.addEventListener('beforeunload', endSession);

  function HHMM(sec){ var m=Math.floor(sec/60), s=sec%60; return (m+'').padStart(1,'0') + (s>0?(':'+(s+'').padStart(2,'0')):''); }
  function render(){
    var elT=document.getElementById('mTotal');
    var elS=document.getElementById('mStreak');
    var elN=document.getElementById('mSessions');
    var elB=document.getElementById('mBreaths');
    if (elT) elT.textContent = Math.round(state.totals.sec/60);
    if (elS) elS.textContent = state.streak||0;
    if (elN) elN.textContent = state.totals.sessions||0;
    if (elB) elB.textContent = state.totals.breaths||0;
    var today=document.getElementById('todayLine');
    if (today) today.textContent = 'Today: ' + prettyNow();
    drawWeek();
  }

  function drawWeek(){
    var c=document.getElementById('weeklyChart');
    if (!c || !c.getContext) return;
    var ctx=c.getContext('2d');
    var W=c.width||300, H=c.height||150;
    c.width=W; c.height=H;
    ctx.clearRect(0,0,W,H);
    // Prepare last 7 days in London
    var days=[], secs=[];
    for (var i=6;i>=0;i--){
      var di=new Date(Date.now()-i*86400000);
      var dk=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(di).split('/').reverse().join('-');
      days.push(dk.slice(5));
      secs.push((state.days[dk]&&state.days[dk].sec)||0);
    }
    var max = Math.max(600, ...secs); // scale: at least 10 min (600s)
    var barW = Math.floor((W-40)/7), gap=6, x=30, base=H-24;
    ctx.font='11px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle='#94a3b8'; ctx.textAlign='center';
    ctx.fillText('Weekly Minutes', W/2, 12);
    for (var i=0;i<7;i++){
      var h = Math.round((secs[i]/60)/ (max/60) * (H-60));
      var bx = x + i*(barW+gap), by = base - h;
      ctx.fillStyle='#2563eb'; ctx.fillRect(bx, by, barW, h);
      ctx.fillStyle='#e5e7eb'; ctx.fillText(days[i].replace(/^0/,''), bx+barW/2, H-8);
    }
  }

  // first paint
  recomputeStreak();
  render();
})();