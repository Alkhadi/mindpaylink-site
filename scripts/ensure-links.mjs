import fs from "fs";
const files=fs.readdirSync(".").filter(f=>f.endsWith(".html"));
const inserts=[
 {tag:`<script src="js/voicebot-launcher.js" defer></script>`,where:/<\/body>/i},
 {tag:`<script src="js/voice-sync.js" defer></script>`,where:/<\/body>/i},
 {tag:`<script src="js/contrast-fix.js" defer></script>`,where:/<\/body>/i},
 {tag:`<link rel="stylesheet" href="contrast-fix.css?v=${Date.now()}" />`,where:/<\/head>/i}
];
let changed=[];
for(const f of files){let h=fs.readFileSync(f,"utf8"),orig=h;
 for(const i of inserts){if(!h.includes(i.tag.match(/src="([^"]+)"/)?.[1]||"contrast-fix.css"))h=h.replace(i.where,i.tag+"\n"+i.where.source.includes('body')?'</body>':'</head>');}
 if(h!==orig){fs.writeFileSync(f,h,"utf8");changed.push(f);}}
console.log(JSON.stringify({inserted:changed},null,2));
