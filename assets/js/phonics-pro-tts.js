/* __phonics_pro__ (VER=202510272108-phonics-pro) */
(function(){
  if (window.__PhonicsPro) return; window.__PhonicsPro=true;

  const GPC=[
    {k:'a', ipa:'æ', words:['apple','cat']},
    {k:'e', ipa:'ɛ', words:['egg','bed']},
    {k:'i', ipa:'ɪ', words:['ink','sit']},
    {k:'o', ipa:'ɒ', words:['octopus','hot']},
    {k:'u', ipa:'ʌ', words:['umbrella','sun']},
    {k:'sh',ipa:'ʃ', words:['ship','brush']},
    {k:'ch',ipa:'tʃ',words:['chip','lunch']},
    {k:'th',ipa:'θ/ð',words:['thin','this']},
    {k:'ph',ipa:'f', words:['phone']},
    {k:'wh',ipa:'w', words:['whale','when']},
    {k:'ai',ipa:'eɪ',words:['rain']},
    {k:'ee',ipa:'iː',words:['tree','feet']},
    {k:'ea',ipa:'iː/ɛ',words:['leaf','bread']},
    {k:'oa',ipa:'əʊ',words:['boat']},
    {k:'ow',ipa:'əʊ/aʊ',words:['snow','cow']},
    {k:'oi',ipa:'ɔɪ',words:['coin']},
    {k:'oy',ipa:'ɔɪ',words:['boy']},
    {k:'ou',ipa:'aʊ/ʌ/ʊ/uː',words:['out','young','you']},
    {k:'aw',ipa:'ɔː',words:['saw']},
    {k:'au',ipa:'ɔː',words:['autumn']},
    {k:'ar',ipa:'ɑː',words:['car']},
    {k:'er',ipa:'ɜː',words:['her']},
    {k:'ir',ipa:'ɜː',words:['bird']},
    {k:'or',ipa:'ɔː',words:['fork']},
    {k:'ur',ipa:'ɜː',words:['nurse']},
    {k:'igh',ipa:'aɪ',words:['night']},
    {k:'tch',ipa:'tʃ',words:['catch']},
    {k:'dge',ipa:'dʒ',words:['bridge']},
    {k:'kn',ipa:'n', words:['knit']},
    {k:'wr',ipa:'r', words:['write']},
    {k:'mb',ipa:'m', words:['thumb']}
  ];

  // ---- Config ----
  const PREFER_DANIEL = true; // default en-GB Daniel
  const PRO_ENDPOINT  = window.PHONICS_TTS_ENDPOINT || localStorage.getItem('PHONICS_TTS_ENDPOINT') || ''; // e.g. https://<your-worker>.workers.dev/tts
  const PRO_VOICE     = window.PHONICS_TTS_VOICE || localStorage.getItem('PHONICS_TTS_VOICE') || 'en-GB-RyanNeural';

  // ---- Web Speech fallback (natural if Daniel exists) ----
  const synth = window.speechSynthesis;
  function voicesReady(ms=5000){
    return new Promise(res=>{
      let done=false;
      const tryLoad=()=>{ const vs = synth?.getVoices?.()||[]; if (vs.length && !done){ done=true; res(vs); } };
      tryLoad();
      const iv=setInterval(()=>{ tryLoad(); if (done) clearInterval(iv); },150);
      if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged = tryLoad;
      setTimeout(()=>{ if(!done){ done=true; res(synth?.getVoices?.()||[]); }}, ms);
    });
  }
  function pickEnGB(voices){
    if (!voices?.length) return null;
    const byName = name => voices.find(v=>new RegExp('^'+name+'$', 'i').test(v.name));
    let v=null;
    if (PREFER_DANIEL) v = byName('Daniel');
    return v || voices.find(v=>/^en-GB/i.test(v.lang)) || voices.find(v=>/^en-/i.test(v.lang)) || voices[0];
  }
  async function speakWeb(text){
    await voicesReady();
    try{ synth.cancel(); }catch(e){}
    const Utter = window.SpeechSynthesisUtterance;
    const u = new Utter(text);
    const v = pickEnGB(synth.getVoices());
    if (v) u.voice = v;
    u.lang='en-GB'; u.rate=1; u.pitch=1;
    synth.speak(u);
  }
  function stopWeb(){ try{ synth.cancel(); }catch(e){} }

  // ---- Pro Voice (Azure SSML via Worker) ----
  async function speakProSSML(ssml){
    if (!PRO_ENDPOINT) { await speakWeb(ssml.replace(/<[^>]+>/g,' ')); return; }
    const r = await fetch(PRO_ENDPOINT, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ ssml, voice:PRO_VOICE })});
    if (!r.ok) { await speakWeb(ssml.replace(/<[^>]+>/g,' ')); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = new Audio(url); a.onended=()=>URL.revokeObjectURL(url);
    await a.play();
  }

  // Build SSML that says only the sound, plus natural example words (no letters)
  function ssmlFor(item){
    // Use first IPA variant if multiple
    const ipa = String(item.ipa||'').split('/')[0].trim();
    const examples = (item.words||[]).slice(0,2).join(', ');
    const voice = PRO_VOICE;
    return `<speak version="1.0" xml:lang="en-GB"><voice name="${voice}"><prosody rate="0%">
      <phoneme alphabet="ipa" ph="${ipa}">${item.k}</phoneme>. As in ${examples}.
    </prosody></voice></speak>`;
  }

  // Public API
  async function playGrapheme(key){
    const item = GPC.find(x=>x.k===key);
    if (!item) return;
    // Prefer Pro Voice if configured (gives true phoneme), else speak a natural phrase without letter names.
    if (PRO_ENDPOINT) {
      return speakProSSML(ssmlFor(item));
    } else {
      const examples = (item.words||[]).slice(0,3).join(', ');
      // Avoid reading the grapheme letters; speak only the phrase
      return speakWeb(`Sound as in ${examples}.`);
    }
  }
  function stop(){ stopWeb(); } 

  // UI wiring (auto-injects a clean, responsive 2×3+ grid)
  function ensureUI(){
    const host = document.querySelector('#phonics-pro');
    if (host) return; // already present
    const wrap = document.createElement('section');
    wrap.id='phonics-pro';
    wrap.innerHTML = `
      <h2>Grapheme–Phoneme Practice (UK)</h2>
      <div class="ph-row">
        <button class="ph-btn" id="ph-pro-toggle" title="Use Azure Neural voice if configured">Pro Voice: <b>${PRO_ENDPOINT?'ON':'OFF'}</b></button>
        <span class="ph-note">Daniel (en-GB) fallback in browser. For the pure sound (/ʃ/, /tʃ/, …) set your Cloudflare Worker URL: <code>localStorage.PHONICS_TTS_ENDPOINT="https://YOUR.worker/tts"</code></span>
      </div>
      <div class="ph-grid">${GPC.map(x=>`
        <button class="ph-tile" data-gpc="${x.k}" aria-label="Play ${x.k}">
          <span class="ph-g">${x.k}</span>
          <span class="ph-w">${(x.words||[]).slice(0,2).join(', ')}</span>
        </button>`).join('')}
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-gpc]'); if (!btn) return;
      playGrapheme(btn.getAttribute('data-gpc'));
    });
    const tog=document.getElementById('ph-pro-toggle');
    tog?.addEventListener('click', ()=>{
      const isOn = !!(window.PHONICS_TTS_ENDPOINT || localStorage.getItem('PHONICS_TTS_ENDPOINT'));
      alert(isOn ? 'Pro Voice is ON (Azure Worker). To switch, set localStorage.PHONICS_TTS_ENDPOINT to empty and reload.'
                 : 'Pro Voice is OFF. Set localStorage.PHONICS_TTS_ENDPOINT="https://YOUR.worker/tts" then reload.');
    });
  }

  if (document.readyState==='loading') addEventListener('DOMContentLoaded', ensureUI, {once:true});
  else ensureUI();

  window.MSharePhonics={ play:playGrapheme, stop, list:()=>GPC.slice() };
})();
