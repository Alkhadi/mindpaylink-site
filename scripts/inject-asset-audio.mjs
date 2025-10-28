import fs from 'fs'; import path from 'path';

const root = process.cwd();
const marker = '<!-- __mshare_asset_audio_player__ -->';
const snippet = `${marker}
<script>
(()=>{const A=new Audio();A.preload='auto';A.setAttribute('playsinline','');
let unlocked=false;document.addEventListener('click',async(e)=>{const el=e.target.closest('[data-say-asset]');if(!el)return;
try{if(!unlocked){const AC=window.AudioContext||window.webkitAudioContext;if(AC){const ac=new AC();const b=ac.createBuffer(1,1,22050);const s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);s.start(0);await ac.resume();}unlocked=true;}
A.src=el.getAttribute('data-say-asset');await A.play();}catch(err){console.error('asset-audio play failed',err);}});})();
</script>`;

function walk(d, out=[]){
  for (const ent of fs.readdirSync(d,{withFileTypes:true})) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()){
      if (['node_modules','.git','.next','dist','build','assets'].includes(ent.name)) continue;
      walk(p,out);
    } else if (ent.isFile() && /\.html?$/i.test(ent.name)) out.push(p);
  } return out;
}

for (const f of walk(root)) {
  let s = fs.readFileSync(f,'utf8'); if (!s) continue;
  if (!s.includes(marker)) {
    s = s.replace(/<\/body>/i, `${snippet}\n</body>`);
    fs.writeFileSync(f,s,'utf8');
    console.log('✓ injected player into', path.relative(root,f));
  } else {
    console.log('• already has player', path.relative(root,f));
  }
}
