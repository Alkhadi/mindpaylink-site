import fs from "fs";
const TAG = `<script src="js/voice-sync.js" defer></script>`;
const CLOSE = /<\/body>/i;
const files = fs.readdirSync(".").filter(f=>f.endsWith(".html"));
let changed=[];
for(const f of files){
 let h=fs.readFileSync(f,"utf8");
 if(!h.includes('js/voice-sync.js')){
   h=h.replace(CLOSE,`${TAG}\n</body>`);
   fs.writeFileSync(f,h,"utf8");
   changed.push(f);
 }
}
console.log(JSON.stringify({insertedInto:changed},null,2));
