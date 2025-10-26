import fs from "fs";
import path from "path";

function pickLogo(){
  const cands=[
    "alkhadi.png",
    "assets/icons/logo-icon.svg",
    "assets/icons/android-chrome-192x192.png",
  ];
  for(const p of cands){ if(fs.existsSync(p)) return p; }
  // generate minimal svg
  const gen="assets/icons/logo-icon.generated.svg";
  if(!fs.existsSync("assets/icons")) fs.mkdirSync("assets/icons",{recursive:true});
  fs.writeFileSync(gen, `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="#115E84"/><text x="50%" y="54%" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto" font-weight="700" font-size="72" fill="#fff">M</text></svg>`);
  return gen;
}
const IMG=pickLogo();
const LINK_IMG = `<a class="footer-home-link" href="/" aria-label="Go to homepage"><img src="${IMG}" alt="Home" loading="lazy" decoding="async"/></a>`;
const LINK_TXT = `<a class="footer-home-link" href="/" aria-label="Go to homepage">Home</a>`;

function injectIntoHtmlFile(file){
  let s=fs.readFileSync(file,"utf8"); const b=s;
  if(/class=["']footer-home-link["']/.test(s)) return false;
  if(/<footer[\s\S]*<\/footer>/i.test(s)){
    s=s.replace(/<\/footer>/i, `  ${IMG ? LINK_IMG : LINK_TXT}\n</footer>`);
    fs.writeFileSync(file,s,"utf8"); return true;
  }
  return false;
}

let touched=[];
if(fs.existsSync("partials/global-footer.html")){
  const f="partials/global-footer.html";
  let s=fs.readFileSync(f,"utf8"), b=s;
  if(!/class=["']footer-home-link["']/.test(s)){
    if(/<\/footer>/i.test(s)){ s=s.replace(/<\/footer>/i, `  ${IMG ? LINK_IMG : LINK_TXT}\n</footer>`); fs.writeFileSync(f,s,"utf8"); touched.push(f); }
  }
} else {
  for(const f of fs.readdirSync(".").filter(x=>x.endsWith(".html"))){
    try{ if(injectIntoHtmlFile(f)) touched.push(f); }catch{}
  }
}
console.log(JSON.stringify({logo:IMG, updated:touched}, null, 2));
