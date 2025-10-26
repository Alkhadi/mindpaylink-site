import fs from 'fs';
const files = fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const CLOSE = /<\/body>/i;
const TAGS = [
  `<script src="js/voicebot-launcher.js" defer></script>`,
  `<script src="js/voice-sync.js" defer></script>`
];

let changed = [];
for (const f of files){
  let html = fs.readFileSync(f,'utf8');
  let before = html;

  for (const tag of TAGS){
    if (!html.includes(tag)){
      if (CLOSE.test(html)) html = html.replace(CLOSE, `  ${tag}\n</body>`);
      else html += `\n${tag}\n`;
    }
  }

  if (html !== before){
    fs.writeFileSync(f, html, 'utf8');
    changed.push(f);
  }
}
console.log(JSON.stringify({ injectedInto: changed }, null, 2));
