/* M Share – Voicebot v1
   Site-wide narration using Web Speech API with graceful fallbacks and call stubs.
   - No bundlers; loaded via <script> from footer helper.
   - Exposes window.__MSHARE__.Voice namespace.
   - Idempotent: safe to load multiple times; builds panel once.
*/
(function () {
    const W = window;
    const D = document;
    const NS_KEY = '__MSHARE__';
    const POS_KEY = 'mshare_voicebot_pos_v1';
    const LOG_KEY = 'mshare_voice_logs_v1';
    const SET_KEY = 'mshare_voice_settings_v1';

    const MS = (W[NS_KEY] = W[NS_KEY] || {});
    if (MS.Voice && MS.Voice.__ready) return; // idempotent

    // Utilities
    const q = (sel, ctx = D) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const nowIso = () => new Date().toISOString();
    const readJSON = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def; } catch { return def; } };
    const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

    // Basic capabilities detection
    function detectCompat() {
        const ua = navigator.userAgent || '';
        const hasSS = 'speechSynthesis' in W;
        const hasSR = 'webkitSpeechRecognition' in W || 'SpeechRecognition' in W;
        const audio = document.createElement('audio');
        const canMp3 = !!audio.canPlayType && audio.canPlayType('audio/mpeg') !== '';
        const canOgg = !!audio.canPlayType && audio.canPlayType('audio/ogg; codecs="vorbis"') !== '';
        const canWav = !!audio.canPlayType && audio.canPlayType('audio/wav; codecs="1"') !== '';
        return { hasSpeechSynthesis: hasSS, hasSpeechRecognition: hasSR, canMp3, canOgg, canWav, ua };
    }

    // Logging
    function log(event, data) {
        const list = readJSON(LOG_KEY, []);
        list.push({ t: nowIso(), event, ...data });
        writeJSON(LOG_KEY, list);
    }

    // Settings
    const settings = Object.assign({ rate: 1.0, pitch: 1.0, lang: null, voiceName: null, autoFollow: false, voiceCmd: false }, readJSON(SET_KEY, {}));
    function saveSettings() { writeJSON(SET_KEY, settings); }

    // Panel construction
    function ensurePanel() {
        if (D.getElementById('mshare-voicebot')) return D.getElementById('mshare-voicebot');
        const wrap = D.createElement('section');
        wrap.id = 'mshare-voicebot';
        wrap.className = 'mshare-voicebot';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-label', 'Voice Assistant');
        wrap.innerHTML = `
      <div class="mshare-voicebot__handle" aria-label="Move" tabindex="0">
        <span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>
        <h3 class="mshare-voicebot__title">Voice Assistant</h3>
        <button type="button" class="mshare-voicebot__btn" data-voice-action="reset-pos" title="Reset position">Reset</button>
      </div>
      <div class="mshare-voicebot__content">
        <div class="mshare-voicebot__row">
          <button type="button" class="mshare-voicebot__btn" data-voice-action="start">Start</button>
          <button type="button" class="mshare-voicebot__btn" data-voice-action="pause">Pause</button>
          <button type="button" class="mshare-voicebot__btn" data-voice-action="resume">Resume</button>
          <button type="button" class="mshare-voicebot__btn" data-voice-action="stop">Stop</button>
          <button type="button" class="mshare-voicebot__btn" data-voice-action="repeat">Repeat</button>
        </div>
        <div class="mshare-voicebot__row">
          <div class="mshare-voicebot__field" style="flex:1 1 100%">
            <label class="mshare-sr-only" for="mshare-voice-cmd">Command</label>
            <input id="mshare-voice-cmd" class="mshare-voicebot__cmd" placeholder="/voice-narrate, /voice-settings, /voice-log, /voice-compatibility" />
          </div>
        </div>
        <div class="mshare-voicebot__row">
          <div class="mshare-voicebot__field" style="flex:1 1 55%">
            <label class="mshare-sr-only" for="mshare-voice-voice">Voice</label>
            <select id="mshare-voice-voice" class="mshare-voicebot__select"></select>
          </div>
          <div class="mshare-voicebot__field" style="flex:1 1 20%">
            <label class="mshare-sr-only" for="mshare-voice-rate">Rate</label>
            <input id="mshare-voice-rate" type="range" min="0.6" max="1.6" step="0.05" value="${settings.rate}" class="mshare-voicebot__range" />
          </div>
          <div class="mshare-voicebot__field" style="flex:1 1 20%">
            <label class="mshare-sr-only" for="mshare-voice-pitch">Pitch</label>
            <input id="mshare-voice-pitch" type="range" min="0.6" max="1.6" step="0.05" value="${settings.pitch}" class="mshare-voicebot__range" />
          </div>
        </div>
        <div class="mshare-voicebot__meta" id="mshare-voice-meta">Ready</div>
      </div>`;
        D.body.appendChild(wrap);
        // Restore position
        const pos = readJSON(POS_KEY, null);
        if (pos) { positionPanel(wrap, pos.left, pos.top); }
        // Dragging with bounds
        enableDrag(wrap);
        // Wire command box
        const cmd = wrap.querySelector('#mshare-voice-cmd');
        cmd.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); MS.Voice.exec(cmd.value.trim()); } });
        return wrap;
    }

    function panelBounds(panel) {
        const rect = panel.getBoundingClientRect();
        const vw = W.innerWidth, vh = W.innerHeight;
        return { minLeft: 4, minTop: 4, maxLeft: vw - rect.width - 4, maxTop: vh - rect.height - 4 };
    }

    function positionPanel(panel, left, top) {
        const b = panelBounds(panel);
        panel.style.left = clamp(left, b.minLeft, b.maxLeft) + "px";
        panel.style.top = clamp(top, b.minTop, b.maxTop) + "px";
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        writeJSON(POS_KEY, { left: parseFloat(panel.style.left) || 16, top: parseFloat(panel.style.top) || 16 });
    }

    function enableDrag(panel) {
        const handle = panel.querySelector('.mshare-voicebot__handle');
        let dragging = false, startX = 0, startY = 0, startL = 0, startT = 0;
        const onDown = (e) => { dragging = true; const p = panel.getBoundingClientRect(); startX = e.clientX; startY = e.clientY; startL = p.left; startT = p.top; e.preventDefault(); };
        const onMove = (e) => { if (!dragging) return; const nx = startL + (e.clientX - startX); const ny = startT + (e.clientY - startY); positionPanel(panel, nx, ny); };
        const onUp = () => { dragging = false; };
        handle.addEventListener('mousedown', onDown);
        W.addEventListener('mousemove', onMove);
        W.addEventListener('mouseup', onUp);
        // Keyboard move
        handle.addEventListener('keydown', (e) => {
            const step = e.shiftKey ? 10 : 2;
            const curL = parseFloat(panel.style.left || '16') || 16;
            const curT = parseFloat(panel.style.top || '16') || 16;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
            if (e.key === 'ArrowUp') positionPanel(panel, curL, curT - step);
            if (e.key === 'ArrowDown') positionPanel(panel, curL, curT + step);
            if (e.key === 'ArrowLeft') positionPanel(panel, curL - step, curT);
            if (e.key === 'ArrowRight') positionPanel(panel, curL + step, curT);
            if (e.key === 'Home') { positionPanel(panel, 16, 16); }
        });
        // Reset button
        panel.querySelector('[data-voice-action="reset-pos"]').addEventListener('click', () => positionPanel(panel, 16, 16));
    }

    // Speech synthesis management
    let lastText = '';
    let currentUtter = null;
    function listVoices() { try { return (speechSynthesis.getVoices && speechSynthesis.getVoices()) || []; } catch { return []; } }

    function pickVoice() {
        const vs = listVoices();
        if (!vs.length) return null;
        if (settings.voiceName) { const m = vs.find(v => v.name === settings.voiceName); if (m) return m; }
        if (settings.lang) { const m = vs.find(v => v.lang && v.lang.toLowerCase().startsWith(settings.lang.toLowerCase())); if (m) return m; }
        // Prefer en-GB for UK tone if available
        const gb = vs.find(v => /en-GB/i.test(v.lang || '')); if (gb) return gb;
        return vs[0];
    }

    function updateVoiceListSelect() {
        const sel = D.getElementById('mshare-voice-voice'); if (!sel) return;
        const vs = listVoices();
        sel.innerHTML = '';
        vs.forEach(v => {
            const opt = D.createElement('option');
            opt.value = v.name; opt.textContent = `${v.name} ${v.lang ? ('(' + v.lang + ')') : ''}`;
            if (settings.voiceName && settings.voiceName === v.name) opt.selected = true;
            sel.appendChild(opt);
        });
        if (!settings.voiceName && vs.length) { const pv = pickVoice(); if (pv) sel.value = pv.name; }
    }

    function visibleTextNodes() {
        // Gather readable text from main content
        const root = D.querySelector('main') || D.body;
        const blocks = q('h1,h2,h3,h4,h5,p,li,blockquote,figure figcaption,article section, .card, .section, .content', root);
        const parts = [];
        blocks.forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (!el.offsetParent && cs.position !== 'fixed') return;
            // Skip obviously decorative items
            if (el.closest('nav,header,footer,[aria-hidden="true"],.sheet,.modal')) return;
            const t = (el.innerText || el.textContent || '').trim();
            if (t) parts.push(t);
        });
        return parts;
    }

    // Clean text for natural narration: keep letters, spaces, and gentle punctuation
    function cleanText(text) {
        try {
            return String(text)
                .replace(/[^a-zA-Z\s\.,!?'’\-]/g, ' ') // drop digits/symbols
                .replace(/[\s\n\r\t]+/g, ' ')
                .replace(/\s([\.,!\?])/g, '$1')
                .trim();
        } catch { return text; }
    }

    // Split long text into speakable chunks (helps iOS/Safari and improves cadence)
    function chunkText(text, maxLen = 280) {
        const chunks = []; const sentences = text.split(/(?<=[\.!?])\s+/);
        let cur = '';
        for (const s of sentences) {
            if ((cur + ' ' + s).trim().length <= maxLen) cur = (cur ? cur + ' ' : '') + s;
            else {
                if (cur) chunks.push(cur); if (s.length <= maxLen) cur = s; else {
                    // hard split extremely long segments
                    for (let i = 0; i < s.length; i += maxLen) chunks.push(s.slice(i, i + maxLen));
                    cur = '';
                }
            }
        }
        if (cur) chunks.push(cur);
        return chunks;
    }

    // TTS fallback hooks (optional external provider via proxy)
    const TTS = {
        config: null,
        configure(opts) { this.config = Object.assign({}, opts); },
        async speakViaProxy(text) {
            const cfg = this.config; if (!cfg || !cfg.proxyUrl) return null;
            // Choose preferred format by capability
            const compat = detectCompat();
            const fmt = (compat.canMp3 && 'mp3') || (compat.canOgg && 'ogg') || (compat.canWav && 'wav') || 'mp3';
            const url = cfg.proxyUrl + '?format=' + encodeURIComponent(fmt) + (cfg.voice ? ('&voice=' + encodeURIComponent(cfg.voice)) : '');
            try {
                const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
                if (!res.ok) throw new Error('TTS proxy failed ' + res.status);
                const blob = await res.blob();
                return URL.createObjectURL(blob);
            } catch (e) { console.warn('TTS proxy error', e); return null; }
        }
    };

    function speak(text) {
        const meta = D.getElementById('mshare-voice-meta');
        const cleaned = cleanText(text);
        const chunks = chunkText(cleaned);
        const startAt = Date.now();
        let spokenCount = 0;

        async function speakChunkedViaProxy() {
            for (const ch of chunks) {
                const objUrl = await TTS.speakViaProxy(ch);
                if (!objUrl) return false; // proxy failed
                await new Promise((resolve) => {
                    const a = new Audio(objUrl);
                    a.onended = () => { URL.revokeObjectURL(objUrl); resolve(); };
                    a.onerror = () => { URL.revokeObjectURL(objUrl); resolve(); };
                    a.play().catch(() => resolve());
                });
                spokenCount += ch.length;
            }
            return true;
        }

        async function speakChunkedViaSS() {
            if (!('speechSynthesis' in W)) return false;
            try { speechSynthesis.cancel(); } catch { }
            const v = pickVoice();
            let idx = 0;
            return await new Promise((resolve) => {
                const next = () => {
                    if (idx >= chunks.length) { resolve(true); return; }
                    const seg = chunks[idx++];
                    const ut = new SpeechSynthesisUtterance(seg);
                    currentUtter = ut;
                    if (v) ut.voice = v;
                    ut.rate = settings.rate || 1; ut.pitch = settings.pitch || 1; if (settings.lang) ut.lang = settings.lang;
                    ut.onend = () => { spokenCount += seg.length; next(); };
                    ut.onerror = () => { next(); };
                    if (idx === 1) { meta && (meta.textContent = `Speaking… ${v ? ('[' + v.name + ']') : ''}`); log('speak_start', { len: cleaned.length, voice: v ? v.name : null }); }
                    speechSynthesis.speak(ut);
                };
                next();
            });
        }

        // Try Web Speech API first, then proxy fallback
        const doIt = async () => {
            const okSS = await speakChunkedViaSS();
            if (!okSS) {
                const okProxy = await speakChunkedViaProxy();
                if (!okProxy) { meta && (meta.textContent = 'Speech not available; connect external TTS.'); log('speak_unsupported', {}); return { ok: false }; }
            }
            const dur = Date.now() - startAt;
            meta && (meta.textContent = 'Done');
            log('speak_end', { len: cleaned.length, durationMs: dur });
            // Analytics
            StatsAdd.narrationCount += 1; StatsAdd.narrationMs += dur; persistStatsAdd();
            return { ok: true };
        };
        return doIt();
    }

    function startNarration() { const parts = visibleTextNodes(); const joined = parts.join('\n\n'); lastText = joined; return speak(joined); }
    function pause() { try { speechSynthesis.pause(); log('pause', {}); } catch { } }
    function resume() { try { speechSynthesis.resume(); log('resume', {}); } catch { } }
    function stop() { try { speechSynthesis.cancel(); log('stop', {}); } catch { } }
    function repeat() { if (lastText) speak(lastText); }

    // Event delegation for common Start/Play/Listen triggers
    function isStartTrigger(el) {
        if (!el) return false;
        const txt = (el.textContent || '').toLowerCase();
        if (/\b(start|play|listen|read|narrate)\b/.test(txt)) return true;
        if (el.matches('[data-voice="start"], .voice-start-btn')) return true;
        return false;
    }

    function globalClick(e) {
        const t = e.target.closest('button, a, [role="button"]');
        if (!t) return;
        if (isStartTrigger(t)) {
            // Only start if user gesture present to satisfy Safari/iOS
            startNarration();
        }
    }

    // Auto update voice list when voices become available (async in some browsers)
    if ('speechSynthesis' in W) { try { speechSynthesis.onvoiceschanged = updateVoiceListSelect; } catch { } }

    // Voice command activation (toggleable)
    let recognizer = null;
    function setupRecognition() {
        const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition; if (!Ctor) return null;
        const r = new Ctor(); r.lang = settings.lang || 'en-GB'; r.continuous = true; r.interimResults = false;
        r.onresult = (ev) => {
            try {
                const res = ev.results[ev.results.length - 1][0].transcript.toLowerCase();
                log('voice_cmd', { res });
                if (/\b(read|start|play|narrate)\b/.test(res)) startNarration();
                else if (/\b(pause|hold|wait)\b/.test(res)) pause();
                else if (/\b(resume|continue)\b/.test(res)) resume();
                else if (/\b(stop|cancel|end)\b/.test(res)) stop();
                else if (/\b(repeat|again)\b/.test(res)) repeat();
            } catch { }
        };
        r.onerror = () => { /* keep quiet */ };
        r.onend = () => { if (settings.voiceCmd) { try { r.start(); } catch { } } };
        return r;
    }

    function ensureVoiceCmd(on) {
        if (on) {
            if (!recognizer) recognizer = setupRecognition();
            try { recognizer && recognizer.start(); } catch { }
        } else {
            try { recognizer && recognizer.stop(); } catch { }
        }
    }

    function init() {
        const panel = ensurePanel();
        // Controls
        panel.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-voice-action]'); if (!btn) return;
            const act = btn.getAttribute('data-voice-action');
            if (act === 'start') startNarration();
            else if (act === 'pause') pause();
            else if (act === 'resume') resume();
            else if (act === 'stop') stop();
            else if (act === 'repeat') repeat();
        });
        // Settings wiring
        const sel = D.getElementById('mshare-voice-voice');
        const r = D.getElementById('mshare-voice-rate');
        const p = D.getElementById('mshare-voice-pitch');
        if (sel) { sel.addEventListener('change', () => { settings.voiceName = sel.value || null; saveSettings(); }); }
        if (r) { r.addEventListener('input', () => { settings.rate = Number(r.value) || 1; saveSettings(); }); }
        if (p) { p.addEventListener('input', () => { settings.pitch = Number(p.value) || 1; saveSettings(); }); }
        updateVoiceListSelect();
        W.addEventListener('click', globalClick, true);
        // Mutation observer to keep meta fresh when main changes (debounced to avoid loops)
        try {
            let metaDebounce = false;
            const obs = new MutationObserver(() => {
                if (metaDebounce) return;
                metaDebounce = true;
                setTimeout(() => {
                    const meta = D.getElementById('mshare-voice-meta');
                    if (meta && meta.textContent !== 'Ready') meta.textContent = 'Ready';
                    metaDebounce = false;
                }, 200);
                if (settings.autoFollow && !('speechSynthesis' in W && speechSynthesis.speaking)) { /* optional auto-follow */ }
            });
            obs.observe(D.body, { subtree: true, childList: true, characterData: true });
        } catch { }
        const compat = detectCompat();
        const meta = D.getElementById('mshare-voice-meta');
        meta && (meta.textContent = `Ready • SS: ${compat.hasSpeechSynthesis ? "yes" : "no"} • SR: ${compat.hasSpeechRecognition ? "yes" : "no"}`);
        log('init', compat);
        // Respect saved voice command preference
        ensureVoiceCmd(!!settings.voiceCmd);
    }

    // Commands API
    function exec(cmd) {
        if (!cmd) return;
        const c = String(cmd).trim();
        if (!c.startsWith('/')) return;
        const meta = D.getElementById('mshare-voice-meta');
        switch (c) {
            case '/voice-narrate': startNarration(); break;
            case '/voice-settings': ensurePanel().querySelector('.mshare-voicebot__handle').focus(); break;
            case '/voice-log': {
                const logs = readJSON(LOG_KEY, []); console.info('M Share Voice Logs', logs); meta && (meta.textContent = `Logs: ${logs.length}`); break;
            }
            case '/voice-compatibility': {
                const res = detectCompat(); console.info('M Share Voice Compatibility', res); meta && (meta.textContent = `Compat: SS ${res.hasSpeechSynthesis ? '✓' : '×'}, SR ${res.hasSpeechRecognition ? '✓' : '×'}`); break;
            }
            case '/voice-call': {
                console.warn('Call automation not configured. Use MS.Voice.Calls.configureTwilio(...) or WebRTC.'); meta && (meta.textContent = 'Calls: not configured'); break;
            }
            case '/voice-command': {
                settings.voiceCmd = !settings.voiceCmd; saveSettings(); ensureVoiceCmd(settings.voiceCmd); meta && (meta.textContent = `Voice command: ${settings.voiceCmd ? 'on' : 'off'}`); break;
            }
            default: meta && (meta.textContent = 'Unknown command');
        }
        log('exec', { cmd: c });
    }

    // Call stubs (Twilio/WebRTC placeholders)
    const Calls = {
        config: { provider: null, twilio: null },
        configureTwilio(opts) { this.config.provider = 'twilio'; this.config.twilio = Object.assign({}, opts); log('calls_config_twilio', { haveToken: !!opts?.token }); },
        startOutbound(number, voiceUrl) {
            log('calls_outbound_attempt', { number });
            console.warn('Outbound call requested', number, voiceUrl, this.config);
            // Real implementation would require server token + Twilio Client SDK; omitted for static site.
            return { ok: false, reason: 'not-configured' };
        },
        acceptInbound() {
            log('calls_inbound_attempt', {});
            console.warn('Inbound call handling requires configured provider.');
            return { ok: false, reason: 'not-configured' };
        }
    };

    // Lightweight analytics counters
    const STATS_KEY = 'mshare_voice_stats_v1';
    const StatsAdd = Object.assign({ narrationCount: 0, narrationMs: 0, calls: 0 }, readJSON(STATS_KEY, {}));
    function persistStatsAdd() { writeJSON(STATS_KEY, StatsAdd); }

    // Public API
    MS.Voice = {
        __ready: true,
        init,
        exec,
        compatibility: detectCompat,
        speak: (t) => speak(String(t || '').trim() || visibleTextNodes().join('\n\n')),
        pause, resume, stop, repeat,
        settings,
        Logs: { get: () => readJSON(LOG_KEY, []), clear: () => writeJSON(LOG_KEY, []) },
        Calls,
        TTS,
        analytics() { return Object.assign({}, StatsAdd); },
        report() { return { compat: detectCompat(), stats: this.analytics(), logs: this.Logs.get().slice(-50) }; }
    };

    // Auto-init once DOM is ready
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
