import fs from 'fs'; import path from 'path';
const root = process.cwd();
function walk(dir, out=[]) {
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const d of list) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (['node_modules','.git','.next','dist','build','assets'].includes(d.name)) continue;
      walk(p, out);
    } else if (d.isFile() && p.endsWith('.html')) out.push(p);
  } return out;
}
function write(p, s){ fs.writeFileSync(p, s, 'utf8'); console.log('✓ updated', path.relative(root, p)); }
const files = walk(root);
const map = { inhale:'assets/audio/inhale.wav', hold:'assets/audio/hold.wav', exhale:'assets/audio/exhale.wav' };

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  let orig = s;

  // Heuristics: add data-say-asset to <button>/<a> whose inner text contains the word
  for (const [key, url] of Object.entries(map)) {
    const re = new RegExp(`(<(?:button|a)[^>]*>[^<]*\\b${key}\\b[^<]*<\\/\\s*(?:button|a)>)`, 'ig');
    s = s.replace(re, (m) => {
      if (/data-say-asset=/.test(m)) return m; // already wired
      return m.replace(/<(button|a)\b/i, (tag) => `${tag} data-say-asset="${url}"`);
    });
  }

  if (s !== orig) write(f, s);
}
console.log('Done. Reload pages and tap Enable audio / click buttons.');
