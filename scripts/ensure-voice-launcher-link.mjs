import fs from "fs"; import path from "path";
const ROOT = process.cwd();
const files = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
const TAG = `<script src="js/voicebot-launcher.js" defer></script>`;
for (const f of files){
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, "utf8");
  if (!html.includes(TAG)){
    if (/<\\/body>/i.test(html)) html = html.replace(/<\\/body>/i, `  ${TAG}\n</body>`);
    else html += `\\n${TAG}\\n`;
    fs.writeFileSync(p, html, "utf8");
  }
}
console.log("Injected voicebot-launcher.js into", files.length, "pages (where needed).");
