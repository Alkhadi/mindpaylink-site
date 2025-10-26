import fs from "fs";
const files=fs.readdirSync(".").filter(f=>f.endsWith(".html"));
const inserts=[
 {tag:`<script src="js/voicebot-launcher.js" defer></script>`,needle:"voicebot-launcher.js",where:/<\/body>/i},
 {tag:`<script src="js/voice-sync.js" defer></script>`,needle:"voice-sync.js",where:/<\/body>/i},
 {tag:`<script src="js/contrast-fix.js" defer></script>`,needle:"contrast-fix.js",where:/<\/body>/i},
 {tag:`<link rel="stylesheet" href="contrast-fix.css?v=${Date.now()}" />`,needle:"contrast-fix.css",where:/<\/head>/i}
];
let changed=[];
for(const f of files){
 let html=fs.readFileSync(f,"utf8"),orig=html;
 for(const i of inserts){
   if(!html.includes(i.needle)) html=html.replace(i.where,(m)=>`${i.tag}\n${m}`);
 }
 if(html!==orig){fs.writeFileSync(f,html,"utf8");changed.push(f);}
}
console.log(JSON.stringify({updated:changed},null,2));
