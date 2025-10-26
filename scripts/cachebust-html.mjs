import fs from "fs";
const VER = process.env.VER||"dev";
const targets = [
  "header-2025.css","footer-2025.css","nav-footer-uni.css","nav-2025.js",
  "voicebot.css","voice-coach-fix.css"
];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let changed=[];
for(const f of fs.readdirSync(".").filter(x=>x.endsWith(".html"))){
  let s=fs.readFileSync(f,"utf8"), b=s;
  for(const name of targets){
    const rxHref = new RegExp(`(href=["'])${esc(name)}(?:\\?[^"']*)?(["'])`,'ig');
    const rxSrc  = new RegExp(`(src=["'])${esc(name)}(?:\\?[^"']*)?(["'])`,'ig');
    s=s.replace(rxHref, `$1${name}?v=${VER}$2`);
    s=s.replace(rxSrc , `$1${name}?v=${VER}$2`);
  }
  if(s!==b){ fs.writeFileSync(f,s,"utf8"); changed.push(f); }
}
console.log(JSON.stringify({cachebusted:changed, VER}, null, 2));
