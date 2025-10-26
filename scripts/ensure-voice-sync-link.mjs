import fs from "fs";const TAG=`<script src="js/voice-sync.js" defer></script>`,CLOSE=/<\/body>/i;
for(const f of fs.readdirSync(".").filter(f=>f.endsWith(".html"))){
 let h=fs.readFileSync(f,"utf8");if(!h.includes('js/voice-sync.js')){h=h.replace(CLOSE,`  ${TAG}\n</body>`);fs.writeFileSync(f,h,"utf8");}}
console.log("voice-sync.js injected.");
