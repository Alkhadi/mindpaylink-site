import fs from "fs";
const VER='${VER}';
const files=fs.readdirSync(".").filter(f=>f.endsWith(".html"));
let changed=[];
for(const f of files){
 let h=fs.readFileSync(f,"utf8"),b=h;
 h=h.replace(/(header-2025\.css|footer-2025\.css|nav-footer-uni\.css|nav-2025\.js)(\?v=[^"']*)?/g,"$1?v="+VER);
 if(h!==b){fs.writeFileSync(f,h,"utf8");changed.push(f);}
}
console.log(JSON.stringify({VER,changed},null,2));
