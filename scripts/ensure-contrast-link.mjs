import fs from "fs";
const CSS=`<link rel="stylesheet" href="contrast-fix.css?v=${Date.now()}" />`;
const JS=`<script src="js/contrast-fix.js" defer></script>`;
const HEAD=/<\/head>/i, BODY=/<\/body>/i;
const files=fs.readdirSync(".").filter(f=>f.endsWith(".html"));
let changed=[];
for(const f of files){
 let h=fs.readFileSync(f,"utf8"),orig=h;
 if(!h.includes('contrast-fix.css')) h=h.replace(HEAD,`${CSS}\n</head>`);
 if(!h.includes('js/contrast-fix.js')) h=h.replace(BODY,`${JS}\n</body>`);
 if(h!==orig){fs.writeFileSync(f,h,"utf8");changed.push(f);}
}
console.log(JSON.stringify({insertedInto:changed},null,2));
