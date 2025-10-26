import fs from "fs"; const VER=process.env.VER||"dev"; const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const targets=["header-2025.css","footer-2025.css","nav-footer-uni.css","nav-2025.js","contrast-fix.css","js/contrast-fix.js","js/voicebot-launcher.js","js/voice-sync.js","js/sw-cache-buster.once.js"];
for(const f of fs.readdirSync(".").filter(n=>n.endsWith(".html"))){let h=fs.readFileSync(f,"utf8"),b=h;
  for(const name of targets){const RX=new RegExp(`((?:href|src)=["'])${esc(name)}(?:\\?[^"']*)?(["'])`,"ig"); h=h.replace(RX,`$1${name}?v=${VER}$2`);}
  if(h!==b) fs.writeFileSync(f,h,"utf8");
}
if (fs.existsSync("nav-2025.js")){
  let s=fs.readFileSync("nav-2025.js","utf8"), b=s;
  s=s.replace(/fetch\(\s*(["'])\/?partials\/global-(header|footer)\.html(?:\?[^"']*)?\1\s*\)/ig,
              (_m,q,w)=>`fetch(${q}partials/global-${w}.html?v=${VER}${q}, { cache: 'no-store' })`);
  if(s!==b) fs.writeFileSync("nav-2025.js",s,"utf8");
}
console.log(`✓ cache-busted assets (VER=${VER})`);
