/* M Share – Voicebot v1.2
   Fixes: narration not starting after Stop (Chrome cancel() quirk), broader text capture, safer voice init.
   Enhancements: improved readability with high‑contrast colours, mobile touch drag support, UK English defaults.
*/
(function () {
    'use strict';

    const W = window;
    const D = document;
    const NS_KEY = '__MSHARE__';
    const POS_KEY = 'mshare_voicebot_pos_v1';
    const LOG_KEY = 'mshare_voice_logs_v1';
    const SET_KEY = 'mshare_voice_settings_v1';
    const STATS_KEY = 'mshare_voice_stats_v1';
    const PANEL_ID = 'mshare-voicebot';
    const STYLE_ID = 'mshare-voicebot-styles';

    const MS = (W[NS_KEY] = W[NS_KEY] || {});
    if (MS.Voice && MS.Voice.__ready) return;

    // -------------------- utils --------------------
    const $$ = (sel, ctx = D) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const nowIso = () => new Date().toISOString();
    const readJSON = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };
    const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    function log(event, data) {
        const list = readJSON(LOG_KEY, []);
        list.push({ t: nowIso(), event, ...(data || {}) });
        writeJSON(LOG_KEY, list);
    }

    // -------------------- settings --------------------
    // Set default language to UK English but allow stored settings to override
    const settings = Object.assign(
        { rate: 1.0, pitch: 1.0, lang: 'en-GB', voiceName: null, autoFollow: false, voiceCmd: false },
        readJSON(SET_KEY, {})
    );
    // If a stored lang is missing, ensure we fallback to en‑GB
    if (!settings.lang) settings.lang = 'en-GB';
    function saveSettings() { writeJSON(SET_KEY, settings); }

    // -------------------- capability --------------------
    function detectCompat() {
        const hasSS = 'speechSynthesis' in W;
        const hasSR = 'webkitSpeechRecognition' in W || 'SpeechRecognition' in W;
        const a = D.createElement('audio');
        const canMp3 = !!a.canPlayType && a.canPlayType('audio/mpeg') !== '';
        const canOgg = !!a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') !== '';
        const canWav = !!a.canPlayType && a.canPlayType('audio/wav; codecs="1"') !== '';
        return { hasSpeechSynthesis: hasSS, hasSpeechRecognition: hasSR, canMp3, canOgg, canWav };
    }

    // -------------------- styles --------------------
    function ensureStyles() {
        if (D.getElementById(STYLE_ID)) return;
        const s = D.createElement('style');
        s.id = STYLE_ID;
        // Use variables to ensure high contrast between background and text.
        s.textContent = `
      :root{
        --ms-voice-bg:#ffffff;
        --ms-voice-fg:#111827;
        --ms-voice-muted:#6b7280;
        --ms-voice-accent:#2563eb;
        --ms-voice-border:#e5e7eb;
        --ms-voice-shadow:0 10px 30px rgba(0,0,0,.15);
        --ms-voice-radius:14px;
        --ms-voice-gap:10px;
      }
      @media (prefers-color-scheme:dark){
        :root{
          --ms-voice-bg:#111827;
          --ms-voice-fg:#f9fafb;
          --ms-voice-muted:#9ca3af;
          --ms-voice-accent:#60a5fa;
          --ms-voice-border:#374151;
          --ms-voice-shadow:0 10px 30px rgba(0,0,0,.45);
        }
      }
      .mshare-voicebot{
        position:fixed;
        right:16px;
        bottom:16px;
        z-index:2147483000;
        width:min(92vw,360px);
        color:var(--ms-voice-fg);
        background:var(--ms-voice-bg);
        border:1px solid var(--ms-voice-border);
        border-radius:var(--ms-voice-radius);
        box-shadow:var(--ms-voice-shadow);
        font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji";
        user-select:none
      }
      .mshare-voicebot *{box-sizing:border-box}
      .mshare-voicebot__handle{
        display:flex;
        align-items:center;
        gap:8px;
        padding:10px 12px;
        cursor:move;
        border-bottom:1px solid var(--ms-voice-border);
        border-top-left-radius:var(--ms-voice-radius);
        border-top-right-radius:var(--ms-voice-radius);
        background:linear-gradient(0deg,rgba(0,0,0,.02),transparent)
      }
      .mshare-voicebot__title{flex:1;margin:0;font-size:14px;font-weight:700;letter-spacing:.2px}
      .mshare-voicebot__content{padding:12px}
      .mshare-voicebot__row{
        display:flex;
        gap:var(--ms-voice-gap);
        align-items:center;
        margin-bottom:10px;
        flex-wrap:wrap
      }
      .mshare-voicebot__field{display:flex;align-items:center;gap:8px}
      /* Buttons use theme colours for high contrast */
      .mshare-voicebot__btn{
        appearance:none;
        border:1px solid var(--ms-voice-border);
        padding:8px 12px;
        border-radius:10px;
        background:var(--ms-voice-bg);
        color:var(--ms-voice-fg);
        font-weight:600;
        letter-spacing:.2px;
        line-height:1;
        transition:transform .05s, background .15s, border-color .15s, color .15s
      }
      .mshare-voicebot__btn:hover{background:var(--ms-voice-border)}
      .mshare-voicebot__btn:active{transform:translateY(1px) scale(.99)}
      /* Start button accentuated for clarity */
      .mshare-voicebot__btn[data-voice-action="start"]{
        background:var(--ms-voice-accent);
        color:#fff;
        border-color:transparent
      }
      .mshare-voicebot__btn[data-voice-action="reset-pos"]{font-size:12px;padding:6px 8px;opacity:.9}
      .mshare-voicebot__select,
      .mshare-voicebot__cmd,
      .mshare-voicebot__range{
        width:100%;
        border:1px solid var(--ms-voice-border);
        border-radius:10px;
        padding:8px 10px;
        background:var(--ms-voice-bg);
        color:var(--ms-voice-fg)
      }
      .mshare-voicebot__range{padding:8px 0}
      .mshare-voicebot__cmd::placeholder{color:var(--ms-voice-muted)}
      .mshare-voicebot__meta{margin-top:4px;font-size:12px;color:var(--ms-voice-muted)}
      .mshare-sr-only{position:absolute!important;height:1px;width:1px;overflow:hidden;clip:rect(1px,1px,1px,1px);white-space:nowrap;border:0;padding:0;margin:-1px}
      .mshare-voicebot .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--ms-voice-muted);margin-right:2px}
      /* Focus outline for keyboard accessibility */
      .mshare-voicebot__handle:focus,
      .mshare-voicebot__btn:focus,
      .mshare-voicebot__select:focus,
      .mshare-voicebot__cmd:focus,
      .mshare-voicebot__range:focus{
        outline:2px solid var(--ms-voice-accent);
        outline-offset:2px
      }
    `;
        D.head.appendChild(s);
    }

    // -------------------- panel position helpers --------------------
    function panelBounds(panel) {
        const r = panel.getBoundingClientRect();
        const vw = W.innerWidth, vh = W.innerHeight;
        return {
            minLeft: 4,
            minTop: 4,
            maxLeft: vw - r.width - 4,
            maxTop: vh - r.height - 4
        };
    }
    function positionPanel(panel, left, top) {
        const b = panelBounds(panel);
        const l = clamp(left, b.minLeft, b.maxLeft);
        const t = clamp(top, b.minTop, b.maxTop);
        panel.style.left = l + 'px';
        panel.style.top = t + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        writeJSON(POS_KEY, { left: l, top: t });
    }
    // Enable both mouse and touch dragging
    function enableDrag(panel) {
        const handle = panel.querySelector('.mshare-voicebot__handle');
        let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;

        const startDrag = (clientX, clientY) => {
            dragging = true;
            const p = panel.getBoundingClientRect();
            sx = clientX;
            sy = clientY;
            sl = p.left;
            st = p.top;
        };
        const moveDrag = (clientX, clientY) => {
            if (!dragging) return;
            positionPanel(panel, sl + (clientX - sx), st + (clientY - sy));
        };
        const endDrag = () => { dragging = false; };

        // Mouse events
        handle.addEventListener('mousedown', (e) => {
            startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });
        W.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        W.addEventListener('mouseup', endDrag);

        // Touch events (for mobile)
        handle.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                const t = e.touches[0];
                startDrag(t.clientX, t.clientY);
                // prevent scrolling while dragging
                e.preventDefault();
            }
        }, { passive: false });
        W.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                const t = e.touches[0];
                moveDrag(t.clientX, t.clientY);
            }
        }, { passive: false });
        W.addEventListener('touchend', endDrag);
        W.addEventListener('touchcancel', endDrag);

        handle.setAttribute('tabindex', '0');
        handle.addEventListener('keydown', (e) => {
            const step = e.shiftKey ? 12 : 4;
            const l = parseFloat(panel.style.left || '16') || 16;
            const t = parseFloat(panel.style.top || '16') || 16;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'ArrowUp') positionPanel(panel, l, t - step);
            if (e.key === 'ArrowDown') positionPanel(panel, l, t + step);
            if (e.key === 'ArrowLeft') positionPanel(panel, l - step, t);
            if (e.key === 'ArrowRight') positionPanel(panel, l + step, t);
            if (e.key === 'Home') positionPanel(panel, 16, 16);
        });
        panel.querySelector('[data-voice-action="reset-pos"]').addEventListener('click', () => positionPanel(panel, 16, 16));
        W.addEventListener('resize', () => {
            const l = parseFloat(panel.style.left || '16') || 16;
            const t = parseFloat(panel.style.top || '16') || 16;
            positionPanel(panel, l, t);
        });
    }

    function ensurePanel() {
        ensureStyles();
        const ex = D.getElementById(PANEL_ID);
        if (ex) return ex;

        const wrap = D.createElement('section');
        wrap.id = PANEL_ID;
        wrap.className = 'mshare-voicebot';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-label', 'Voice Assistant');
        wrap.innerHTML = `
      <div class="mshare-voicebot__handle" aria-label="Move">
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
            <input id="mshare-voice-cmd" class="mshare-voicebot__cmd" placeholder="/voice-narrate, /voice-settings, /voice-log, /voice-compatibility, /voice-command" />
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
      </div>
    `;
        D.body.appendChild(wrap);
        const pos = readJSON(POS_KEY, null);
        if (pos) positionPanel(wrap, pos.left, pos.top);
        enableDrag(wrap);

        wrap.querySelector('#mshare-voice-cmd').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                MS.Voice.exec(e.currentTarget.value.trim());
            }
        });

        return wrap;
    }

    // -------------------- text capture --------------------
    function getSelectionText() {
        const s = W.getSelection && W.getSelection();
        return s && s.rangeCount ? (s.toString() || '').trim() : '';
    }
    function visibleTextNodes() {
        const root = D.querySelector('main') || D.body;
        // Relaxed filters: only skip obvious nav/footer/hidden stuff.
        const blocks = $$('h1,h2,h3,h4,h5,p,li,blockquote,figure figcaption,article section, .content, .card, .section', root);
        const parts = [];
        blocks.forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (!el.offsetParent && cs.position !== 'fixed') return;
            if (el.closest('nav,header,footer,[aria-hidden="true"],.modal,[role="dialog"]')) return;
            const t = (el.innerText || el.textContent || '').trim();
            if (t) parts.push(t);
        });
        return parts;
    }
    function cleanText(text) {
        try {
            return String(text)
                .replace(/[^\p{L}\p{N}\s\.,!?'’\-]/gu, ' ')
                .replace(/[\s\n\r\t]+/g, ' ')
                .replace(/\s([\.,!\?])/g, '$1')
                .trim();
        } catch {
            return String(text)
                .replace(/[^A-Za-z0-9\s\.,!?'’\-]/g, ' ')
                .replace(/[\s\n\r\t]+/g, ' ')
                .replace(/\s([\.,!\?])/g, '$1')
                .trim();
        }
    }
    function splitIntoSentences(text) {
        try {
            if ('Intl' in W && Intl.Segmenter) {
                const seg = new Intl.Segmenter(settings.lang || 'en-GB', { granularity: 'sentence' });
                return Array.from(seg.segment(text)).map(s => s.segment.trim()).filter(Boolean);
            }
        } catch { }
        const out = [], re = /[^.!?]+[.!?]|\S+$/g; let m;
        while ((m = re.exec(text)) !== null) out.push(m[0].trim());
        return out.length ? out : [text];
    }
    function chunkText(text, maxLen = 280) {
        const sentences = splitIntoSentences(text);
        const chunks = [];
        let cur = '';
        for (const s of sentences) {
            const add = cur.length ? cur + ' ' + s : s;
            if (add.length <= maxLen) cur = add;
            else {
                if (cur) chunks.push(cur);
                if (s.length <= maxLen) cur = s;
                else {
                    for (let i = 0; i < s.length; i += maxLen) chunks.push(s.slice(i, i + maxLen));
                    cur = '';
                }
            }
        }
        if (cur) chunks.push(cur);
        return chunks;
    }

    // -------------------- voice + STOP control --------------------
    let lastText = '';
    let currentUtter = null;

    const speakSession = { id: 0, aborted: false, audios: [] };
    function clearAudios() {
        speakSession.audios.forEach(a => {
            try { a.pause(); } catch { }
            try { a.currentTime = 0; } catch { }
            try { if (a._mshareUrl) URL.revokeObjectURL(a._mshareUrl); } catch { }
        });
        speakSession.audios.length = 0;
    }

    function listVoices() {
        try {
            return (W.speechSynthesis && W.speechSynthesis.getVoices && W.speechSynthesis.getVoices()) || [];
        } catch {
            return [];
        }
    }
    function pickVoice() {
        const vs = listVoices();
        if (!vs.length) return null;
        // first preference: explicit voiceName
        if (settings.voiceName) {
            const m = vs.find(v => v.name === settings.voiceName);
            if (m) return m;
        }
        // next: language preference (UK English)
        if (settings.lang) {
            const m = vs.find(v => v.lang && v.lang.toLowerCase().startsWith(settings.lang.toLowerCase()));
            if (m) return m;
        }
        // fallback: any en-GB voice
        const gb = vs.find(v => /en-GB/i.test(v.lang || ''));
        return gb || vs[0];
    }
    function updateVoiceListSelect() {
        const sel = D.getElementById('mshare-voice-voice');
        if (!sel) return;
        const vs = listVoices();
        const prev = sel.value;
        sel.innerHTML = '';
        vs.forEach(v => {
            const opt = D.createElement('option');
            opt.value = v.name;
            opt.textContent = `${v.name} ${v.lang ? `(${v.lang})` : ''}`;
            sel.appendChild(opt);
        });
        // If user already has a chosen voice, use it; else pick default language voice
        if (settings.voiceName && vs.some(v => v.name === settings.voiceName)) sel.value = settings.voiceName;
        else if (prev && vs.some(v => v.name === prev)) sel.value = prev;
        else {
            const pv = pickVoice();
            if (pv) sel.value = pv.name;
        }
    }
    async function ensureVoicesReady(timeoutMs = 2500) {
        if (!('speechSynthesis' in W)) return false;
        try { W.speechSynthesis.getVoices(); } catch { }
        let done = false;
        const p = new Promise((resolve) => {
            const start = Date.now();
            const poll = () => {
                const v = listVoices();
                if (v && v.length) {
                    done = true;
                    return resolve(true);
                }
                if (Date.now() - start >= timeoutMs) return resolve(false);
                setTimeout(poll, 100);
            };
            poll();
        });
        // also listen once
        try {
            W.speechSynthesis.addEventListener('voiceschanged', () => {
                if (!done) updateVoiceListSelect();
            }, { once: true });
        } catch { }
        return p;
    }

    // Chrome quirk: after cancel(), speaking immediately can fail. Do a small reset loop.
    async function synthReset() {
        if (!('speechSynthesis' in W)) return;
        try { W.speechSynthesis.cancel(); } catch { }
        // Wait until engine settles (not speaking/pending) or small timeout
        let tries = 0;
        while ((W.speechSynthesis.speaking || W.speechSynthesis.pending) && tries < 8) {
            await wait(40);
            tries++;
        }
        // Extra tiny warm-up delay helps on some builds
        await wait(60);
    }

    // Optional external TTS proxy (kept for completeness)
    const TTS = {
        config: null,
        configure(opts) { this.config = Object.assign({}, opts); },
        async speakViaProxy(text) {
            const cfg = this.config;
            if (!cfg || !cfg.proxyUrl) return null;
            const a = D.createElement('audio');
            const fmt = (a.canPlayType('audio/mpeg') && 'mp3') || (a.canPlayType('audio/ogg; codecs="vorbis"') && 'ogg') || 'mp3';
            const url = cfg.proxyUrl + '?format=' + encodeURIComponent(fmt) + (cfg.voice ? ('&voice=' + encodeURIComponent(cfg.voice)) : '');
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                if (!res.ok) throw new Error('TTS proxy failed ' + res.status);
                const blob = await res.blob();
                return URL.createObjectURL(blob);
            } catch (e) {
                console.warn('TTS proxy error', e);
                return null;
            }
        }
    };

    const StatsAdd = Object.assign({ narrationCount: 0, narrationMs: 0, calls: 0 }, readJSON(STATS_KEY, {}));
    function persistStatsAdd() { writeJSON(STATS_KEY, StatsAdd); }

    async function speak(text) {
        // start a fresh session + fully reset synth first
        speakSession.id += 1;
        speakSession.aborted = false;
        clearAudios();
        await synthReset(); // critical fix

        const myId = speakSession.id;
        const meta = D.getElementById('mshare-voice-meta');
        const cleaned = cleanText(text || '');
        if (!cleaned) {
            if (meta) meta.textContent = 'No readable text found.';
            return { ok: false, reason: 'empty' };
        }

        const chunks = chunkText(cleaned);
        const startAt = Date.now();

        async function speakChunkedViaProxy() {
            for (const ch of chunks) {
                if (speakSession.aborted || myId !== speakSession.id) return false;
                const objUrl = await TTS.speakViaProxy(ch);
                if (!objUrl) return false;
                await new Promise((resolve) => {
                    if (speakSession.aborted || myId !== speakSession.id) {
                        URL.revokeObjectURL(objUrl);
                        return resolve();
                    }
                    const a = new Audio(objUrl);
                    a._mshareUrl = objUrl;
                    speakSession.audios.push(a);
                    a.onended = () => {
                        try { URL.revokeObjectURL(objUrl); } catch { }
                        resolve();
                    };
                    a.onerror = () => {
                        try { URL.revokeObjectURL(objUrl); } catch { }
                        resolve();
                    };
                    a.play().catch(() => resolve());
                });
            }
            return true;
        }

        async function speakChunkedViaSS() {
            if (!('speechSynthesis' in W)) return false;
            await ensureVoicesReady();
            const v = pickVoice();
            let idx = 0;
            return await new Promise((resolve) => {
                const next = async () => {
                    if (speakSession.aborted || myId !== speakSession.id) return resolve(false);
                    if (idx >= chunks.length) return resolve(true);

                    const seg = chunks[idx++];
                    const ut = new SpeechSynthesisUtterance(seg);
                    currentUtter = ut;
                    if (v) ut.voice = v;
                    ut.rate = Math.min(2, Math.max(.5, Number(settings.rate) || 1));
                    ut.pitch = Math.min(2, Math.max(.5, Number(settings.pitch) || 1));
                    if (settings.lang) ut.lang = settings.lang;
                    ut.volume = 1;

                    ut.onend = () => {
                        if (speakSession.aborted || myId !== speakSession.id) return resolve(false);
                        next();
                    };
                    ut.onerror = () => {
                        if (speakSession.aborted || myId !== speakSession.id) return resolve(false);
                        next();
                    };

                    if (idx === 1 && meta) meta.textContent = `Speaking… ${v ? '[' + v.name + ']' : ''}`;

                    // Another tiny delay before first speak avoids Chrome dropping audio after cancel()
                    if (idx === 1) await wait(0);
                    setTimeout(() => {
                        try { W.speechSynthesis.speak(ut); } catch {
                            next();
                        }
                    }, 0);
                };
                next();
            });
        }

        const okSS = await speakChunkedViaSS();
        if (!okSS && !(speakSession.aborted || myId !== speakSession.id)) {
            const okProxy = await speakChunkedViaProxy();
            if (!okProxy && !(speakSession.aborted || myId !== speakSession.id)) {
                if (meta) meta.textContent = 'Speech not available; connect external TTS.';
                log('speak_unsupported', {});
                return { ok: false };
            }
        }

        if (speakSession.aborted || myId !== speakSession.id) {
            if (meta) meta.textContent = 'Stopped';
            return { ok: false, reason: 'stopped' };
        }

        const dur = Date.now() - startAt;
        if (meta) meta.textContent = 'Done';
        log('speak_end', { len: cleaned.length, durationMs: dur });
        StatsAdd.narrationCount += 1;
        StatsAdd.narrationMs += dur;
        persistStatsAdd();
        return { ok: true };
    }

    function startNarration() {
        // Prefer user selection, else gather visible, else fallback to whole body.
        const sel = getSelectionText();
        const parts = sel ? [sel] : visibleTextNodes();
        let joined = parts.join('\n\n').trim();
        if (!joined) joined = (D.querySelector('main')?.innerText || D.body.innerText || '').trim();
        lastText = joined;
        return speak(joined);
    }

    function pause() {
        try { W.speechSynthesis && W.speechSynthesis.pause(); } catch { }
        speakSession.audios.forEach(a => { try { a.pause(); } catch { } });
        log('pause', {});
    }
    function resume() {
        try { W.speechSynthesis && W.speechSynthesis.resume(); } catch { }
        const last = speakSession.audios.at(-1);
        if (last && last.paused) {
            try { last.play(); } catch { }
        }
        log('resume', {});
    }
    function stop() {
        speakSession.aborted = true;
        speakSession.id += 1;
        try { W.speechSynthesis && W.speechSynthesis.cancel(); } catch { }
        clearAudios();
        const meta = D.getElementById('mshare-voice-meta');
        if (meta) meta.textContent = 'Stopped';
        log('stop', {});
    }
    function repeat() {
        if (lastText) speak(lastText);
    }

    // -------------------- global triggers --------------------
    function isStartTrigger(el) {
        if (!el) return false;
        if (el.closest('#' + PANEL_ID)) return false;
        const txt = (el.textContent || '').toLowerCase();
        if (/\b(start|play|listen|read|narrate)\b/.test(txt)) return true;
        if (el.matches('[data-voice="start"], .voice-start-btn')) return true;
        return false;
    }
    function globalClick(e) {
        const t = e.target && (e.target.closest('button, a, [role="button"], .voice-start-btn'));
        if (!t) return;
        if (isStartTrigger(t)) startNarration();
    }

    // -------------------- speech recognition (optional) --------------------
    let recognizer = null;
    function setupRecognition() {
        const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
        if (!Ctor) return null;
        const r = new Ctor();
        // Use UK English by default
        r.lang = settings.lang || 'en-GB';
        r.continuous = true;
        r.interimResults = false;
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
        r.onerror = () => { };
        r.onend = () => {
            if (settings.voiceCmd) {
                try { r.start(); } catch { }
            }
        };
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

    // -------------------- init --------------------
    async function init() {
        const panel = ensurePanel();

        panel.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest('[data-voice-action]');
            if (!btn) return;
            const act = btn.getAttribute('data-voice-action');
            if (act === 'start') startNarration();
            else if (act === 'pause') pause();
            else if (act === 'resume') resume();
            else if (act === 'stop') stop();
            else if (act === 'repeat') repeat();
        });

        const sel = D.getElementById('mshare-voice-voice');
        const r = D.getElementById('mshare-voice-rate');
        const p = D.getElementById('mshare-voice-pitch');
        if (sel) sel.addEventListener('change', () => {
            settings.voiceName = sel.value || null;
            saveSettings();
        });
        if (r) r.addEventListener('input', () => {
            settings.rate = Number(r.value) || 1;
            saveSettings();
        });
        if (p) p.addEventListener('input', () => {
            settings.pitch = Number(p.value) || 1;
            saveSettings();
        });

        await ensureVoicesReady();
        updateVoiceListSelect();
        if ('speechSynthesis' in W) {
            try {
                W.speechSynthesis.addEventListener('voiceschanged', updateVoiceListSelect);
            } catch {
                try { W.speechSynthesis.onvoiceschanged = updateVoiceListSelect; } catch { }
            }
        }

        W.addEventListener('click', globalClick, true);

        try {
            let deb = false;
            const obs = new MutationObserver(() => {
                if (deb) return;
                deb = true;
                setTimeout(() => {
                    const meta = D.getElementById('mshare-voice-meta');
                    if (meta && meta.textContent !== 'Ready' && !(W.speechSynthesis && W.speechSynthesis.speaking)) meta.textContent = 'Ready';
                    deb = false;
                }, 200);
            });
            obs.observe(D.body, { subtree: true, childList: true, characterData: true });
        } catch { }

        const compat = detectCompat();
        const meta = D.getElementById('mshare-voice-meta');
        if (meta) meta.textContent = `Ready • SS: ${compat.hasSpeechSynthesis ? 'yes' : 'no'} • SR: ${compat.hasSpeechRecognition ? 'yes' : 'no'}`;
        log('init', compat);

        ensureVoiceCmd(!!settings.voiceCmd);

        W.addEventListener('beforeunload', () => {
            try { W.speechSynthesis && W.speechSynthesis.cancel(); } catch { }
            clearAudios();
        });
    }

    // -------------------- commands + API --------------------
    function exec(cmd) {
        if (!cmd) return;
        const c = String(cmd).trim();
        const meta = D.getElementById('mshare-voice-meta');
        switch (c) {
            case '/voice-narrate': startNarration(); break;
            case '/voice-settings': ensurePanel().querySelector('.mshare-voicebot__handle').focus(); break;
            case '/voice-log': {
                const logs = readJSON(LOG_KEY, []);
                console.info('M Share Voice Logs', logs);
                if (meta) meta.textContent = `Logs: ${logs.length}`;
                break;
            }
            case '/voice-compatibility': {
                const res = detectCompat();
                console.info('M Share Voice Compatibility', res);
                if (meta) meta.textContent = `Compat: SS ${res.hasSpeechSynthesis ? '✓' : '×'}, SR ${res.hasSpeechRecognition ? '✓' : '×'}`;
                break;
            }
            case '/voice-command': {
                settings.voiceCmd = !settings.voiceCmd;
                saveSettings();
                ensureVoiceCmd(settings.voiceCmd);
                if (meta) meta.textContent = `Voice command: ${settings.voiceCmd ? 'on' : 'off'}`;
                break;
            }
            default:
                if (meta) meta.textContent = 'Unknown command';
        }
        log('exec', { cmd: c });
    }

    const Calls = {
        config: { provider: null, twilio: null },
        configureTwilio(opts) {
            this.config.provider = 'twilio';
            this.config.twilio = Object.assign({}, opts);
            log('calls_config_twilio', { haveToken: !!(opts && opts.token) });
        },
        startOutbound(number, voiceUrl) {
            log('calls_outbound_attempt', { number });
            console.warn('Outbound call requested', number, voiceUrl, this.config);
            return { ok: false, reason: 'not-configured' };
        },
        acceptInbound() {
            log('calls_inbound_attempt', {});
            console.warn('Inbound call handling requires configured provider.');
            return { ok: false, reason: 'not-configured' };
        }
    };

    MS.Voice = {
        __ready: true,
        init,
        exec,
        compatibility: detectCompat,
        speak: (t) => speak(String(t || '').trim() || visibleTextNodes().join('\n\n')),
        pause,
        resume,
        stop,
        repeat,
        settings,
        Logs: {
            get: () => readJSON(LOG_KEY, []),
            clear: () => writeJSON(LOG_KEY, [])
        },
        Calls,
        TTS,
        analytics() { return Object.assign({}, readJSON(STATS_KEY, StatsAdd)); },
        report() { return { compat: detectCompat(), stats: this.analytics(), logs: this.Logs.get().slice(-50) }; }
    };

    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
