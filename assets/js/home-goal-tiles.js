(()=>{const LABELS=['Calm','Sleep','Focus','School','Mood'];
  const heads=[...document.querySelectorAll('h2,h3')].filter(h=>/Pick\s*your\s*goal/i.test(h.textContent||'')); if(!heads.length)return;
  const h=heads[0], p=h.parentElement;
  const btns=[...p.querySelectorAll('a,button')].filter(b=>LABELS.some(w=>new RegExp('^'+w+'$','i').test((b.textContent||'').trim())));
  if(btns.length>=4){ let grid=p.querySelector('.goal-grid'); if(!grid){ grid=document.createElement('div'); grid.className='goal-grid'; p.appendChild(grid); }
    btns.forEach(b=>{ b.classList.add('goal-tile'); grid.appendChild(b); });
  }
})();