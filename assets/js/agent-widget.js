/* Lightweight no-code Agent widget for M Share
 - Floating chat-style panel with Move handle and keyboard arrows
 - Loads FAQs from /assets/data/agent-faq.json and/or localStorage
 - Simple keyword/Q&A matching with fallbacks
 - Setup panel lets owners edit JSON without coding (saved to localStorage)
*/
(function () {
    const ROOT_KEY = ""; box.appendChild(t);
        const p = document.createElement(""div"";
                    d.appendChild(p); d.appendChild(a);
                    sendRich(msgs, d, "");
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
