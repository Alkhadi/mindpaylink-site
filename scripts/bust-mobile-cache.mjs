import fs from "fs";
const VER='${VER}';
const files=fs.readdirSync(".").filter(f=>f.endsWith(".html"));
let htmlChanged=[];
for(const f of files){
 let h=fs.readFileSync(f,"utf8"),b=h;
 h=h.replace(/(header-2025\.css|footer-2025\.css|nav-footer-uni\.css|nav-2025\.js)(\?v=[^"']*)?/g,"$1?v="+VER);
 if(h!==b){fs.writeFileSync(f,h,"utf8");htmlChanged.push(f);}
}
if(fs.existsSync("nav-2025.js")){
 let s=fs.readFileSync("nav-2025.js","utf8"),b=s;
 s=s.replace(/fetch\(\s*(["'])partials\/global-(header|footer)\.html[^"']*\1\s*\)/ig,
   (_m,q,w)=>`fetch(${q}partials/global-${w}.html?v=${VER}${q},{cache:'no-store'})`);
 if(s!==b)fs.writeFileSync("nav-2025.js",s,"utf8");
}
console.log(JSON.stringify({VER,htmlChanged},null,2));
