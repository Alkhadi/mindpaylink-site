import fs from "fs";
const f="nav-2025.js";
const VER=process.env.VER||"dev";
if(!fs.existsSync(f)){ console.log(JSON.stringify({patched:false, reason:"nav-2025.js not found"},null,2)); process.exit(0); }
let s=fs.readFileSync(f,"utf8"), b=s;
s=s.replace(/fetch\(\s*(['"])partials\/global-(header|footer)\.html(?:\?[^'"]*)?\1\s*\)/ig,
            (_m,q,which)=>`fetch(${q}partials/global-${which}.html?v=${VER}${q}, { cache: 'no-store' })`);
if(s!==b){ fs.writeFileSync(f,s,"utf8"); console.log(JSON.stringify({patched:true, file:f},null,2)); }
else { console.log(JSON.stringify({patched:false, file:f, reason:"already patched or no matches"},null,2)); }
