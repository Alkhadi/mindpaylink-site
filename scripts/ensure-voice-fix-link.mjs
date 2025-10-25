import fs from "fs"; import path from "path";
const ROOT = process.cwd();
const files = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
const NEED = `<link rel="stylesheet" href="voice-coach-fix.css" />`;
for (const f of files){
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, "utf8");
  if (!/<\/head>/i.test(html)) continue;
  if (!html.includes(NEED)){
    html = html.replace(/<\/head>/i, `  ${NEED}\n</head>`);
    fs.writeFileSync(p, html, "utf8");
  }
}
console.log("Linked voice-coach-fix.css in", files.length, "pages (where needed).");
