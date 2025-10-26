import fs from "fs";
const files = fs.readdirSync(".").filter(f=>f.endsWith(".html"));
const NEED_BODY = [
  '<script src="js/voicebot-launcher.js" defer></script>',
  '<script src="js/voice-sync.js" defer></script>',
  '<script src="js/contrast-fix.js" defer></script>',
  '<script src="js/sw-cache-buster.once.js" defer></script>',
];
const NEED_HEAD = [
  '<link rel="stylesheet" href="contrast-fix.css">'
];
let changed=[];
for(const f of files){
  let s=fs.readFileSync(f,"utf8"), b=s;
  if(!s.match(/<\/head>/i)) s = NEED_HEAD.join("\n") + "\n" + s; // fallback prepend
  for(const tag of NEED_HEAD){ if(!s.includes(tag)) s = s.replace(/<\/head>/i, `${tag}\n</head>`); }
  if(!s.match(/<\/body>/i)) s = s + "\n" + NEED_BODY.join("\n") + "\n"; // fallback append
  for(const tag of NEED_BODY){ if(!s.includes(tag)) s = s.replace(/<\/body>/i, `  ${tag}\n</body>`); }
  if(s!==b){ fs.writeFileSync(f,s,"utf8"); changed.push(f); }
}
console.log(JSON.stringify({injectedInto:changed}, null, 2));
