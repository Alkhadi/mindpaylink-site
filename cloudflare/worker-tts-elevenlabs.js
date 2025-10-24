// Cloudflare Worker: ElevenLabs TTS proxy (mp3/ogg/wav) with CORS
// Purpose: Keep API keys server-side and stream back audio for the site voicebot
// Env vars required:
// - ELEVENLABS_API_KEY (required)
// - ELEVENLABS_VOICE_ID (optional; defaults to "21m00Tcm4TlvDq8ikWAM" if unset)
// - ALLOWED_ORIGINS (optional; comma-separated list; defaults to *)
//
// Usage
// - GET  /tts?ping=1 -> { ok: true }
// - POST /tts?format=mp3&voice=<id>
//     { text: "Hello world", model: "eleven_multilingual_v2" }
//   Returns audio/* body (mp3/ogg/wav) with CORS

function corsHeaders(origin, type = 'json') {
    const base = {
        'Access-Control-Allow-Origin': origin || '*',
        'Vary': 'Origin'
    };
    if (type === 'json') base['content-type'] = 'application/json';
    return base;
}

function allowHeaders(origin) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin'
        }
    });
}

function isOriginAllowed(origin, list) {
    if (!origin) return true;
    if (!list) return true; // allow all if unset
    const allowed = String(list)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (!allowed.length) return true;
    return allowed.includes(origin);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, '');
        const origin = request.headers.get('origin') || '*';
        if (request.method === 'OPTIONS') return allowHeaders(origin);

        // simple router
        if (!/\/tts$/i.test(path)) {
            return new Response('Not Found', { status: 404, headers: corsHeaders(origin) });
        }

        if (url.searchParams.get('ping')) {
            return new Response(JSON.stringify({ ok: true, pong: Date.now() }), { headers: corsHeaders(origin) });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
        }

        // Optional origin allow-list
        if (!isOriginAllowed(origin, env.ALLOWED_ORIGINS)) {
            return new Response('Origin not allowed', { status: 403, headers: corsHeaders(origin) });
        }

        const apiKey = env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return new Response('Server not configured: ELEVENLABS_API_KEY missing', { status: 500, headers: corsHeaders(origin) });
        }

        const fmt = (url.searchParams.get('format') || 'mp3').toLowerCase();
        const contentType = fmt === 'ogg' ? 'audio/ogg' : (fmt === 'wav' ? 'audio/wav' : 'audio/mpeg');
        const voice = url.searchParams.get('voice') || env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

        let payload;
        try { payload = await request.json(); } catch { payload = null; }
        const text = payload && typeof payload.text === 'string' ? payload.text.trim() : '';
        const model = (payload && payload.model) || 'eleven_multilingual_v2';
        if (!text) {
            return new Response(JSON.stringify({ ok: false, error: 'Missing text' }), { status: 400, headers: corsHeaders(origin) });
        }

        const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?optimize_streaming_latency=0&output_format=${encodeURIComponent(fmt)}`;
        const body = JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } });

        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': contentType
                },
                body
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => String(res.status));
                return new Response(JSON.stringify({ ok: false, status: res.status, error: msg }), { status: 502, headers: corsHeaders(origin) });
            }
            const audio = await res.arrayBuffer();
            return new Response(audio, { status: 200, headers: Object.assign(corsHeaders(origin, 'audio'), { 'Content-Type': contentType }) });
        } catch (err) {
            return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), { status: 500, headers: corsHeaders(origin) });
        }
    }
}
