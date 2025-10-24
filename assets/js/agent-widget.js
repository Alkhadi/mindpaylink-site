/* Lightweight no-code Agent widget for M Share
 - Floating chat-style panel with Move handle and keyboard arrows
 - Loads FAQs from /assets/data/agent-faq.json and/or localStorage
 - Simple keyword/Q&A matching with fallbacks
 - Setup panel lets owners edit JSON without coding (saved to localStorage)
*/
(function () {
    const ROOT_KEY = 'mshare_agent_';
    const POS_KEY = ROOT_KEY + 'widget_pos_v1';
    const FAQ_KEY = ROOT_KEY + 'faq_custom_v1';
    const CFG_KEY = ROOT_KEY + 'config_v1';
    const CFG_REMOTE = 'assets/data/agent-config.json';
    const RES_REMOTE = 'assets/data/agent-resources.json';

    const BRAND = {
        blue: '#3EA9FF',
        slate: '#3A3B5F',
        ink: '#111111',
        panel: '#ffffff'
    };

    function qs(sel, ctx = document) { return ctx.querySelector(sel); }
    function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }
    function loadLS(k, d) { try { return JSON.parse(localStorage.getItem(k) || ''); } catch { return d; } }
    function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }

    const defaultCfg = {
        name: 'M Share Agent',
        greeting: 'Hi! Ask me about pricing, setup time, and how control works.',
        showContact: true,
        contactHref: 'mailto:info@mindpaylink.com',
        subscribeUrl: '',
        research: { ukRefs: true, preferAcUk: true, proxyUrl: '' }
    };

    const defaultFaq = [
        { q: ['price', 'pricing', 'cost'], a: 'Simple: we tailor a plan to your needs. Most small sites start free to try, then from £15/mo.' },
        { q: ['setup', 'how long', 'time'], a: 'It takes minutes. Paste your answers or upload a tiny JSON—no coding.' },
        { q: ['control', 'data', 'own'], a: 'You control the content. The agent runs in your site, with settings you can change anytime.' },
        { q: ['contact', 'email', 'phone', 'whatsapp'], a: 'You can add a Contact/WhatsApp button for quick handoff—just toggle it on.' }
    ];

    async function loadFaq() {
        // Custom first
        const custom = loadLS(FAQ_KEY, null);
        if (Array.isArray(custom) && custom.length) return custom;
        // Remote JSON (optional)
        try {
            const res = await fetch('assets/data/agent-faq.json', { cache: 'no-store' });
            if (res.ok) {
                const j = await res.json();
                if (Array.isArray(j) && j.length) return j;
            }
        } catch { }
        return defaultFaq;
    }

    async function loadConfig() {
        const saved = loadLS(CFG_KEY, {});
        let remote = null;
        try {
            const res = await fetch(CFG_REMOTE, { cache: 'no-store' });
            if (res.ok) remote = await res.json();
        } catch { }
        const base = Object.assign({}, defaultCfg, remote || {}, saved || {});
        // Deep-merge the nested research object to avoid losing fields
        const r = Object.assign({}, (defaultCfg.research || {}), (remote && remote.research) || {}, (saved && saved.research) || {});
        base.research = r;
        return base;
    }

    async function loadResources() {
        try {
            const res = await fetch(RES_REMOTE, { cache: 'no-store' });
            if (res.ok) return await res.json();
        } catch { }
        return { blogs: [], stories: [], videos: [], help: [] };
    }

    function matchAnswer(faq, input) {
        const text = (input || '').trim().toLowerCase();
        if (!text) return null;
        for (const item of faq) {
            const keys = Array.isArray(item.q) ? item.q : [String(item.q || '')];
            if (keys.some(k => k && text.includes(String(k).toLowerCase()))) return item.a;
        }
        return null;
    }

    function matchAnswers(faq, input) {
        const text = (input || '').trim().toLowerCase();
        if (!text) return [];
        const hits = [];
        faq.forEach(item => {
            const keys = Array.isArray(item.q) ? item.q : [String(item.q || '')];
            if (keys.some(k => k && text.includes(String(k).toLowerCase()))) hits.push(item);
        });
        return hits;
    }

    function detectWellbeing(text) {
        return /(breath|breathing|exhale|inhale|box|4-7-8|478|coherent|hrv|focus|mindful|adhd|autism|anxiety|stress|sleep)/i.test(text);
    }

    function businessGuardrail(msgs) {
        const box = document.createElement('div');
        const t = document.createElement('div'); t.style.fontWeight = '600'; t.textContent = 'I can help with your AI agent.'; box.appendChild(t);
        const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Try asking about pricing, setup time, control, or contact.'; box.appendChild(p);
        const chips = document.createElement('div'); chips.className = 'mpl-chips';
        ['price', 'setup', 'control', 'contact'].forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.addEventListener('click', () => { const f = document.querySelector('form.mpl-input'); const i = f && f.querySelector('input[name="q"]'); if (i) { i.value = k; f.dispatchEvent(new Event('submit', { cancelable: true })); } }); chips.appendChild(b); });
        box.appendChild(chips);
        sendRich(document.querySelector('.mpl-messages') || msgs, box, 'agent');
    }

    function draggable(el, handle) {
        const pos = loadLS(POS_KEY, { x: null, y: null });
        if (pos && pos.x !== null && pos.y !== null) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; }
        else { el.style.right = '16px'; el.style.bottom = '16px'; }

        let drag = null;
        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

        function onDown(e) {
            e.preventDefault();
            const r = el.getBoundingClientRect();
            const startX = ('clientX' in e) ? e.clientX : (e.touches?.[0]?.clientX || 0);
            const startY = ('clientY' in e) ? e.clientY : (e.touches?.[0]?.clientY || 0);
            drag = { dx: startX - r.left, dy: startY - r.top };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onUp);
        }
        function onMove(e) {
            if (!drag) return;
            const vw = window.innerWidth, vh = window.innerHeight;
            const x = ('clientX' in e) ? e.clientX : (e.touches?.[0]?.clientX || 0);
            const y = ('clientY' in e) ? e.clientY : (e.touches?.[0]?.clientY || 0);
            const w = el.offsetWidth, h = el.offsetHeight;
            const left = clamp(x - drag.dx, 8, vw - w - 8);
            const top = clamp(y - drag.dy, 8, vh - h - 8);
            el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
        }
        function onUp() {
            if (!drag) return;
            drag = null;
            saveLS(POS_KEY, { x: el.offsetLeft, y: el.offsetTop });
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
        }

        handle.addEventListener('mousedown', onDown);
        handle.addEventListener('touchstart', onDown, { passive: false });

        // Keyboard nudge
        handle.addEventListener('keydown', (e) => {
            const step = e.shiftKey ? 10 : 1;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const vw = window.innerWidth, vh = window.innerHeight;
                const w = el.offsetWidth, h = el.offsetHeight;
                let left = el.offsetLeft, top = el.offsetTop;
                if (e.key === 'ArrowUp') top -= step;
                if (e.key === 'ArrowDown') top += step;
                if (e.key === 'ArrowLeft') left -= step;
                if (e.key === 'ArrowRight') left += step;
                left = Math.max(8, Math.min(vw - w - 8, left));
                top = Math.max(8, Math.min(vh - h - 8, top));
                el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
                saveLS(POS_KEY, { x: left, y: top });
            }
        });
    }

    function createWidget() {
        const host = document.createElement('div');
        host.className = 'mpl-agent';
        host.innerHTML = `
      <div class="mpl-agent-inner" role="dialog" aria-label="AI Agent">
        <div class="mpl-agent-head">
          <button class="mpl-move" type="button" aria-label="Move" title="Move" tabindex="0">⠿</button>
          <div class="mpl-title"></div>
          <div class="mpl-actions">
            <button class="mpl-setup" type="button" title="Setup" aria-label="Setup">⚙</button>
            <button class="mpl-close" type="button" title="Close" aria-label="Close">×</button>
          </div>
        </div>
        <div class="mpl-agent-body">
          <div class="mpl-messages" aria-live="polite"></div>
          <form class="mpl-input" autocomplete="off">
            <input name="q" type="text" placeholder="Ask a question…" aria-label="Ask a question" />
            <button type="submit">Send</button>
          </form>
                    <div class="mpl-setup-panel" hidden>
            <p><b>Settings</b></p>
            <div class="mpl-settings">
              <label>Contact link <input name="contactHref" type="url" placeholder="mailto:info@mindpaylink.com"></label>
              <label>Subscribe form URL <input name="subscribeUrl" type="url" placeholder="https://forms.gle/..." ></label>
                            <label><input name="researchUK" type="checkbox"> Show UK academic/official sources for general questions</label>
            </div>
            <p><b>Answers (JSON)</b></p>
            <textarea aria-label="Agent Answers JSON" spellcheck="false"></textarea>
            <div class="mpl-setup-actions">
              <button data-act="save" type="button">Save</button>
              <button data-act="reset" type="button">Reset</button>
              <button data-act="export" type="button">Export</button>
              <label class="mpl-upload">Import <input type="file" accept="application/json" hidden></label>
            </div>
            <p class="muted">Tip: each item is { q: [keywords…], a: "answer" }.</p>
          </div>
        </div>
      </div>`;
        document.body.appendChild(host);
        return host;
    }

    function sendMessage(list, text, who) {
        const item = document.createElement('div');
        item.className = 'mpl-msg ' + (who || 'agent');
        item.innerHTML = '<div class="bubble"></div>';
        item.querySelector('.bubble').textContent = text;
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
    }

    function sendRich(list, node, who) {
        const item = document.createElement('div');
        item.className = 'mpl-msg ' + (who || 'agent');
        const b = document.createElement('div'); b.className = 'bubble'; b.appendChild(node);
        item.appendChild(b);
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
    }

    function listItems(title, items) {
        const wrap = document.createElement('div');
        const h = document.createElement('div'); h.className = 'mpl-list-title'; h.textContent = title; wrap.appendChild(h);
        const ul = document.createElement('ul'); ul.className = 'mpl-list';
        items.forEach(it => {
            const li = document.createElement('li');
            const a = document.createElement('a'); a.href = it.url; a.textContent = it.title || it.url; a.rel = 'noopener'; a.target = '_blank';
            li.appendChild(a);
            if (it.date) { const small = document.createElement('small'); small.textContent = ' ' + it.date; li.appendChild(small); }
            ul.appendChild(li);
        });
        wrap.appendChild(ul);
        return wrap;
    }

    function slugify(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    function scrapeStoriesFromPage() {
        const wrap = document.getElementById('success-stories');
        const out = [];
        if (!wrap) return out;
        const cards = Array.from(wrap.querySelectorAll('.story'));
        cards.forEach((c) => {
            const name = (c.querySelector('h3')?.textContent || '').trim();
            const summary = (c.querySelector('p')?.textContent || '').trim();
            if (!name || !summary) return;
            out.push({ id: slugify(name), title: name, summary });
        });
        return out;
    }

    function stringify(obj) { try { return JSON.stringify(obj, null, 2); } catch { return '[]'; } }

    // --- Lightweight research helpers (client-side, no keys) ---
    async function fetchJSON(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }
    async function wikiSummary(q) {
        const query = encodeURIComponent(q.trim());
        // Direct summary; if 404, fall back to search->first hit
        const direct = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`;
        try {
            const d = await fetchJSON(direct);
            if (d && d.extract) return { title: d.title, extract: d.extract, url: d.content_urls?.desktop?.page || d.content_urls?.mobile?.page || ('https://en.wikipedia.org/wiki/' + d.title.replace(/\s+/g, '_')) };
        } catch { }
        try {
            const sr = await fetchJSON(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&origin=*`);
            const t = sr?.query?.search?.[0]?.title;
            if (!t) return null;
            const sum = await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`);
            if (sum && sum.extract) return { title: sum.title, extract: sum.extract, url: sum.content_urls?.desktop?.page || sum.content_urls?.mobile?.page || ('https://en.wikipedia.org/wiki/' + sum.title.replace(/\s+/g, '_')) };
        } catch { }
        return null;
    }
    async function crossrefTop(q) {
        try {
            const url = `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=3&sort=is-referenced-by-count&order=desc&filter=type:journal-article`;
            const data = await fetchJSON(url);
            const items = (data && data.message && data.message.items) || [];
            return items.map(it => {
                const title = Array.isArray(it.title) ? it.title[0] : (it.title || '');
                const year = (it.issued && it.issued['date-parts'] && it.issued['date-parts'][0] && it.issued['date-parts'][0][0]) || '';
                const doi = it.DOI || '';
                const link = doi ? `https://doi.org/${doi}` : (it.URL || '');
                return { title, url: link, date: year };
            });
        } catch { return []; }
    }
    async function europePMCTop(q) {
        try {
            const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=3`;
            const data = await fetchJSON(url);
            const items = (data && data.resultList && data.resultList.result) || [];
            return items.map(it => {
                const title = it.title || '';
                const year = it.pubYear || '';
                const pmcid = it.pmcid || '';
                const doi = it.doi || '';
                const u = pmcid ? `https://europepmc.org/article/pmc/${pmcid}` : (doi ? `https://doi.org/${doi}` : '')
                return { title, url: u, date: year, pmcid };
            });
        } catch { return []; }
    }
    async function europePMCAbstract(pmcid) {
        if (!pmcid) return null;
        try {
            const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:${encodeURIComponent(pmcid)}&format=json&resultType=core&pageSize=1`;
            const data = await fetchJSON(url);
            const r = data?.resultList?.result?.[0];
            if (r && r.abstractText) {
                const link = r.fullTextUrlList && r.fullTextUrlList.fullTextUrl && r.fullTextUrlList.fullTextUrl[0] && r.fullTextUrlList.fullTextUrl[0].url;
                return { title: r.title || pmcid, extract: r.abstractText, url: link || `https://europepmc.org/article/pmc/${pmcid}` };
            }
        } catch { }
        return null;
    }
    function buildAnswerPanel(summary, refs, query, preferAcUk) {
        const wrap = document.createElement('div');
        if (summary) {
            const h = document.createElement('div'); h.style.fontWeight = '600'; h.textContent = summary.title || 'Answer'; wrap.appendChild(h);
            const p = document.createElement('p'); p.textContent = summary.extract; wrap.appendChild(p);
            if (summary.url) { const a = document.createElement('a'); a.href = summary.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Source: Wikipedia'; wrap.appendChild(a); }
        } else {
            const p = document.createElement('p'); p.textContent = 'Here are credible sources to explore:'; wrap.appendChild(p);
        }
        const combined = (refs || []).filter(r => r && r.title && r.url);
        if (combined.length) {
            const ul = document.createElement('ul'); ul.className = 'mpl-list';
            combined.forEach(r => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = r.title + (r.date ? (' (' + r.date + ')') : ''); li.appendChild(a); ul.appendChild(li); });
            wrap.appendChild(ul);
        }
        // Academic quick searches
        const enc = encodeURIComponent(query || '');
        const ul2 = document.createElement('ul'); ul2.className = 'mpl-list';
        const links = [];
        if (preferAcUk) links.push({ t: '.ac.uk academic search', u: 'https://duckduckgo.com/?q=site%3Aac.uk+' + enc });
        links.push({ t: 'PubMed (abstracts)', u: 'https://pubmed.ncbi.nlm.nih.gov/?term=' + enc });
        links.push({ t: 'Oxford Academic search', u: 'https://academic.oup.com/search-results?q=' + enc });
        links.forEach(l => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = l.u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = l.t; li.appendChild(a); ul2.appendChild(li); });
        wrap.appendChild(ul2);
        return wrap;
    }

    const Agent = {
        async mount(where) {
            const mountEl = typeof where === 'string' ? qs(where) : where;
            const cfg = await loadConfig();
            const widget = createWidget();
            const inner = qs('.mpl-agent-inner', widget);
            const title = qs('.mpl-title', widget);
            const btnMove = qs('.mpl-move', widget);
            const btnClose = qs('.mpl-close', widget);
            const btnSetup = qs('.mpl-setup', widget);
            const setupPanel = qs('.mpl-setup-panel', widget);
            const setupTA = qs('textarea', setupPanel);
            const setupContact = qs('input[name="contactHref"]', setupPanel);
            const setupSubscribe = qs('input[name="subscribeUrl"]', setupPanel);
            const setupResearchUK = qs('input[name="researchUK"]', setupPanel);
            const msgs = qs('.mpl-messages', widget);
            const form = qs('form.mpl-input', widget);
            const input = qs('input[name="q"]', widget);
            const upInput = qs('input[type="file"]', setupPanel);

            title.textContent = cfg.name;
            draggable(widget, btnMove);

            let faq = [];
            let resources = { blogs: [], stories: [], videos: [], help: [] };
            (async () => {
                faq = await loadFaq();
                resources = await loadResources();
                // Augment stories from this page if present
                try {
                    const pageStories = scrapeStoriesFromPage();
                    if (Array.isArray(pageStories) && pageStories.length) {
                        // Normalize to {title, url?, date?, summary?}
                        const merged = (resources.stories || []).slice();
                        pageStories.forEach(ps => {
                            if (!merged.some(m => (m.title || '').trim() === (ps.title || '').trim())) merged.push(ps);
                        });
                        resources.stories = merged;
                    }
                } catch { }
                setupTA.value = stringify(loadLS(FAQ_KEY, faq));
                setupContact.value = cfg.contactHref || '';
                setupSubscribe.value = cfg.subscribeUrl || '';
                if (setupResearchUK) setupResearchUK.checked = !!(cfg.research && cfg.research.ukRefs);
                // Greeting
                sendMessage(msgs, cfg.greeting, 'agent');
                // also render quick chips
                const chipWrap = document.createElement('div'); chipWrap.className = 'mpl-chips';
                (faq.slice(0, 4)).forEach(item => {
                    const k = Array.isArray(item.q) ? item.q[0] : (item.q || '');
                    if (!k) return; const b = document.createElement('button'); b.type = 'button'; b.textContent = k;
                    b.addEventListener('click', () => { input.value = k; form.dispatchEvent(new Event('submit', { cancelable: true })); });
                    chipWrap.appendChild(b);
                });
                msgs.appendChild(chipWrap);
            })();

            function toggleSetup() { const s = setupPanel.hasAttribute('hidden'); setupPanel.toggleAttribute('hidden', !s); }

            btnClose.addEventListener('click', () => { widget.remove(); });
            btnSetup.addEventListener('click', toggleSetup);

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = (input.value || '').trim();
                if (!text) return; input.value = '';
                sendMessage(msgs, text, 'user');
                const lower = text.toLowerCase();
                window.__MPL_LAST_Q = text;
                // Business intents (price/setup/control/contact) — handle first, even if mixed with other text
                const hits = matchAnswers(faq, text);
                if (hits.length > 1) {
                    const box = document.createElement('div');
                    hits.slice(0, 4).forEach(h => { const s = document.createElement('p'); s.innerHTML = '<b>' + (Array.isArray(h.q) ? h.q[0] : h.q) + ':</b> ' + h.a; box.appendChild(s); });
                    sendRich(msgs, box, 'agent');
                    postContact();
                    return;
                }
                if (hits.length === 1) { sendMessage(msgs, hits[0].a, 'agent'); postContact(); return; }
                // Paraphrasing intent
                if (/(paraphrase|rephrase|rewrite|reword|summari[sz]e|spin)/i.test(lower)) {
                    const d = document.createElement('div');
                    const p = document.createElement('p'); p.textContent = 'You can rewrite or paraphrase your text with our on-page assistant:';
                    const a = document.createElement('a'); a.className = 'btn'; a.textContent = 'Open Rewrite Assistant';
                    a.href = 'rewrite-assistant.html?t=' + encodeURIComponent(text.slice(0, 4000)); a.rel = 'noopener';
                    d.appendChild(p); d.appendChild(a);
                    sendRich(msgs, d, 'agent');
                    postContact();
                    return;
                }
                // Resource intents
                if (/(^|\b)(blog|blogs)(\b|$)/.test(lower)) {
                    const items = (resources.blogs || []).slice(0, 5);
                    if (items.length) sendRich(msgs, listItems('Latest blogs', items), 'agent');
                    else sendMessage(msgs, 'No blogs yet. Ask about setup or control.', 'agent');
                    return;
                }
                if (/(^|\b)(story|stories|case study|case studies|customer|customers|testimonial|testimonials|results|impact|value)(\b|$)/.test(lower)) {
                    // If a specific name appears, tell that story; else list a few
                    const sts = (resources.stories || []);
                    const byName = sts.find(s => {
                        if (!s.title) return false;
                        const name = String(s.title).toLowerCase();
                        const tokens = name.split(/[^a-z0-9]+/).filter(Boolean).slice(0, 2); // first 1-2 tokens
                        return tokens.some(t => lower.includes(t));
                    });
                    if (byName && byName.summary) {
                        sendMessage(msgs, byName.title + ': ' + byName.summary, 'agent');
                    } else if (sts.length) {
                        const list = sts.slice(0, 8).map(s => ({ title: s.title, url: s.url || 'aims-objectives.html#success-stories' }));
                        sendRich(msgs, listItems('Customer stories', list), 'agent');
                    } else {
                        sendMessage(msgs, 'No stories yet. Ask about pricing or setup.', 'agent');
                    }
                    return;
                }
                if (/(^|\b)(video|videos)(\b|$)/.test(lower)) {
                    const items = (resources.videos || []).slice(0, 5);
                    if (items.length) sendRich(msgs, listItems('Videos', items), 'agent');
                    else sendMessage(msgs, 'No videos yet. Ask about how it works.', 'agent');
                    return;
                }
                if (/(^|\b)(help|article|docs|documentation)(\b|$)/.test(lower)) {
                    const items = (resources.help || []).slice(0, 5);
                    if (items.length) sendRich(msgs, listItems('Help articles', items), 'agent');
                    else sendMessage(msgs, 'No help articles yet. Try asking about setup time.', 'agent');
                    return;
                }
                if (/(subscribe|newsletter|updates)/.test(lower)) {
                    if (cfg.subscribeUrl) {
                        const a = document.createElement('a'); a.href = cfg.subscribeUrl; a.target = '_blank'; a.rel = 'noopener'; a.className = 'btn'; a.textContent = 'Subscribe here';
                        const d = document.createElement('div'); d.appendChild(a);
                        sendRich(msgs, d, 'agent');
                    } else {
                        sendMessage(msgs, 'You can subscribe via email—type “subscribe me” and we’ll open your mail app.', 'agent');
                    }
                    return;
                }
                // General knowledge detection -> UK credible sources panel (only if no business hits)
                const domainKeywords = /(breath|breathing|exhale|inhale|box|4-7-8|478|coherent|hrv|focus|mindful|adhd|autism|anxiety|stress|sleep|m\s?-?share|agent|story|stories|blog|video|help|tools?|paraphrase|rephrase|rewrite|reword|summari[sz]e)/i;
                const looksQuestion = /\?|^(what|who|why|how|where|when)\b/i.test(text);
                const looksGeneral = looksQuestion && !domainKeywords.test(text);
                if (looksGeneral && cfg.research && cfg.research.ukRefs) {
                    (async () => {
                        try {
                            const [sum, a, b] = await Promise.all([
                                wikiSummary(text),
                                crossrefTop(text),
                                europePMCTop(text)
                            ]);
                            // Prefer scholarly abstract if available
                            let summary = sum;
                            const withPmc = (b || []).find(x => x.pmcid);
                            if (!summary && withPmc) {
                                const abs = await europePMCAbstract(withPmc.pmcid);
                                if (abs) summary = abs;
                            }
                            // Optional worker proxy enrichments
                            let extra = [];
                            if (cfg.research && cfg.research.proxyUrl) {
                                try {
                                    const base = cfg.research.proxyUrl.replace(/\/$/, '');
                                    const axRes = await fetch(base + '/arxiv?q=' + encodeURIComponent(text));
                                    const s2Res = await fetch(base + '/s2?q=' + encodeURIComponent(text));
                                    const ax = axRes.ok ? await axRes.json() : [];
                                    const s2 = s2Res.ok ? await s2Res.json() : [];
                                    extra = [...(ax || []), ...(s2 || [])].map(it => ({ title: it.title, url: it.url, date: it.date || it.year }));
                                } catch { }
                            }
                            const refs = [...(a || []), ...(b || []), ...extra].filter(Boolean).slice(0, 8);
                            const node = buildAnswerPanel(summary, refs, text, !!(cfg.research && cfg.research.preferAcUk));
                            sendRich(msgs, node, 'agent');
                        } catch {
                            const node = buildCredibleSourcesPanel(text);
                            sendRich(msgs, node, 'agent');
                        }
                        postContact();
                    })();
                    return;
                }

                // No business/general match: route to wellbeing only if the text clearly mentions wellbeing topics
                if (detectWellbeing(lower)) { fallbackPractical(msgs, lower); postContact(); return; }
                businessGuardrail(msgs); postContact();
            });

            function postContact() {
                if (cfg.showContact && cfg.contactHref) {
                    const cta = document.createElement('div'); cta.className = 'mpl-cta';
                    const aEl = document.createElement('a'); aEl.href = cfg.contactHref; aEl.textContent = 'Contact us'; aEl.className = 'btn'; aEl.rel = 'noopener'; cta.appendChild(aEl);
                    msgs.appendChild(cta); msgs.scrollTop = msgs.scrollHeight;
                }
            }

            setupPanel.addEventListener('click', (e) => {
                const act = (e.target && e.target.getAttribute && e.target.getAttribute('data-act')) || '';
                if (act === 'save') {
                    try {
                        const j = JSON.parse(setupTA.value || '[]'); if (Array.isArray(j)) { faq = j; saveLS(FAQ_KEY, faq); }
                        const newCfg = Object.assign({}, cfg, { contactHref: setupContact.value || cfg.contactHref, subscribeUrl: setupSubscribe.value || cfg.subscribeUrl, research: { ukRefs: !!(setupResearchUK && setupResearchUK.checked) } });
                        saveLS(CFG_KEY, newCfg);
                        alert('Saved.');
                    }
                    catch { alert('Invalid JSON'); }
                }
                if (act === 'reset') {
                    faq = defaultFaq.slice(); setupTA.value = stringify(faq); saveLS(FAQ_KEY, faq); alert('Reset to defaults.');
                }
                if (act === 'export') {
                    const blob = new Blob([setupTA.value], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'agent-faq.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
                }
            });
            upInput.addEventListener('change', async () => {
                const f = upInput.files && upInput.files[0]; if (!f) return;
                try { const txt = await f.text(); const j = JSON.parse(txt); if (Array.isArray(j)) { faq = j; setupTA.value = stringify(j); saveLS(FAQ_KEY, faq); alert('Imported.'); } }
                catch { alert('Invalid file'); }
            });

            // If a mount container is provided, place a launcher button
            if (mountEl) {
                const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = 'Open Agent';
                btn.addEventListener('click', () => { widget.style.display = ''; input.focus(); });
                mountEl.appendChild(btn);
                // start hidden until clicked
                widget.style.display = 'none';
            }

            // a11y: focus outlines
            qsa('button, input', widget).forEach(el => { el.addEventListener('focus', () => { widget.classList.add('kbd'); }); el.addEventListener('blur', () => { widget.classList.remove('kbd'); }); });

            return widget;
        },

        openSubscribe(email) {
            const cfg = Object.assign({}, defaultCfg, loadLS(CFG_KEY, {}));
            if (cfg.subscribeUrl) { window.open(cfg.subscribeUrl, '_blank', 'noopener'); return; }
            const to = (cfg.contactHref || '').startsWith('mailto:') ? cfg.contactHref.replace('mailto:', '') : 'info@mindpaylink.com';
            const subject = encodeURIComponent('Subscribe me');
            const body = encodeURIComponent((email ? ('Email: ' + email + '\n') : '') + 'Please add me to updates for the AI Agent.');
            const href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
            location.href = href;
        }
    };

    const MS = window.__MSHARE__ = window.__MSHARE__ || {};
    MS.Agent = Agent;

    // --- Credible sources panel (UK-first, academic/official) ---
    function buildCredibleSourcesPanel(q) {
        const query = String(q || '').trim();
        const enc = encodeURIComponent(query);
        const wrap = document.createElement('div');
        const h = document.createElement('div'); h.style.fontWeight = '600'; h.textContent = 'References (UK-grade)'; wrap.appendChild(h);
        const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Use these credible references and search portals for reliable information:'; wrap.appendChild(p);
        const ul = document.createElement('ul'); ul.className = 'mpl-list';
        const links = [
            { t: 'NHS search', u: 'https://www.nhs.uk/search/?q=' + enc },
            { t: 'NICE guidance search', u: 'https://www.nice.org.uk/search?q=' + enc },
            { t: 'GOV.UK search', u: 'https://www.gov.uk/search/all?keywords=' + enc },
            { t: 'Mind (UK charity) search', u: 'https://www.mind.org.uk/search/?q=' + enc },
            { t: '.ac.uk academic search (DuckDuckGo)', u: 'https://duckduckgo.com/?q=site%3Aac.uk+' + enc },
            { t: 'Oxford Academic search', u: 'https://academic.oup.com/search-results?q=' + enc },
            { t: 'PubMed (abstracts)', u: 'https://pubmed.ncbi.nlm.nih.gov/?term=' + enc }
        ];
        links.forEach(l => { const li = document.createElement('li'); const a = document.createElement('a'); a.href = l.u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = l.t; li.appendChild(a); ul.appendChild(li); });
        wrap.appendChild(ul);
        const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'Tip: Prefer UK sources (NHS, NICE, GOV.UK) and university domains (.ac.uk) for assignments.'; wrap.appendChild(note);
        return wrap;
    }

    // Practical fallback focused on wellbeing queries
    function fallbackPractical(msgs, lower) {
        const box = document.createElement('div');
        const title = document.createElement('div'); title.style.fontWeight = '600'; title.textContent = 'Here’s a quick, practical take:';
        const ul = document.createElement('ul'); ul.style.margin = '6px 0';
        const bullets = [];
        // Simple keyword routing to internal resources
        const links = [];
        if (/4-7-8|478|sleep/.test(lower)) links.push({ t: '4‑7‑8 Breathing', h: '4-7-8-breathing.html' });
        if (/box|square|calm/.test(lower)) links.push({ t: 'Box Breathing', h: 'box-breathing.html' });
        if (/coherent|hrv|5-5/.test(lower)) links.push({ t: 'Coherent 5‑5', h: 'coherent-5-5.html' });
        if (/focus|attention|study/.test(lower)) links.push({ t: 'Focus Guide', h: 'focus.html' });
        if (/mindful|anxiety|calm/.test(lower)) links.push({ t: 'Mindfulness', h: 'mindfulness.html' });
        if (/adhd/.test(lower)) links.push({ t: 'ADHD Tools', h: 'adhd-tools.html' });
        if (/autism/.test(lower)) links.push({ t: 'Autism Tools', h: 'autism-tools.html' });
        if (/stress/.test(lower)) links.push({ t: 'Stress Tools', h: 'stress-tools.html' });
        if (/sleep/.test(lower)) links.push({ t: 'Sleep Tools', h: 'sleep-tools.html' });
        bullets.push('Start small: 2–3 minutes of paced breathing, then reflect for 10 seconds.');
        bullets.push('Repeat daily at the same time to build habit memory.');
        bullets.push('If anxious, prioritise longer exhales (e.g., 4‑in / 6‑out).');
        bullets.push('Note what helped; keep the best 1–2 practices and repeat.');
        bullets.forEach(b => { const li = document.createElement('li'); li.textContent = b; ul.appendChild(li); });
        box.appendChild(title); box.appendChild(ul);
        if (links.length) {
            const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Helpful links:';
            const l = document.createElement('p');
            links.slice(0, 4).forEach((ln) => { const a = document.createElement('a'); a.href = ln.h; a.textContent = ln.t; a.style.marginRight = '8px'; l.appendChild(a); });
            box.appendChild(p); box.appendChild(l);
        }
        const small = document.createElement('div'); small.className = 'muted'; small.textContent = 'Educational only — not medical advice.'; small.style.marginTop = '4px'; box.appendChild(small);
        sendRich(document.querySelector('.mpl-messages') || msgs, box, 'agent');
    }
})();
