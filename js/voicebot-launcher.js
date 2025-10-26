(()=>{const LS_H='mshare_voicebot_hidden_v1',LS_P='mshare_voicebot_pos_v1';
let panel,launcher,pos={x:40,y:40},drag=false,offset={x:0,y:0};
function restore(){const st=localStorage.getItem(LS_H);const ps=localStorage.getItem(LS_P);
 if(ps){try{pos=JSON.parse(ps);}catch{}}
 panel=document.querySelector('.voice-assistant,#voiceAssistant,[data-role="voice-assistant"]');
 if(!panel)return;
 Object.assign(panel.style,{position:'fixed',top:pos.y+'px',left:pos.x+'px',zIndex:9999,touchAction:'none'});
 makeDraggable(panel); st==='1'?hide():show();}
function hide(){if(!panel)return;panel.style.display='none';
 if(!launcher){launcher=document.createElement('button');launcher.textContent='🎤 Voice';
 Object.assign(launcher.style,{position:'fixed',bottom:'1rem',right:'1rem',zIndex:9999,borderRadius:'50%',padding:'0.8rem',background:'#115E84',color:'#fff',border:'none',cursor:'pointer'});
 launcher.onclick=()=>{localStorage.setItem(LS_H,'0');show();};document.body.appendChild(launcher);}
 localStorage.setItem(LS_H,'1');}
function show(){if(panel)panel.style.display='block';if(launcher)launcher.remove();localStorage.setItem(LS_H,'0');}
function makeDraggable(el){el.onpointerdown=e=>{drag=true;offset.x=e.clientX-el.offsetLeft;offset.y=e.clientY-el.offsetTop;el.setPointerCapture(e.pointerId);};
 el.onpointermove=e=>{if(!drag)return;let x=e.clientX-offset.x,y=e.clientY-offset.y;
 x=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,x));y=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,y));
 el.style.left=x+'px';el.style.top=y+'px';};
 el.onpointerup=e=>{drag=false;el.releasePointerCapture(e.pointerId);
 pos={x:parseInt(el.style.left),y:parseInt(el.style.top)};localStorage.setItem(LS_P,JSON.stringify(pos));};}
window.addEventListener('DOMContentLoaded',()=>{restore();
 const b=document.createElement('button');b.textContent='Hide';
 Object.assign(b.style,{marginLeft:'0.5rem',background:'#A8A9C6',color:'#111'});
 b.onclick=hide;if(panel)panel.appendChild(b);});
})();
