import fs from "fs"; const TAG=`<script src="js/sw-cache-buster.once.js" defer></script>`, CLOSE=/<\/body>/i;
for(const f of fs.readdirSync(".").filter(n=>n.endsWith(".html"))){let h=fs.readFileSync(f,"utf8");
  if(!h.includes("js/sw-cache-buster.once.js")){ if(CLOSE.test(h)) h=h.replace(CLOSE,`  ${TAG}\n</body>`); else h+=`\n${TAG}\n`; fs.writeFileSync(f,h,"utf8");}}
console.log("✓ sw-cache-buster link ensured.");
