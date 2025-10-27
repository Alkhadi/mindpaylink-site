// Cloudflare Worker: Azure Neural TTS proxy
export default {
  async fetch(req, env) {
    if (req.method !== 'POST') return new Response('OK', {status:200, headers:{'access-control-allow-origin':'*'}});
    let body={}; try{ body = await req.json(); }catch(e){}
    const region = env.AZURE_TTS_REGION;  // e.g. "uksouth"
    const key    = env.AZURE_TTS_KEY;
    const voice  = (body.voice || env.VOICE_NAME || 'en-GB-RyanNeural');
    let ssml    = String(body.ssml||'').replace(/name="[^"]+"/,'name="'+voice+'"');
    if (!region || !key || !ssml) return new Response('Missing config', {status:400, headers:{'access-control-allow-origin':'*'}});
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const r = await fetch(url, {
      method:'POST',
      headers:{
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'MShare-Phonics-Worker'
      },
      body: ssml
    });
    if (!r.ok) return new Response('TTS error', {status:502, headers:{'access-control-allow-origin':'*'}});
    const headers = new Headers(r.headers);
    headers.set('access-control-allow-origin','*');
    headers.set('content-type','audio/mpeg');
    return new Response(r.body, { status:200, headers });
  }
}