import fs from "fs";
const CSS=`<link rel="stylesheet" href="contrast-fix.css?v=${Date.now()}" />`,JS=`<script src="js/contrast-fix.js" defer></script>`;
const HEAD=/<\/head>/i,BODY=/<\/body>/i;
for(const f of fs.readdirSync(".").filter(f=>f.endsWith(".html"))){
 let h=fs.readFileSync(f,"utf8"),b=h;
 if(!h.includes('contrast-fix.css'))h=h.replace(HEAD,`${CSS}\n</head>`);
 if(!h.includes('js/contrast-fix.js'))h=h.replace(BODY,`${JS}\n</body>`);
 if(h!==b)fs.writeFileSync(f,h,"utf8");
}
console.log("contrast-fix links ensured.");
