import fs from "fs";
const MARK="__mshare_swfix__";
const src=fs.readFileSync("js/sw-cache-buster.once.js","utf8");
const targets=["site-core.js","app.js"];
let prepended=[];
for(const p of targets){
  if(!fs.existsSync(p)) continue;
  const s=fs.readFileSync(p,"utf8");
  if(s.includes(MARK)) continue;
  fs.writeFileSync(p, src + "\n" + s, "utf8");
  prepended.push(p);
}
console.log(JSON.stringify({prepended}, null, 2));
