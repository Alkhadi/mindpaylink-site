Cloudflare R2 uploads for M Share

This folder contains a tiny Cloudflare Worker you can deploy to accept PDF uploads from the site and store them in an R2 bucket.

What you get
- POST /upload?name=<key> — saves body as application/pdf to your R2 bucket binding
- Optional bearer protection via AUTH_TOKEN env var
- Optional PUBLIC_BASE env var to emit a public link to your asset (e.g., https://pub.example.com)

Setup (approx. 5 minutes)
1) R2 bucket
   - In Cloudflare Dashboard → R2 → Create bucket named mshare-profiles
2) Worker
   - Create a Worker (e.g., mshare-upload) and paste worker-r2-upload.js
   - Bind R2: Settings → Bindings → R2 Bucket → Variable name: MSHARE → Bucket: mshare-profiles
   - Env vars (optional): AUTH_TOKEN=<long-random>, PUBLIC_BASE=https://<your-public-bucket-domain>
   - Routes: attach a route (e.g., https://upload.<your-domain>/upload) or use workers.dev
3) Test
   - Open: GET https://<your-worker>/upload?ping=1 should return { ok: true }
   - Try a curl POST with a small PDF

Use from the site
- Open storage.html (admin only). Paste your Worker endpoint URL (including /upload path) and token.
- Pick a file or click “Generate profile PDF and upload”. The page will POST to the worker and copy any returned link.

Security notes
- Keep AUTH_TOKEN secret. The site stores the token only in localStorage on the current device.
- You can enhance the Worker to set ACLs, signed URLs, or validate key prefixes.

Troubleshooting
- 401 Unauthorized: ensure AUTH_TOKEN matches exactly and header is Authorization: Bearer <token>
- 415/400: only PDFs are accepted by this example worker
- 500 Upload failed: check Worker logs and R2 binding name (MSHARE)


ElevenLabs TTS proxy (new)
---------------------------------
File: cloudflare/worker-tts-elevenlabs.js

Purpose
- Server-side proxy for ElevenLabs Text-to-Speech to keep API keys private and return audio for the site voicebot.

Routes
- GET  /tts?ping=1 → { ok: true }
- POST /tts?format=mp3|ogg|wav&voice=<VOICE_ID>
   Body: { text: "Hello world", model: "eleven_multilingual_v2" }
   Returns: audio/* (mp3 default) with CORS

Env vars
- ELEVENLABS_API_KEY (required)
- ELEVENLABS_VOICE_ID (optional; default voice if client doesn’t pass ?voice=)
- ALLOWED_ORIGINS (optional; comma-separated allow-list; defaults to *)

Setup
1) Create a Worker (e.g., mshare-tts) and paste worker-tts-elevenlabs.js
2) Add env vars in Settings → Variables
3) Route: attach to e.g., https://api.<your-domain>/tts (or use workers.dev)

Quick test
- GET https://api.<your-domain>/tts?ping=1 → { ok: true }
- POST a JSON body: { "text": "Hello from M Share" }

Client wiring
- In the site console or a small bootstrap snippet:
   window.__MSHARE__ && window.__MSHARE__.Voice && window.__MSHARE__.Voice.TTS.configure({ proxyUrl: 'https://api.<your-domain>/tts', voice: '<VOICE_ID>' });


Twilio token issuer (new)
---------------------------------
File: cloudflare/worker-twilio-token.js

Purpose
- Issue short‑lived Twilio Voice/WebRTC Access Tokens to the browser so you can automate inbound/outbound calls without exposing secrets client-side.

Routes
- GET  /token?ping=1 → { ok: true }
- POST /token  { identity?, ttl?, allowIncoming?, params?, region? } → { token, identity, expires, issuedAt }

Env vars
- TWILIO_ACCOUNT_SID (AC…)
- TWILIO_API_KEY_SID (SK…)
- TWILIO_API_KEY_SECRET
- TWILIO_APP_SID (AP… TwiML App SID; optional but recommended for outbound)
- ALLOWED_ORIGINS (optional; comma-separated allow-list)
- AUTH_TOKEN (optional; require Authorization: Bearer <token>)

Security
- Prefer setting ALLOWED_ORIGINS to your production origin and use AUTH_TOKEN on top for defense‑in‑depth.

Quick test
- GET https://api.<your-domain>/token?ping=1 → { ok: true }
- POST JSON to /token (include Authorization header if configured). You’ll get a JWT.

Client wiring (example)
// Acquire token then configure the voicebot call stubs (placeholder; real call flow needs Twilio Client SDK)
fetch('https://api.<your-domain>/token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <if-set>' }, body: JSON.stringify({ identity: 'mshare-user' }) })
   .then(r => r.json())
   .then(({ token }) => { window.__MSHARE__.Voice.Calls.configureTwilio({ token }); });

Notes
- The static site ships only call stubs; for real calling you’ll add Twilio Client SDK on pages where calls are needed.


Research proxy for academic sources (new)
---------------------------------
File: cloudflare/worker-research.js

Purpose
- Provide a lightweight proxy to fetch academic results without exposing API keys in the browser. Includes:
   - /research/arxiv — public arXiv Atom feed (parsed into JSON)
   - /research/s2 — Semantic Scholar Graph API (optional; needs API key)

Routes
- GET  /research?ping=1 → { ok: true }
- GET  /research/arxiv?q=<query> → [{ title, url, date }]
- GET  /research/s2?q=<query>   → [{ title, url, year }] (501 if no key configured)

Env vars
- ALLOWED_ORIGINS (optional, comma-separated; origin allow‑list)
- SEMANTIC_SCHOLAR_API_KEY (optional; required for /s2)

Setup
1) Create a Worker (e.g., mshare-research) and paste worker-research.js
2) Add env vars as needed
3) Route: attach to e.g., https://api.<your-domain>/research

Quick test
- GET https://api.<your-domain>/research?ping=1 → { ok: true }
- GET https://api.<your-domain>/research/arxiv?q=heart%20rate%20variability
- GET https://api.<your-domain>/research/s2?q=mitosis (after adding key)

Wire to site Agent
- In assets/data/agent-config.json, set:
   {
      "research": { "ukRefs": true, "preferAcUk": true, "proxyUrl": "https://api.<your-domain>/research" }
   }
- The agent will combine Wikipedia summary, Crossref/Europe PMC, and proxy results (arXiv/Semantic Scholar) to produce concise, credible answers.
