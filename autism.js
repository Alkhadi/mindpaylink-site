(() => {
    const SCOPE_KEY_PREFIX = 'mshare_coach_autism_';
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

    function saveVal(key, val) { try { localStorage.setItem(SCOPE_KEY_PREFIX + key, JSON.stringify(val)); } catch { } }
    function getVal(key, def = null) { try { const v = localStorage.getItem(SCOPE_KEY_PREFIX + key); return v ? JSON.parse(v) : def; } catch { return def; } }

    // Tiny local beep to avoid cross-file coupling; respects user gesture by creating/resuming context lazily
    let __AC = null; function ensureAC() { try { if (!__AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) __AC = new C(); } if (__AC && __AC.state === 'suspended') __AC.resume(); } catch { } return __AC; }
    function beep(freq = 660, dur = 0.12) { const ac = ensureAC(); if (!ac) return; const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'triangle'; o.frequency.value = freq; g.gain.value = 0; o.connect(g); g.connect(ac.destination); const t = ac.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.02); }

    async function loadModule() {
        // Prefer embedded <script type="application/json" id="asd_coach_json"> if present
        const emb = document.getElementById('asd_coach_json');
        if (emb) { try { return JSON.parse(emb.textContent || '{}'); } catch { } }
        // Fallback to static JSON asset
        try {
            const r = await fetch('assets/autism_coach_module.json', { cache: 'no-store' });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return await r.json();
        } catch (e) { console.warn('Coach module load failed', e); return null; }
    }

    function renderStep(host, step) {
        const wrap = document.createElement('div');
        wrap.className = 'tile';
        const t = (step.title || '').trim();
        const h = document.createElement('h4'); h.textContent = t || (step.type || 'step'); h.style.margin = '.2rem 0';
        wrap.appendChild(h);

        const body = step.body || '';
        if (body) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = body; wrap.appendChild(p); }

        // Minimal interactive widgets by type
        switch (String(step.type || 'text')) {
            case 'text': {
                // nothing extra
                break;
            }
            case 'checklist': {
                const key = step.saveAs || (t ? ('check_' + t.toLowerCase().replace(/\W+/g, '_')) : 'check');
                const saved = getVal(key, []);
                const ul = document.createElement('ul');
                (step.items || []).forEach((label, idx) => {
                    const id = key + '_' + idx;
                    const li = document.createElement('li');
                    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = !!saved.includes(idx);
                    const lb = document.createElement('label'); lb.setAttribute('for', id); lb.textContent = ' ' + label;
                    cb.addEventListener('change', () => {
                        const now = getVal(key, []);
                        const set = new Set(now);
                        if (cb.checked) set.add(idx); else set.delete(idx);
                        saveVal(key, Array.from(set));
                    });
                    li.appendChild(cb); li.appendChild(lb); ul.appendChild(li);
                });
                wrap.appendChild(ul);
                break;
            }
            case 'multi-select': {
                const key = step.saveAs || (t ? ('pick_' + t.toLowerCase().replace(/\W+/g, '_')) : 'pick');
                const saved = new Set(getVal(key, []));
                const ul = document.createElement('ul');
                (step.options || []).forEach((opt, idx) => {
                    const id = key + '_' + idx;
                    const li = document.createElement('li');
                    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = saved.has(opt);
                    const lb = document.createElement('label'); lb.setAttribute('for', id); lb.textContent = ' ' + opt;
                    cb.addEventListener('change', () => {
                        const now = new Set(getVal(key, []));
                        if (cb.checked) now.add(opt); else now.delete(opt);
                        saveVal(key, Array.from(now));
                    });
                    li.appendChild(cb); li.appendChild(lb); ul.appendChild(li);
                });
                wrap.appendChild(ul);
                break;
            }
            case 'log': {
                const key = step.saveAs || (step.metric || 'log');
                const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = '1';
                input.value = String(getVal(key, 0));
                input.addEventListener('input', () => saveVal(key, parseInt(input.value || '0', 10) || 0));
                wrap.appendChild(input);
                break;
            }
            case 'timer': {
                const secs = parseInt(step.seconds || 60, 10) || 60;
                const out = document.createElement('div'); out.textContent = formatSecs(secs);
                const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '8px'; row.style.marginTop = '6px';
                const bStart = document.createElement('button'); bStart.className = 'btn'; bStart.type = 'button'; bStart.textContent = 'Start';
                const bStop = document.createElement('button'); bStop.className = 'btn'; bStop.type = 'button'; bStop.textContent = 'Stop'; bStop.disabled = true;
                row.appendChild(bStart); row.appendChild(bStop); wrap.appendChild(out); wrap.appendChild(row);
                let rem = secs, to = null;
                function tick() { out.textContent = formatSecs(rem); if (rem <= 0) { try { beep(520, 0.14); } catch { } clearInterval(to); to = null; bStart.disabled = false; bStop.disabled = true; return; } rem--; }
                bStart.addEventListener('click', () => { if (to) return; rem = secs; try { beep(640, 0.12); } catch { } tick(); to = setInterval(tick, 1000); bStart.disabled = true; bStop.disabled = false; });
                bStop.addEventListener('click', () => { if (!to) return; clearInterval(to); to = null; bStart.disabled = false; bStop.disabled = true; });
                break;
            }
            case 'abc': {
                const key = step.saveAs || 'abc.row';
                const saved = getVal(key, { A: '', B: '', C: '' });
                const grid = document.createElement('div'); grid.style.display = 'grid'; grid.style.gridTemplateColumns = '1fr'; grid.style.gap = '6px';
                [['A', 'Antecedent'], ['B', 'Behaviour'], ['C', 'Consequence']].forEach(([k, lbl]) => {
                    const lab = document.createElement('label'); lab.textContent = lbl;
                    const ta = document.createElement('textarea'); ta.rows = 2; ta.value = saved[k] || '';
                    ta.addEventListener('input', () => { const cur = getVal(key, { A: '', B: '', C: '' }); cur[k] = ta.value; saveVal(key, cur); });
                    grid.appendChild(lab); grid.appendChild(ta);
                });
                wrap.appendChild(grid);
                break;
            }
            default: {
                const p = document.createElement('p'); p.className = 'muted'; p.textContent = '(Preview not implemented for type: ' + step.type + ')'; wrap.appendChild(p);
            }
        }

        host.appendChild(wrap);
    }

    function formatSecs(s) { s = Math.max(0, s | 0); const m = (s / 60) | 0; const r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; }

    function renderFlow(viewEl, flow) {
        const title = $('#flowTitle', viewEl);
        const steps = $('#flowSteps', viewEl);
        if (title) title.textContent = flow.title || 'Flow';
        if (steps) { steps.innerHTML = ''; (flow.steps || []).forEach(st => renderStep(steps, st)); }
    }

    function stepKey(step) {
        const t = (step.title || '').trim().toLowerCase().replace(/\W+/g, '_');
        switch (String(step.type || 'text')) {
            case 'checklist': return step.saveAs || (t ? ('check_' + t) : 'check');
            case 'multi-select': return step.saveAs || (t ? ('pick_' + t) : 'pick');
            case 'log': return step.saveAs || (step.metric || 'log');
            case 'abc': return step.saveAs || 'abc.row';
            default: return step.saveAs || '';
        }
    }

    function collectFlowSnapshot(flow) {
        const out = { id: flow.id, title: flow.title, values: {} };
        (flow.steps || []).forEach(st => { const k = stepKey(st); if (!k) return; out.values[k] = getVal(k, null); });
        return out;
    }

    function ensureRunnerStyles() {
        if (document.getElementById('coach-run-css')) return;
        const s = document.createElement('style'); s.id = 'coach-run-css'; s.textContent = `
                #coach-run-overlay{position:fixed;inset:0;background:rgba(9,14,22,.84);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:none}
                #coach-run-overlay[open]{display:block}
                #coach-run-sheet{position:relative;max-width:min(900px,96vw);margin:6vh auto;background:#0f172a;color:#e5e7eb;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px}
                #coach-run-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
                #coach-run-title{font-weight:700}
                #coach-run-body{min-height:180px;margin-top:8px}
                #coach-run-foot{display:flex;justify-content:space-between;gap:8px;margin-top:10px}
                #coach-run-foot .btn{background:#10b981;color:#06251c;border:0;border-radius:8px;padding:8px 12px}
                #coach-run-foot .btn.secondary{background:transparent;color:#e5e7eb;border:1px solid rgba(255,255,255,.25)}
                #coach-run-tts{display:inline-flex;align-items:center;gap:6px;margin-left:8px}
                `; document.head.appendChild(s);
    }

    function openRunner(mod) {
        const flows = (mod && mod.flows) || [];
        if (!flows.length) { alert('No flows available.'); return; }
        ensureRunnerStyles();
        let idx = 0; // step index
        let pickIdx = 0; // flow index
        // Build overlay
        let ov = document.getElementById('coach-run-overlay');
        if (!ov) {
            ov = document.createElement('div'); ov.id = 'coach-run-overlay';
            ov.innerHTML = `
                        <div id="coach-run-sheet" role="dialog" aria-modal="true" aria-label="Run flow">
                            <div id="coach-run-head">
                                <button id="coach-run-close" class="btn secondary" type="button" aria-label="Close">Close</button>
                                <label style="display:inline-flex;gap:6px;align-items:center">Flow
                                    <select id="coach-run-pick" title="Pick a flow"></select>
                                </label>
                                <div id="coach-run-title" style="margin-left:auto"></div>
                                <label id="coach-run-tts" title="Narrate steps">
                                  <input id="coach-run-tts-toggle" type="checkbox" />
                                  <span>Narrate</span>
                                </label>
                            </div>
                            <div id="coach-run-body"></div>
                            <div id="coach-run-foot">
                                <div>
                                    <button id="coach-run-summary" class="btn secondary" type="button">Summary</button>
                                </div>
                                <div>
                                    <button id="coach-run-back" class="btn secondary" type="button">Back</button>
                                    <button id="coach-run-next" class="btn" type="button">Next</button>
                                    <button id="coach-run-done" class="btn" type="button" style="display:none">Done</button>
                                </div>
                            </div>
                        </div>`;
            document.body.appendChild(ov);
        }
        const pick = document.getElementById('coach-run-pick');
        const title = document.getElementById('coach-run-title');
        const body = document.getElementById('coach-run-body');
        const bClose = document.getElementById('coach-run-close');
        const bBack = document.getElementById('coach-run-back');
        const bNext = document.getElementById('coach-run-next');
        const bDone = document.getElementById('coach-run-done');
        const bSum = document.getElementById('coach-run-summary');
        const ttsToggle = document.getElementById('coach-run-tts-toggle');
        const TTS_KEY = 'mshare_coach_autism_tts';
        try { const on = localStorage.getItem(TTS_KEY) === 'true'; if (ttsToggle) { ttsToggle.checked = on; } } catch { }

        function mountPick() { pick.innerHTML = ''; flows.forEach((f, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = f.title || f.id || ('Flow ' + (i + 1)); pick.appendChild(o); }); pick.value = String(pickIdx); }
        function cleanSpeak(t) {
            if (!t) return '';
            let s = String(t).replace(/\s+/g, ' ').trim();
            s = s.replace(/https?:\/\/\S+/gi, '');
            s = s.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '');
            try { s = s.replace(/[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''); }
            catch { s = s.replace(/[\u2600-\u27BF]/g, ''); }
            s = s.replace(/[~`^_*#@<>{}\[\]|\\/+=]+/g, ' ');
            s = s.split(/\s+/).filter(tok => /[A-Za-z]/.test(tok)).join(' ');
            s = s.replace(/[.,!?;:]{2,}/g, m => m[m.length - 1]);
            s = s.replace(/\s{2,}/g, ' ').trim();
            return s;
        }

        async function speakChunks(text) {
            if (!('speechSynthesis' in window)) return;
            const synth = window.speechSynthesis;
            const cleaned = cleanSpeak(text);
            if (!cleaned) return;
            try { synth.resume(); } catch { }
            try { synth.cancel(); } catch { }
            const parts = (cleaned.match(/[^.!?;]+[.!?;]?/g) || [cleaned]).map(s => s.trim()).filter(Boolean);
            for (const part of parts) {
                await new Promise((resolve) => {
                    const u = new SpeechSynthesisUtterance(part);
                    let started = 0;
                    const done = () => { resolve(); };
                    u.onstart = () => { started = performance.now(); };
                    u.onerror = done;
                    u.onend = () => {
                        const dur = started ? (performance.now() - started) : 0;
                        if (dur < 200) {
                            // Retry once without explicit voice to dodge quick-end bug
                            try { synth.cancel(); } catch { }
                            const u2 = new SpeechSynthesisUtterance(part);
                            u2.onend = done; u2.onerror = done;
                            try { synth.resume(); } catch { }
                            try { synth.speak(u2); } catch { done(); }
                        } else {
                            done();
                        }
                    };
                    try { synth.speak(u); } catch { resolve(); }
                });
            }
        }

        function showStep() {
            const flow = flows[pickIdx]; if (!flow) return;
            const steps = flow.steps || []; idx = Math.min(Math.max(0, idx), Math.max(0, steps.length - 1));
            title.textContent = `${flow.title || 'Flow'} — ${idx + 1}/${steps.length}`;
            body.innerHTML = ''; renderStep(body, steps[idx]);
            bBack.disabled = (idx === 0); bNext.style.display = (idx < steps.length - 1) ? 'inline-flex' : 'none'; bDone.style.display = (idx === steps.length - 1) ? 'inline-flex' : 'none';
            // Narrate current step if enabled
            if (ttsToggle?.checked && window.speechSynthesis) {
                const st = steps[idx] || {};
                const txt = [st.title, st.body].filter(Boolean).join('. ');
                if (txt) speakChunks(txt);
            }
        }

        mountPick(); showStep();
        ov.setAttribute('open', '');

        bClose.onclick = () => { ov.removeAttribute('open'); };
        pick.onchange = () => { pickIdx = parseInt(pick.value || '0', 10) || 0; idx = 0; showStep(); };
        bBack.onclick = () => { if (idx > 0) { idx--; try { window.__SOUND_KIT__ && (window.dispatchEvent(new Event('keydown'))); } catch { } showStep(); } };
        bNext.onclick = () => { idx++; try { window.__SOUND_KIT__ && (window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))); } catch { } showStep(); };
        bDone.onclick = () => { ov.removeAttribute('open'); };
        bSum.onclick = () => {
            const snap = collectFlowSnapshot(flows[pickIdx]);
            const text = JSON.stringify(snap, null, 2);
            try { navigator.clipboard.writeText(text); alert('Summary copied to clipboard.'); }
            catch { alert(text); }
        };
        ttsToggle?.addEventListener('change', () => { try { localStorage.setItem(TTS_KEY, String(!!ttsToggle.checked)); } catch { } });
    }

    function wireUI(mod) {
        const btnPreview = document.getElementById('btnPreviewFlows');
        const btnClear = document.getElementById('btnClearPreview');
        const viewer = document.getElementById('flowViewer');
        const pick = document.getElementById('flowPick');

        if (!btnPreview || !btnClear || !viewer || !pick) return;

        // Add a Run button next to Preview
        let btnRun = document.getElementById('btnRunFlow');
        if (!btnRun) { btnRun = document.createElement('button'); btnRun.id = 'btnRunFlow'; btnRun.type = 'button'; btnRun.className = 'btn'; btnRun.textContent = 'Run flow'; const row = btnPreview.parentElement; if (row) row.insertBefore(btnRun, btnClear); }

        btnPreview.addEventListener('click', () => {
            const flows = (mod && mod.flows) || [];
            pick.innerHTML = '';
            flows.forEach((f, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = f.title || f.id || ('Flow ' + (i + 1)); pick.appendChild(o); });
            if (flows.length) { pick.value = '0'; renderFlow(viewer, flows[0]); }
        });

        btnRun.addEventListener('click', () => openRunner(mod));

        pick.addEventListener('change', () => {
            const flows = (mod && mod.flows) || []; const idx = parseInt(pick.value || '0', 10) || 0; if (flows[idx]) renderFlow(viewer, flows[idx]);
        });

        btnClear.addEventListener('click', () => {
            $('#flowTitle', viewer).textContent = 'Flow';
            $('#flowSteps', viewer).innerHTML = '';
            pick.innerHTML = '';
        });
    }

    function start() { loadModule().then(mod => { if (!mod) { console.warn('No module loaded'); return; } wireUI(mod); }); }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
