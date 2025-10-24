// Cloudflare Worker: Twilio Voice/WebRTC Access Token issuer (JWT) with CORS
// Purpose: Issue short-lived Twilio capability tokens to the browser without exposing secrets
// Env vars required:
// - TWILIO_ACCOUNT_SID (ACxxxxxxxx)
// - TWILIO_API_KEY_SID (SKxxxxxxxx)
// - TWILIO_API_KEY_SECRET (secret)
// - TWILIO_APP_SID (APxxxxxxxx TwiML App SID for Voice) – optional but recommended
// - ALLOWED_ORIGINS (optional; comma-separated allow-list; defaults to *)
// - AUTH_TOKEN (optional; bearer token required if set)
//
// Routes
// - GET  /token?ping=1 -> { ok: true }
// - POST /token  { identity?, ttl?, allowIncoming?, params?, region? } -> { token, identity, expires, issuedAt }

function corsHeaders(origin, type = 'json') {
    const base = { 'Access-Control-Allow-Origin': origin || '*', 'Vary': 'Origin' };
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
    if (!list) return true;
    const allowed = String(list).split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.length) return true;
    return allowed.includes(origin);
}

function b64url(buf) {
    const b64 = typeof buf === 'string' ? btoa(buf) : btoa(String.fromCharCode(...new Uint8Array(buf)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSign(secret, data) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return new Uint8Array(sig);
}

function uuidLike() {
    // simple JTI generator
    const r = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(r).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get('origin') || '*';
        if (request.method === 'OPTIONS') return allowHeaders(origin);

        if (!/\/token$/i.test(url.pathname)) {
            // allow ping anywhere under token path too
            if (url.searchParams.get('ping')) {
                return new Response(JSON.stringify({ ok: true, pong: Date.now() }), { headers: corsHeaders(origin) });
            }
            return new Response('Not Found', { status: 404, headers: corsHeaders(origin) });
        }

        if (url.searchParams.get('ping')) {
            return new Response(JSON.stringify({ ok: true, pong: Date.now() }), { headers: corsHeaders(origin) });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
        }

        // optional origin allow-list and bearer auth
        if (!isOriginAllowed(origin, env.ALLOWED_ORIGINS)) {
            return new Response('Origin not allowed', { status: 403, headers: corsHeaders(origin) });
        }
        const expected = env.AUTH_TOKEN || '';
        if (expected) {
            const auth = request.headers.get('authorization') || '';
            if (!auth.toLowerCase().startsWith('bearer ') || auth.slice(7) !== expected) {
                return new Response('Unauthorized', { status: 401, headers: corsHeaders(origin) });
            }
        }

        const accountSid = env.TWILIO_ACCOUNT_SID;
        const apiKeySid = env.TWILIO_API_KEY_SID;
        const apiKeySecret = env.TWILIO_API_KEY_SECRET;
        const appSid = env.TWILIO_APP_SID || '';
        if (!accountSid || !apiKeySid || !apiKeySecret) {
            return new Response('Server not configured: Twilio env vars missing', { status: 500, headers: corsHeaders(origin) });
        }

        let body;
        try { body = await request.json(); } catch { body = {}; }
        const identity = String(body.identity || `user_${Math.floor(Date.now() / 1000)}`);
        const ttl = Math.max(60, Math.min(3600, Number(body.ttl) || 3600));
        const allowIncoming = body.allowIncoming === false ? false : true;
        const params = body.params && typeof body.params === 'object' ? body.params : {};
        const region = body.region ? String(body.region) : undefined;

        const now = Math.floor(Date.now() / 1000);
        const exp = now + ttl;
        const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' };
        const grants = {
            identity,
            voice: {
                incoming: { allow: allowIncoming },
                outgoing: appSid ? { application_sid: appSid, params } : undefined
            }
        };
        if (region) grants.voice.region = region;
        const payload = {
            iss: apiKeySid,
            sub: accountSid,
            exp,
            nbf: now,
            iat: now,
            jti: `${apiKeySid}-${uuidLike()}`,
            grants
        };

        const encHeader = b64url(JSON.stringify(header));
        const encPayload = b64url(JSON.stringify(payload));
        const toSign = `${encHeader}.${encPayload}`;
        const sig = await hmacSign(apiKeySecret, toSign);
        const jwt = `${toSign}.${b64url(sig)}`;

        const resBody = { token: jwt, identity, expires: exp, issuedAt: now };
        return new Response(JSON.stringify(resBody), { status: 200, headers: corsHeaders(origin) });
    }
}
