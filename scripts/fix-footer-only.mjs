import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PARTIAL = path.join(ROOT, "partials", "global-footer.html");
if (!fs.existsSync(PARTIAL)) { console.error("❌ Missing partials/global-footer.html"); process.exit(1); }
const FOOT = fs.readFileSync(PARTIAL, "utf8").trim();

function ensureInHead(html, tagHtml) {
  const headClose = /<\/head>/i;
  if (!headClose.test(html)) return html;
  if (html.includes(tagHtml)) return html;
  return html.replace(headClose, `  ${tagHtml}\n</head>`);
}

const rxFooter = /<footer[\\s\\S]*?<\\/footer>/i;
const files = fs.readdirSync(ROOT).filter(f => f.endsWith(".html"));
const summary = { updated: [], inserted: [], ensuredCss: 0 };

for (const f of files) {
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, "utf8");
  const before = html;

  // Ensure footer CSS once
  const NEED = `<link rel="stylesheet" href="footer-2025.css" />`;
  const next = ensureInHead(html, NEED);
  if (next !== html) { html = next; summary.ensuredCss = 1; }

  // Replace existing <footer>… or insert before </body>
  if (rxFooter.test(html)) {
    html = html.replace(rxFooter, FOOT);
    summary.updated.push(f);
  } else if (/<\\/body>/i.test(html)) {
    html = html.replace(/<\\/body>/i, `${FOOT}\n</body>`);
    summary.inserted.push(f);
  }

  if (html !== before) fs.writeFileSync(p, html, "utf8");
}

console.log(JSON.stringify(summary, null, 2));
