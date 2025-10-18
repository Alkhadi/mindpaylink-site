
/* -----------------------------------------------------------
   Voice Coach + Mobile Nav Fix
   - Cross-browser speech synthesis (Chrome, Safari, Firefox, Edge)
   - Sticky Voice Coach panel
   - Headphone buttons work consistently
   - Focus screen Start/Pause/Stop + duplicate cleanup
   - Mobile hamburger overlay menu (centered) with chevrons
   ----------------------------------------------------------- */
(() => {
  // ---------- tiny DOM helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byText = (el) => (el.textContent || '').trim().toLowerCase();

  // Flag to let other scripts know this VC enhancer is active
  window.__VC_FIX_ACTIVE = true;

  // ---------- SPEECH ENGINE ----------
  // Optional API-backed TTS (disabled by default). Configure via the Voice Coach panel.
  class ApiTTS {
    constructor() {
      this._audio = null;
      this._queue = [];
      this._playing = false;
      this._cfg = this._load();
    }

    _load() {
      try {
        return {
          enabled: localStorage.getItem('vc.api.enabled') === 'true',
          base: localStorage.getItem('vc.api.base') || '', // e.g. https://your-endpoint/tts?voice={voice}&text={text}
          voice: localStorage.getItem('vc.api.voice') || 'en-GB',
          auth: localStorage.getItem('vc.api.auth') || '', // optional Authorization header (e.g. Bearer ...)
          mode: localStorage.getItem('vc.api.mode') || 'get-template', // get-template | post-json
          format: localStorage.getItem('vc.api.format') || 'audio/mpeg',
        };
      } catch { return { enabled: false, base: '', voice: 'en-GB', auth: '', mode: 'get-template', format: 'audio/mpeg' }; }
    }
    _save() {
      try {
        localStorage.setItem('vc.api.enabled', String(!!this._cfg.enabled));
        localStorage.setItem('vc.api.base', this._cfg.base || '');
        localStorage.setItem('vc.api.voice', this._cfg.voice || '');
        localStorage.setItem('vc.api.auth', this._cfg.auth || '');
        localStorage.setItem('vc.api.mode', this._cfg.mode || 'get-template');
        localStorage.setItem('vc.api.format', this._cfg.format || 'audio/mpeg');
      } catch { }
    }
    get enabled() { return !!this._cfg.enabled && !!this._cfg.base; }
    setEnabled(on) { this._cfg.enabled = !!on; this._save(); }
    setVoice(v) { this._cfg.voice = v || this._cfg.voice; this._save(); }
    async speakChunks(chunks, opts = {}) {
      if (!this.enabled) return false;
      // Stop any current
      this.stop();
      for (const part of chunks) {
        const ok = await this._playOne(part, opts).catch(() => false);
        if (!ok) return false; // abort on failure
      }
      return true;
    }
    stop() {
      try {
        if (this._audio) { this._audio.pause(); this._audio.src = ''; this._audio = null; }
      } catch { }
      this._playing = false;
    }
    async _playOne(text, opts) {
      const url = this._makeUrl(text);
      if (!url && this._cfg.mode !== 'post-json') return false;
      const headers = {};
      if (this._cfg.auth) headers['Authorization'] = this._cfg.auth;
      let res;
      try {
        if (this._cfg.mode === 'post-json') {
          res = await fetch(this._cfg.base, {
            method: 'POST',
            headers: { 'content-type': 'application/json', ...headers },
            body: JSON.stringify({ text, voice: this._cfg.voice, format: this._cfg.format })
          });
        } else {
          res = await fetch(url, { headers });
        }
      } catch (e) {
        console.warn('API TTS fetch failed', e);
        return false;
      }
      if (!res || !res.ok) return false;
      // Try common response shapes: direct audio, JSON with base64 or URL
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      try {
        if (ct.startsWith('audio') || ct.includes('octet-stream')) {
          const blob = await res.blob();
          return await this._playBlob(blob);
        } else {
          const data = await res.json();
          if (data && data.url) {
            return await this._playUrl(data.url);
          }
          const b64 = data.audio || data.audioBase64 || data.audioContent;
          const mime = data.contentType || this._cfg.format || 'audio/mpeg';
          if (b64) {
            const blob = this._b64ToBlob(b64, mime);
            return await this._playBlob(blob);
          }
        }
      } catch (e) {
        console.warn('API TTS parse/play failed', e);
        return false;
      }
      return false;
    }
    _makeUrl(text) {
      if (!this._cfg.base) return '';
      if (this._cfg.mode === 'get-template') {
        return this._cfg.base
          .replace('{voice}', encodeURIComponent(this._cfg.voice || ''))
          .replace('{text}', encodeURIComponent(text));
      }
      return this._cfg.base;
    }
    _b64ToBlob(b64, mime) {
      try {
        const bin = atob(b64.replace(/^data:[^,]+,/, ''));
        const len = bin.length; const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime || 'audio/mpeg' });
      } catch { return new Blob(); }
    }
    _playUrl(url) { return this._playWithAudio(url); }
    async _playBlob(blob) {
      const url = URL.createObjectURL(blob);
      try { return await this._playWithAudio(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 4000); }
    }
    _playWithAudio(url) {
      return new Promise((resolve) => {
        try { if (this._audio) { this._audio.pause(); this._audio.src = ''; } } catch { }
        const audio = new Audio();
        this._audio = audio; this._playing = true;
        audio.src = url; audio.preload = 'auto'; audio.crossOrigin = 'anonymous';
        audio.onended = () => { this._playing = false; resolve(true); };
        audio.onerror = () => { this._playing = false; resolve(false); };
        audio.play().catch(() => resolve(false));
      });
    }
  }

  class SpeechEngine {
    constructor() {
      this.voices = [];
      this.ready = this._initVoices();
      this._queue = [];
      this._speaking = false;
      this._paused = false;
      this.voiceNamePref = localStorage.getItem('vc.voice') || 'Daniel';
      this.rate = parseFloat(localStorage.getItem('vc.rate') || '1') || 1;
      this.pitch = parseFloat(localStorage.getItem('vc.pitch') || '1') || 1;
      this.langPref = localStorage.getItem('vc.lang') || 'en';
      this.engine = localStorage.getItem('vc.engine') || 'system'; // system | api
      this.api = new ApiTTS();
    }

    _initVoices() {
      return new Promise((resolve) => {
        const load = () => {
          const list = window.speechSynthesis.getVoices();
          if (list && list.length) {
            this.voices = list;
            resolve(list);
          } else {
            setTimeout(() => {
              this.voices = window.speechSynthesis.getVoices() || [];
              resolve(this.voices);
            }, 300);
          }
        };
        try { window.speechSynthesis.getVoices(); } catch { }
        if ('onvoiceschanged' in window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = () => load();
        }
        load();
      });
    }

    _chooseVoice() {
      const list = this.voices;
      if (!list || !list.length) return null;
      let v = list.find(v => v.name === this.voiceNamePref);
      if (v) return v;
      const fallbacks = [
        'Google UK English Male',
        'Google US English',
        'Google UK English Female',
        'Samantha', 'Alex', 'Victoria', 'Fred',
      ];
      v = list.find(v => fallbacks.includes(v.name));
      if (v) return v;
      v = list.find(v => (v.lang || '').toLowerCase().startsWith(this.langPref.toLowerCase()));
      return v || list[0];
    }

    _sanitizeText(t) {
      if (!t) return '';
      let s = String(t).replace(/\s+/g, ' ').trim();
      // Remove URLs and emails
      s = s.replace(/https?:\/\/\S+/gi, '');
      s = s.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '');
      // Remove emoji/pictographs
      try { s = s.replace(/[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''); }
      catch { s = s.replace(/[\u2600-\u27BF]/g, ''); }
      // Strip extra symbols, keep sentence punctuation
      s = s.replace(/[~`^_*#@<>{}\[\]|\\/+=]+/g, ' ');
      // Skip tokens without letters
      s = s.split(/\s+/).filter(tok => /[A-Za-z]/.test(tok)).join(' ');
      // Normalize punctuation/space
      s = s.replace(/[.,!?;:]{2,}/g, (m) => m[m.length - 1]);
      s = s.replace(/\s{2,}/g, ' ').trim();
      return s;
    }

    _splitText(s, maxLen = 180) {
      if (!s) return [];
      const out = [];
      // Split by sentences first
      const sentences = s.match(/[^.!?;]+[.!?;]?/g) || [s];
      let buf = '';
      for (const part of sentences) {
        const next = (buf ? (buf + ' ' + part.trim()) : part.trim());
        if (next.length <= maxLen) {
          buf = next;
        } else {
          if (buf) out.push(buf.trim());
          // If a single sentence is too long, chunk by words
          if (part.length > maxLen) {
            const words = part.trim().split(/\s+/);
            let chunk = '';
            for (const w of words) {
              const cand = chunk ? (chunk + ' ' + w) : w;
              if (cand.length > maxLen) { out.push(chunk); chunk = w; }
              else { chunk = cand; }
            }
            if (chunk) out.push(chunk);
            buf = '';
          } else {
            buf = part.trim();
          }
        }
      }
      if (buf) out.push(buf.trim());
      return out;
    }

    async speak(text, opts = {}) {
      const cleaned = this._sanitizeText(text);
      const parts = this._splitText(cleaned);

      // Prefer API when engine is set to api or when SpeechSynthesis is unavailable
      const wantApi = (this.engine === 'api') || !('speechSynthesis' in window);
      if (wantApi && this.api.enabled) {
        const ok = await this.api.speakChunks(parts, opts).catch(() => false);
        if (ok) return;
        // If API fails, fall back to system
        console.warn('API TTS failed, falling back to system voice');
      }

      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported and API not configured.');
        return;
      }
      await this.ready;
      try { window.speechSynthesis.resume(); } catch { }
      if (opts.clear !== false) {
        try { window.speechSynthesis.cancel(); } catch { }
      }
      for (const part of parts) {
        const u = new SpeechSynthesisUtterance(part);
        const v = this._chooseVoice();
        if (v) u.voice = v;
        u.rate = (opts.rate ?? this.rate);
        u.pitch = (opts.pitch ?? this.pitch);
        u.lang = (opts.lang ?? v?.lang ?? 'en-US');
        await this._speakOneWithRetry(u, v);
      }
    }

    _speakOneWithRetry(u, v) {
      return new Promise((resolve) => {
        let startedAt = 0;
        const finalize = () => {
          this._speaking = false;
          resolve();
        };
        const onEnd = () => {
          const dur = startedAt ? (performance.now() - startedAt) : 0;
          if (dur < 200 && v) {
            // Retry without explicit voice (Chrome quick-end bug)
            try { window.speechSynthesis.cancel(); } catch { }
            const u2 = new SpeechSynthesisUtterance(u.text);
            u2.rate = u.rate; u2.pitch = u.pitch; u2.lang = u.lang;
            u2.onend = finalize; u2.onerror = finalize;
            try { window.speechSynthesis.resume(); } catch { }
            this._speaking = true;
            try { window.speechSynthesis.speak(u2); } catch { finalize(); }
            return;
          }
          finalize();
        };
        u.onstart = () => { startedAt = performance.now(); };
        u.onend = onEnd;
        u.onerror = onEnd;
        this._speaking = true;
        try { window.speechSynthesis.speak(u); } catch { finalize(); }
      });
    }

    pause() { try { window.speechSynthesis.pause(); this._paused = true; } catch { } }
    resume() { try { window.speechSynthesis.resume(); this._paused = false; } catch { } }
    stop() { try { window.speechSynthesis.cancel(); this._speaking = false; this._paused = false; } catch { } }

    setRate(x) { this.rate = x; localStorage.setItem('vc.rate', String(x)); }
    setVoiceByName(name) { this.voiceNamePref = name; localStorage.setItem('vc.voice', name); }
    setEngine(name) { this.engine = name === 'api' ? 'api' : 'system'; try { localStorage.setItem('vc.engine', this.engine); } catch { } }
  }

  const VC = new SpeechEngine();

  // Prime/unlock speech on first user gesture (iOS/Safari policies)
  let __vc_unlocked = false;
  function unlockSpeechOnce() {
    if (__vc_unlocked) return;
    __vc_unlocked = true;
    try { window.speechSynthesis.resume(); } catch { }
    try {
      const u = new SpeechSynthesisUtterance('.');
      u.volume = 0; // silent primer
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
      // Cancel quickly to avoid audible blip
      setTimeout(() => { try { window.speechSynthesis.cancel(); } catch { } }, 60);
    } catch { }
  }
  ['pointerdown', 'pointerup', 'mousedown', 'click', 'touchstart', 'touchend', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockSpeechOnce, { once: true, passive: true });
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') unlockSpeechOnce(); });

  // ---------- BUILD / WIRE THE VOICE COACH PANEL ----------
  function ensureVoiceCoachPanel() {
    let panel = document.querySelector('.voice-coach, #voice-coach');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'voice-coach';
      panel.className = 'voice-coach';
      panel.innerHTML = `
        <div class="vc-grid" role="group" aria-label="Voice Coach">
          <div class="vc-drag" id="vc-drag" style="cursor:move;touch-action:none;user-select:none;-webkit-user-select:none;background:rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;margin:-2px -2px 8px -2px;display:flex;align-items:center;gap:8px">
            <span aria-hidden="true">⋮⋮</span>
            <span class="vc-label" style="font-size:12px;opacity:.8">Drag me</span>
          </div>
          <div class="vc-row">
            <div class="vc-label">Status</div>
            <div class="vc-value"><button class="vc-btn" id="vc-toggle" aria-pressed="true">On</button></div>
          </div>
          <div class="vc-row">
            <div class="vc-label">Engine</div>
            <div class="vc-value"><span id="vc-engine-status">System</span></div>
          </div>
          <div class="vc-row">
            <label class="vc-label" for="vc-engine">Engine</label>
            <div class="vc-value">
              <select id="vc-engine" style="min-width:160px">
                <option value="system">System</option>
                <option value="api">API</option>
              </select>
            </div>
          </div>
          <div class="vc-row">
            <label class="vc-label" for="vc-voice">Voice</label>
            <div class="vc-value"><select id="vc-voice" style="min-width:160px"></select></div>
          </div>
          <div class="vc-row">
            <label class="vc-label" for="vc-rate">Speed</label>
            <div class="vc-value">
              <input id="vc-rate" type="range" min="0.7" max="1.4" step="0.05" value="${VC.rate}" />
            </div>
          </div>
          <div class="vc-row" id="vc-api-voice-row" style="display:none">
            <label class="vc-label" for="vc-api-voice">API Voice</label>
            <div class="vc-value">
              <input id="vc-api-voice" type="text" placeholder="e.g. en-GB" style="min-width:160px" />
            </div>
          </div>
          <div class="vc-controls">
            <button class="vc-btn" id="vc-start">Start</button>
            <button class="vc-btn" id="vc-pause">Pause</button>
            <button class="vc-btn" id="vc-stop">Stop</button>
            <button class="vc-btn" id="vc-reset" title="Reset position">Reset</button>
            <button class="vc-btn" id="vc-api" title="Configure API TTS">API ⚙</button>
            <button class="vc-btn" id="vc-test" title="Test current voice">Test</button>
            <button class="vc-btn" id="vc-diag" title="Toggle tap diagnostic">Diag</button>
            <button class="vc-btn" id="vc-hide" title="Hide panel">Hide</button>
          </div>
          <p class="vc-label" style="grid-column:1/-1;margin:2px 0 0;display:none">
            Tip
          </p>
        </div>`;
      document.body.appendChild(panel);
    }
    // Ensure fixed positioning and high z-index
    if (!panel.style.position) panel.style.position = 'fixed';
    panel.style.zIndex = panel.style.zIndex || '100000';

    // Restore saved position or default to bottom-right
    try {
      const saved = JSON.parse(localStorage.getItem('vc.pos') || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        panel.style.left = saved.x + 'px';
        panel.style.top = saved.y + 'px';
        panel.style.right = '';
        panel.style.bottom = '';
      } else {
        // Default corner if no saved position
        if (!panel.style.left && !panel.style.top) {
          panel.style.right = '24px';
          panel.style.bottom = '24px';
        }
      }
    } catch { }
    // Persisted enabled state (default: ON)
    const savedEnabled = (() => { try { return localStorage.getItem('vc.enabled'); } catch { return null; } })();
    const enabledDefault = (savedEnabled == null) ? true : (savedEnabled === 'true');

    // Populate voices (async-safe)
    VC.ready.then(() => {
      const sel = $('#vc-voice', panel);
      if (!sel) return;
      const voices = VC.voices.filter(v => /en/i.test(v.lang || 'en'));
      if (!voices.length) return;
      sel.innerHTML = voices.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
      const match = voices.find(v => v.name === VC.voiceNamePref) ? VC.voiceNamePref : voices[0].name;
      sel.value = match;
      VC.setVoiceByName(sel.value);
      sel.onchange = () => VC.setVoiceByName(sel.value);
    });

    // Buttons
    const $toggle = $('#vc-toggle', panel);
    const $rate = $('#vc-rate', panel);
    const $start = $('#vc-start', panel);
    const $pause = $('#vc-pause', panel);
    const $stop = $('#vc-stop', panel);
    const $reset = $('#vc-reset', panel);
    const $engine = $('#vc-engine', panel);
    const $apiBtn = $('#vc-api', panel);
    const $apiVoice = $('#vc-api-voice', panel);
    const $engineStatus = $('#vc-engine-status', panel);
    const $test = $('#vc-test', panel);
    const $diag = $('#vc-diag', panel);
    const $hide = $('#vc-hide', panel);

    // Initialize toggle from storage (default ON)
    if ($toggle) {
      const on = enabledDefault;
      $toggle.setAttribute('aria-pressed', String(on));
      $toggle.textContent = on ? 'On' : 'Off';
      if (!on) VC.stop();
      try { localStorage.setItem('vc.enabled', String(on)); } catch { }
    }

    $toggle?.addEventListener('click', () => {
      const on = $toggle.getAttribute('aria-pressed') !== 'true';
      $toggle.setAttribute('aria-pressed', String(on));
      $toggle.textContent = on ? 'On' : 'Off';
      if (!on) VC.stop();
      try { localStorage.setItem('vc.enabled', String(on)); } catch { }
    });
    $rate?.addEventListener('input', () => VC.setRate(parseFloat($rate.value)));
    $pause?.addEventListener('click', () => VC.pause());
    $stop?.addEventListener('click', () => VC.stop());
    $start?.addEventListener('click', () => {
      unlockSpeechOnce();
      ensureEnabled();
      const candidate = document.getSelection()?.toString().trim() ||
        $('[data-read-target]')?.textContent ||
        document.querySelector('main, [role="main"]')?.textContent ||
        document.body.textContent;
      if (candidate) VC.speak(candidate, { clear: true });
    });

    // Engine toggle + API voice reflect
    if ($engine) {
      $engine.value = VC.engine;
      const reflect = () => {
        const apiOn = $engine.value === 'api';
        $('#vc-api-voice-row', panel).style.display = apiOn ? '' : 'none';
        if ($engineStatus) $engineStatus.textContent = apiOn ? 'API' : 'System';
      };
      reflect();
      $engine.addEventListener('change', () => { VC.setEngine($engine.value); reflect(); });
    }
    if ($apiVoice) {
      // load saved
      try { $apiVoice.value = VC.api._cfg.voice || ''; } catch { }
      $apiVoice.addEventListener('change', () => VC.api.setVoice($apiVoice.value.trim()));
    }
    $apiBtn?.addEventListener('click', () => {
      // Minimal config prompts to avoid heavy UI
      const base = prompt('Enter API base URL (use {voice} and {text} placeholders)\nExample: https://example.com/tts?voice={voice}&text={text}', VC.api._cfg.base || '');
      if (base == null) return; VC.api._cfg.base = base.trim();
      const mode = prompt('Mode: get-template or post-json', VC.api._cfg.mode || 'get-template');
      if (mode) VC.api._cfg.mode = (/post/i.test(mode) ? 'post-json' : 'get-template');
      const auth = prompt('Optional Authorization header (e.g. Bearer ...). Leave blank if not needed', VC.api._cfg.auth || '');
      if (auth != null) VC.api._cfg.auth = auth.trim();
      const voice = prompt('API voice id/name (used as {voice})', VC.api._cfg.voice || 'en-GB');
      if (voice) { VC.api._cfg.voice = voice; if ($apiVoice) $apiVoice.value = voice; }
      const on = confirm('Enable API TTS now? (OK = yes, Cancel = no)');
      VC.api._cfg.enabled = !!on; VC.setEngine(on ? 'api' : 'system');
      VC.api._save();
      if ($engine) $engine.value = on ? 'api' : 'system';
      if ($engineStatus) $engineStatus.textContent = on ? 'API' : 'System';
      alert('Saved API TTS settings. Engine: ' + (on ? 'API' : 'System'));
    });
    $test?.addEventListener('click', () => {
      const sample = 'Testing voice coach. This is a sample sentence.';
      VC.speak(sample, { clear: true });
    });

    // Hide panel -> show mini toggle
    ensureMiniToggle();
    $hide?.addEventListener('click', () => {
      try { localStorage.setItem('vc.hidden', 'true'); } catch { }
      panel.style.display = 'none';
      showMiniToggle(true);
    });

    function ensureEnabled() {
      if ($toggle?.getAttribute('aria-pressed') === 'false') {
        $toggle.setAttribute('aria-pressed', 'true');
        $toggle.textContent = 'On';
        try { localStorage.setItem('vc.enabled', 'true'); } catch { }
      }
    }

    // Reset position to bottom-right
    $reset?.addEventListener('click', () => {
      try { localStorage.removeItem('vc.pos'); } catch { }
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '24px';
      panel.style.bottom = '24px';
    });

    // Toggle diagnostic overlay
    $diag?.addEventListener('click', () => {
      const on = toggleTapDiagnostic();
      try { localStorage.setItem('vc.tapdiag', String(on)); } catch { }
      $diag.textContent = on ? 'Diag✓' : 'Diag';
    });

    // Lock initial size so it doesn't grow when dragging
    lockPanelSize(panel);

    // ----- Draggable behavior (whole panel) -----
    makeDraggable(panel); // allow dragging from anywhere; interactive controls are ignored
  }

  function lockPanelSize(panel) {
    try {
      const r = panel.getBoundingClientRect();
      // Fix width/height to current render size so height won't grow while dragging
      panel.style.boxSizing = panel.style.boxSizing || 'border-box';
      const maxH = Math.min(Math.round(window.innerHeight * 0.7), 520);
      const maxW = Math.max(240, Math.min(360, Math.round(window.innerWidth - 32)));
      panel.style.width = Math.min(Math.round(r.width), maxW) + 'px';
      panel.style.height = Math.min(Math.round(r.height), maxH) + 'px';
      // If content exceeds height, allow vertical scroll instead of growing
      if (!panel.style.overflow) panel.style.overflow = 'auto';
    } catch { }
  }

  function makeDraggable(panel, handle) {
    if (!panel) return;

    let dragging = false;
    let startX = 0, startY = 0; // pointer screen coords
    let panelX = 0, panelY = 0; // panel top-left
    const dragTarget = handle || panel; // default to whole panel

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function save(x, y) {
      try { localStorage.setItem('vc.pos', JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch { }
    }

    function rect() { return panel.getBoundingClientRect(); }

    function toFixedPosition() {
      // Convert current position to explicit left/top to avoid right/bottom conflicts
      const r = rect();
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = '';
      panel.style.bottom = '';
    }

    function isInteractive(el) {
      return !!el.closest('button,a,select,input,textarea,[role="button"],[contenteditable="true"],label');
    }

    function onPointerDown(e) {
      e.preventDefault();
      // Only left button / primary pointer
      if (e.button !== undefined && e.button !== 0) return;
      // Ignore drags from interactive controls
      if (isInteractive(e.target)) return;
      dragTarget.setPointerCapture?.(e.pointerId || 0);
      toFixedPosition();
      const r = rect();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      panelX = r.left; panelY = r.top;
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nx = panelX + dx;
      const ny = panelY + dy;
      const r = rect();
      const maxX = window.innerWidth - r.width;
      const maxY = window.innerHeight - r.height;
      const cx = clamp(nx, 6, Math.max(6, maxX - 6));
      const cy = clamp(ny, 6, Math.max(6, maxY - 6));
      panel.style.left = cx + 'px';
      panel.style.top = cy + 'px';
    }
    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      dragTarget.releasePointerCapture?.(e.pointerId || 0);
      const r = rect();
      save(r.left, r.top);
    }

    // Improve drag UX
    dragTarget.style.touchAction = 'none';
    // Optional: show move cursor for the panel background (don’t override when inside form controls)
    if (!panel.style.cursor) panel.style.cursor = 'move';

    dragTarget.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    // Keep the panel within viewport on resize/rotation
    window.addEventListener('resize', () => {
      const r = rect();
      // Responsively cap width/height to viewport, but do not increase them
      const currentW = parseFloat(panel.style.width || r.width);
      const currentH = parseFloat(panel.style.height || r.height);
      const maxW = Math.max(240, Math.min(360, window.innerWidth - 32));
      const maxH = Math.min(Math.round(window.innerHeight * 0.7), 520);
      const newW = Math.min(currentW, maxW);
      const newH = Math.min(currentH, maxH);
      panel.style.width = Math.round(newW) + 'px';
      panel.style.height = Math.round(newH) + 'px';

      const maxX = Math.max(0, window.innerWidth - newW);
      const maxY = Math.max(0, window.innerHeight - newH);
      const x = clamp(r.left, 6, maxX - 6);
      const y = clamp(r.top, 6, maxY - 6);
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = '';
      panel.style.bottom = '';
      save(x, y);
    });
  }

  // ---- Mini toggle button when hidden ----
  function ensureMiniToggle() {
    let btn = document.getElementById('vc-mini-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'vc-mini-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', 'Show Voice Coach');
      btn.textContent = '🎧';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        const panel = document.querySelector('.voice-coach, #voice-coach');
        if (panel) {
          panel.style.display = '';
          try { localStorage.setItem('vc.hidden', 'false'); } catch { }
        }
        showMiniToggle(false);
      });
    }
    // Respect saved state
    const hidden = (localStorage.getItem('vc.hidden') === 'true');
    showMiniToggle(hidden);
    const panel = document.querySelector('.voice-coach, #voice-coach');
    if (panel) panel.style.display = hidden ? 'none' : '';
  }

  function showMiniToggle(on) {
    const btn = document.getElementById('vc-mini-btn');
    if (btn) btn.style.display = on ? 'inline-flex' : 'none';
  }

  // ---- Tap diagnostic overlay ----
  function installTapDiagnostic() {
    if (document.getElementById('vc-tap-diag')) return;
    const box = document.createElement('div');
    box.id = 'vc-tap-diag';
    box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1000000;display:none';
    const marker = document.createElement('div');
    marker.style.cssText = 'position:absolute;border:2px solid #22c55e;border-radius:8px;background:rgba(34,197,94,.12);left:0;top:0;width:0;height:0;box-shadow:0 0 0 2px rgba(34,197,94,.4) inset';
    const label = document.createElement('div');
    label.style.cssText = 'position:fixed;left:8px;bottom:8px;background:#0b1220;color:#e5e7eb;border:1px solid rgba(255,255,255,.15);padding:6px 8px;border-radius:8px;font:12px system-ui;max-width:70vw';
    box.appendChild(marker); box.appendChild(label);
    document.body.appendChild(box);

    function showAt(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el || el === box) return;
      const r = el.getBoundingClientRect();
      marker.style.left = r.left + 'px';
      marker.style.top = r.top + 'px';
      marker.style.width = r.width + 'px';
      marker.style.height = r.height + 'px';
      const cs = getComputedStyle(el);
      label.textContent = `tap@(${Math.round(x)},${Math.round(y)}) → ${el.tagName.toLowerCase()}${el.id ? ('#' + el.id) : ''}${el.className ? ('.' + String(el.className).trim().replace(/\s+/g, '.')) : ''} · pointer-events:${cs.pointerEvents} · z:${cs.zIndex}`;
    }
    function onTap(e) { showAt(e.clientX, e.clientY); }
    window.addEventListener('pointerdown', onTap, { passive: true });
    box.__vc_cleanup = () => window.removeEventListener('pointerdown', onTap);
  }

  function toggleTapDiagnostic() {
    let box = document.getElementById('vc-tap-diag');
    if (!box) installTapDiagnostic(), box = document.getElementById('vc-tap-diag');
    const on = box.style.display !== 'block';
    box.style.display = on ? 'block' : 'none';
    return on;
  }

  // ---------- HEADPHONE BUTTONS ----------
  function bindHeadphoneButtons() {
    // Works for any existing markup: use data attributes or common classes
    const selectors = [
      '[data-say]', '[data-voice]', '[data-read]',
      '.headphone', '.btn-speak', '.vc-speak', '.icon-headphone-btn', 'button[aria-label*="read" i]'
    ].join(',');
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest(selectors);
      if (!btn) return;
      unlockSpeechOnce();
      // Turn on automatically if currently off
      const toggle = $('#vc-toggle');
      if (toggle?.getAttribute('aria-pressed') === 'false') {
        toggle.setAttribute('aria-pressed', 'true');
        toggle.textContent = 'On';
        try { localStorage.setItem('vc.enabled', 'true'); } catch { }
      }
      ev.preventDefault();
      // Possible targets
      let text = btn.getAttribute('data-say') || btn.getAttribute('data-read');
      const targetSel = btn.getAttribute('data-read-target');
      const target = targetSel ? document.querySelector(targetSel) : null;
      if (!text && target) text = target.textContent;
      if (!text) {
        // Try nearest textual container
        const host = btn.closest('[data-voice], article, section, .card, .panel') || btn.parentElement;
        text = (host?.textContent || '').trim();
      }
      if (text) VC.speak(text, { clear: true });
    });
  }

  // ---------- PER-CARD NARRATOR BUTTONS ----------
  function ensureCardNarrators() {
    const cards = Array.from(document.querySelectorAll('.card, section.card, article.card'));
    cards.forEach((card) => {
      if (card.querySelector('.vc-auto-bar')) return;
      const bar = document.createElement('div');
      bar.className = 'vc-auto-bar';
      bar.style.cssText = 'display:flex;gap:8px;align-items:center;margin:8px 0 0;flex-wrap:wrap';
      const sayBtn = document.createElement('button');
      sayBtn.type = 'button';
      sayBtn.className = 'btn vc-speak';
      sayBtn.innerHTML = '🎧 Start';
      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'btn';
      stopBtn.textContent = '■ Stop';
      bar.appendChild(sayBtn); bar.appendChild(stopBtn);
      // Insert after heading if present
      const anchor = card.querySelector('h2, h3, header') || card.firstElementChild || card;
      anchor.after(bar);
      sayBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        unlockSpeechOnce();
        const toggle = document.getElementById('vc-toggle');
        if (toggle?.getAttribute('aria-pressed') === 'false') {
          toggle.setAttribute('aria-pressed', 'true');
          toggle.textContent = 'On';
          try { localStorage.setItem('vc.enabled', 'true'); } catch { }
        }
        const txt = (card.textContent || '').trim();
        if (txt) VC.speak(txt, { clear: true });
      });
      stopBtn.addEventListener('click', () => VC.stop());
    });
  }

  // ---------- FOCUS SCREEN FIX (controls + duplicate cleanup) ----------
  function fixFocusScreens() {
    // Remove duplicate/hidden background focus screens if more than one exists
    const screens = $$('.focus-screen, .breathing-focus, .breath-player, .breathing-viewport, #focus, .focus');
    if (screens.length > 1) {
      // Keep the one most visible (closest to viewport center)
      let keep = screens[0], keepDist = Infinity, vh = window.innerHeight;
      screens.forEach(s => {
        const r = s.getBoundingClientRect();
        const centerDist = Math.abs((r.top + r.bottom) / 2 - vh / 2);
        if (centerDist < keepDist) { keep = s; keepDist = centerDist; }
      });
      screens.forEach(s => { if (s !== keep) s.classList.add('vc-hide'); });
    }

    // Add Start/Pause/Stop chips inside the visible focus/player container
    const host = $('.focus-screen:not(.vc-hide), .breathing-focus:not(.vc-hide), .breath-player:not(.vc-hide), .breathing-viewport:not(.vc-hide), #focus:not(.vc-hide), .focus:not(.vc-hide)') || screens[0];
    if (!host) return;

    // Remove Back-to-hub/section button
    $$('a,button', host).forEach(b => {
      const t = byText(b);
      if (t === 'back to hub/section' || t === 'back to hub' || t === 'back') b.remove();
    });

    if (!$('.vc-focus-controls', host)) {
      const box = document.createElement('div');
      box.className = 'vc-focus-controls';
      box.innerHTML = `
        <button type="button" class="vc-chip" data-vc="start">Start</button>
        <button type="button" class="vc-chip" data-vc="pause">Pause</button>
        <button type="button" class="vc-chip" data-vc="stop">Stop</button>`;
      host.style.position = host.style.position || 'relative';
      host.appendChild(box);

      box.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-vc]');
        if (!btn) return;
        const kind = btn.getAttribute('data-vc');
        if (kind === 'start') {
          // Try to narrate visible instruction (Inhale/Hold/Exhale) if present
          const visible = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
          const maybeText = (visible?.textContent || '').trim();
          const program = detectBreathingProgram(host) || defaultBoxProgram();
          narrateBreathing(program);
          if (maybeText) VC.speak(maybeText, { clear: false });
        } else if (kind === 'pause') {
          VC.pause();
          document.dispatchEvent(new CustomEvent('breathing:pause'));
        } else if (kind === 'stop') {
          VC.stop();
          document.dispatchEvent(new CustomEvent('breathing:stop'));
        }
      });
    }
  }

  function defaultBoxProgram() {
    // 4-4-4-4 classic box; can be overridden on pages with data attributes
    return [
      { label: 'Inhale', seconds: 4 },
      { label: 'Hold', seconds: 4 },
      { label: 'Exhale', seconds: 4 },
      { label: 'Hold', seconds: 4 },
    ];
  }

  function detectBreathingProgram(root) {
    // If your HTML provides timing via data attributes, pick them up.
    const stepNodes = $$('[data-breath-step]', root);
    if (!stepNodes.length) return null;
    const steps = stepNodes.map(n => ({
      label: n.getAttribute('data-breath-step') || n.getAttribute('aria-label') || n.textContent.trim(),
      seconds: parseFloat(n.getAttribute('data-seconds') || '0') || 0
    })).filter(s => s.seconds > 0);
    return steps.length ? steps : null;
  }

  let breathingTimer = null;
  async function narrateBreathing(steps) {
    clearTimeout(breathingTimer);
    document.dispatchEvent(new CustomEvent('breathing:start', { detail: steps }));
    let idx = 0;
    const run = async () => {
      const step = steps[idx % steps.length];
      await VC.speak(step.label, { clear: false });
      breathingTimer = setTimeout(() => {
        idx++; run();
      }, step.seconds * 1000);
    };
    run();
  }

  // ---------- MOBILE NAV OVERLAY ----------
  function ensureMobileOverlay() {
    if ($('#vc-mobile-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'vc-mobile-overlay';
    overlay.innerHTML = `
      <div id="vc-mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu">
        <button class="vc-btn" id="vc-menu-close" style="float:right;margin:6px 6px 8px 0">Close</button>
        <div id="vc-mobile-menu-body"></div>
      </div>`;
    document.body.appendChild(overlay);

    $('#vc-menu-close').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target.id === 'vc-mobile-overlay') closeOverlay(); });

    // Hook common hamburger toggles
    const triggers = $$('.hamburger, .menu-toggle, #menu-toggle, [data-menu-toggle], button[aria-label*="menu" i]');
    triggers.forEach(t => {
      t.addEventListener('click', (e) => { e.preventDefault(); openOverlay(); }, { passive: false });
    });

    function openOverlay() {
      // Prefer cloning your existing <nav> to keep links accurate
      const nav = document.querySelector('nav') || $('header nav') || $('[role="navigation"]');
      const body = $('#vc-mobile-menu-body');
      body.innerHTML = '';
      if (nav) {
        const clone = nav.cloneNode(true);
        normalizeMobileMenu(clone);
        body.appendChild(clone);
      } else {
        const list = document.createElement('ul');
        list.innerHTML = '<li><a href="./index.html">Home</a></li>';
        body.appendChild(list);
      }
      document.body.style.overflow = 'hidden';
      $('#vc-mobile-overlay').setAttribute('open', '');
    }
    function closeOverlay() {
      document.body.style.overflow = '';
      $('#vc-mobile-overlay').removeAttribute('open');
    }

    function normalizeMobileMenu(root) {
      // Turn nested lists into <details> so chevrons work reliably on mobile
      $$('li', root).forEach(li => {
        const sub = $('ul,ol', li);
        const a = $('a', li);
        if (sub && a) {
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.innerHTML = a.outerHTML + ' <span class="chevron">›</span>';
          details.appendChild(summary);
          sub.querySelectorAll('script,style').forEach(n => n.remove());
          details.appendChild(sub);
          li.replaceWith(details);
        }
      });
    }
  }

  // ---------- INIT ----------
  function init() {
    ensureVoiceCoachPanel();
    bindHeadphoneButtons();
    ensureCardNarrators();
    fixFocusScreens();
    // Skip Voice Coach's own mobile overlay if a dedicated nav override is present
    if (!window.__NAV_OVERRIDE__) ensureMobileOverlay();

    // Expose a tiny global so pages can reuse unified TTS (merge, don't clobber existing helpers)
    window.__MSHARE__ = window.__MSHARE__ || {};
    const prevTTS = (window.__MSHARE__.TTS && typeof window.__MSHARE__.TTS === 'object') ? window.__MSHARE__.TTS : {};
    window.__MSHARE__.TTS = Object.assign({}, prevTTS, {
      speak: (t, opts) => VC.speak(String(t || ''), opts || {}),
      stop: () => VC.stop(),
      pause: () => VC.pause(),
      setEngine: (name) => VC.setEngine(name)
    });

    // If pages are dynamically swapped, keep us alive
    const ro = new MutationObserver((muts) => {
      let needs = false;
      muts.forEach(m => {
        if (m.addedNodes && m.addedNodes.length) needs = true;
      });
      if (needs) {
        bindHeadphoneButtons();
        ensureCardNarrators();
        fixFocusScreens();
      }
    });
    ro.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
