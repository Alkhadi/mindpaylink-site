import fs from "fs";

const VER = process.env.VER || new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,12);
const targets = ["nav-2025.js","header-2025.css","footer-2025.css","nav-footer-uni.css"];

const esc = (x)=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const has = (p)=>{ try{ fs.accessSync(p); return true; }catch{ return false; } };

const htmls = fs.readdirSync(".").filter(f=>f.endsWith(".html"));
let htmlChanged = [];

for (const f of htmls){
  let h = fs.readFileSync(f,"utf8"); const before = h;
  for (const name of targets){
    const RxHref = new RegExp(`(href=["'])${esc(name)}(?:\\?[^"']*)?(["'])`,"ig");
    const RxSrc  = new RegExp(`(src=["'])${esc(name)}(?:\\?[^"']*)?(["'])`,"ig");
    h = h.replace(RxHref, `$1${name}?v=${VER}$2`);
    h = h.replace(RxSrc , `$1${name}?v=${VER}$2`);
  }
  if (!/sw-cache-buster\.once\.js/i.test(h)) {
    if (/<\/body>/i.test(h)) h = h.replace(/<\/body>/i, `  <script src="js/sw-cache-buster.once.js" defer></script>\n</body>`);
    else h += `\n<script src="js/sw-cache-buster.once.js" defer></script>\n`;
  }
  if (h!==before){ fs.writeFileSync(f,h,"utf8"); htmlChanged.push(f); }
}

let jsChanged = [];
if (has("nav-2025.js")){
  let s = fs.readFileSync("nav-2025.js","utf8"); const b = s;

  s = s.replace(
    /fetch\(\s*(["'])\/?partials\/global-(header|footer)\.html(?:\?[^"']*)?\1\s*\)/ig,
    (_m, q, which)=>`fetch(${q}partials/global-${which}.html?v=${VER}${q}, { cache: 'no-store' })`
  );

  if (s!==b){
    fs.writeFileSync("nav-2025.js", s, "utf8");
    jsChanged.push("nav-2025.js");
  }
}

console.log(JSON.stringify({ VER, htmlChanged, jsChanged }, null, 2));
