import fs from "fs";
const TAG = `<script src="js/voice-sync.js" defer></script>`;
const CLOSE = /<\/body>/i;
const files = fs.readdirSync(".").filter(f=>f.endsWith(".html"));
let changed=[];
for (const f of files){
  let html = fs.readFileSync(f,"utf8");
  if (html.includes('js/voice-sync.js')) continue;
  if (CLOSE.test(html)) html = html.replace(CLOSE, `  ${TAG}\n</body>`); else html += `\n${TAG}\n`;
  fs.writeFileSync(f, html, "utf8");
  changed.push(f);
}
console.log(JSON.stringify({insertedInto:changed}, null, 2));
