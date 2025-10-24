// Cloudflare Worker: Research proxy for arXiv (public) and Semantic Scholar (optional API key)
// Routes
// - GET /research?ping=1 -> { ok: true }
// - GET /research/arxiv?q=... -> [{ title, url, date }]
// - GET /research/s2?q=... -> [{ title, url, year }]
// Env vars
// - ALLOWED_ORIGINS: optional comma-separated allow-list
// - SEMANTIC_SCHOLAR_API_KEY: optional; if missing, /s2 returns 501

function corsHeaders(origin) {
    return { 'Access-Control-Allow-Origin': origin || '*', 'Vary': 'Origin', 'content-type': 'application/json' };
}
function allowHeaders(origin) {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin || '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' } });
}
function isOriginAllowed(origin, list) {
    if (!origin) return true;
    if (!list) return true;
    const allowed = String(list).split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.length) return true;
    return allowed.includes(origin);
}

async function arxivQuery(q) {
    const u = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=5&sortBy=relevance&sortOrder=descending`;
    const res = await fetch(u, { headers: { 'Accept': 'application/atom+xml' } });
    if (!res.ok) throw new Error('arXiv ' + res.status);
    const xml = await res.text();
    // Quick-and-dirty parse: extract first few <entry><title>, <id>, <published>
    const entries = [];
    const re = /<entry>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<id>([\s\S]*?)<\/id>[\s\S]*?<published>([\s\S]*?)<\/published>[\s\S]*?<\/entry>/g;
    let m; let count = 0;
    while ((m = re.exec(xml)) && count < 5) {
        const title = m[1].replace(/\s+/g, ' ').trim();
        const url = m[2].trim();
        const date = (m[3] || '').slice(0, 10);
        if (title && url) entries.push({ title, url, date });
        count++;
    }
    return entries;
}

async function s2Query(q, key) {
    if (!key) return { status: 501, body: JSON.stringify({ ok: false, error: 'Semantic Scholar key not configured' }) };
    const u = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&fields=title,year,url,openAccessPdf&limit=5`;
    const res = await fetch(u, { headers: { 'x-api-key': key } });
    if (!res.ok) return { status: 502, body: JSON.stringify({ ok: false, error: 'S2 ' + res.status }) };
    const j = await res.json();
    const items = (j && j.data) || [];
    const out = items.map(it => ({ title: it.title, url: (it.openAccessPdf && it.openAccessPdf.url) || it.url || '', year: it.year || '' })).filter(x => x.title && x.url);
    return { status: 200, body: JSON.stringify(out) };
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get('origin') || '*';
        if (request.method === 'OPTIONS') return allowHeaders(origin);
        if (!isOriginAllowed(origin, env.ALLOWED_ORIGINS)) return new Response('Origin not allowed', { status: 403, headers: corsHeaders(origin) });

        if (/\/research\/?$/.test(url.pathname) && url.searchParams.get('ping')) {
            return new Response(JSON.stringify({ ok: true, pong: Date.now() }), { headers: corsHeaders(origin) });
        }

        if (/\/research\/arxiv$/.test(url.pathname)) {
            const q = url.searchParams.get('q') || '';
            if (!q) return new Response(JSON.stringify([]), { headers: corsHeaders(origin) });
            try { const arr = await arxivQuery(q); return new Response(JSON.stringify(arr), { headers: corsHeaders(origin) }); }
            catch (e) { return new Response(JSON.stringify([]), { headers: corsHeaders(origin) }); }
        }

        if (/\/research\/s2$/.test(url.pathname)) {
            const q = url.searchParams.get('q') || '';
            const key = env.SEMANTIC_SCHOLAR_API_KEY || '';
            if (!q) return new Response(JSON.stringify([]), { headers: corsHeaders(origin) });
            const r = await s2Query(q, key);
            return new Response(r.body, { status: r.status, headers: corsHeaders(origin) });
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders(origin) });
    }
}
