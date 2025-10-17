(()=>{
	const HEADER_HTML = `
	<header class="site-header">
		<div class="container navbar">
			<a id="brandLink" class="brand" data-href="index.html" href="index.html"><span class="logo">M</span> <span class="brand-text">M Share</span></a>

			<nav class="main-nav" id="mainNav">
	<a data-href="index.html">Wellbeing</a>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">Conditions <span class="icon">▾</span></button>
		<div class="submenu">
			<div class="menu-label">Neurodevelopmental</div>
			<a data-href="autism.html">Autism</a>
			<a data-href="adhd.html">ADHD</a>
			<a data-href="dyslexia-reading-training.html">Dyslexia</a>
			<div class="menu-label">Mental Health</div>
			<a data-href="anxiety.html">Anxiety</a>
			<a data-href="depression.html">Depression</a>
			<a data-href="stress.html">Stress</a>
			<a data-href="sleep.html">Sleep</a>
		</div>
	</div>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">Breathing &amp; Focus <span class="icon">▾</span></button>
		<div class="submenu">
			<div class="menu-label">Guides</div>
			<a data-href="breath.html">Breath (how‑to)</a>
			<a data-href="focus.html">Focus</a>
			<a data-href="mindfulness.html">Mindfulness</a>
			<div class="menu-label">Techniques</div>
			<a data-href="sos-60.html">60‑second Reset</a>
			<a data-href="box-breathing.html">Box Breathing</a>
			<a data-href="4-7-8-breathing.html">4‑7‑8 Breathing</a>
			<a data-href="coherent-5-5.html">Coherent 5‑5</a>
		</div>
	</div>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">Toolkits <span class="icon">▾</span></button>
		<div class="submenu">
			<div class="menu-label">General</div>
			<a data-href="sleep-tools.html">Sleep Tools</a>
			<a data-href="breath-tools.html">Breath Tools</a>
			<a data-href="mood-tools.html">Mood Tools</a>
			<div class="menu-label">Condition‑specific</div>
			<a data-href="adhd-tools.html">ADHD Tools</a>
			<a data-href="autism-tools.html">Autism Tools</a>
			<a data-href="depression-tools.html">Depression Tools</a>
			<a data-href="anxiety-tools.html">Anxiety Tools</a>
			<a data-href="stress-tools.html">Stress Tools</a>
		</div>
	</div>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">About <span class="icon">▾</span></button>
		<div class="submenu">
			<a data-href="about.html">About</a>
			<a data-href="coffee.html">Support Us</a>
			<a data-href="contact.html">Contact</a>
		</div>
	</div>
</nav>

			<button id="navToggle" class="nav-toggle" aria-label="Menu" aria-expanded="false"
				aria-controls="mainNav">☰</button>
		</div>
	</header>`;

	function applyHeader(){
		// Remove any extra headers and inject the canonical one
		const headers = Array.from(document.querySelectorAll('header'));
		if (headers.length) {
			headers.forEach((h,i)=>{ if(i>0) h.remove(); });
			headers[0].outerHTML = HEADER_HTML;
		} else {
			const wrap = document.createElement('div');
			wrap.innerHTML = HEADER_HTML;
			document.body.insertBefore(wrap.firstElementChild, document.body.firstChild);
		}

		// Ensure brand link routes with existing query string
		const link = document.getElementById('brandLink');
		if (link) {
			const qs = location.search || '';
			link.setAttribute('href', 'index.html' + qs);
			link.addEventListener('click', (e)=>{
				const href = link.getAttribute('href'); if (!href) return; e.preventDefault(); location.href = href;
			});
		}

		installNavCSS();
		wireNavBehavior();
	}

	function installNavCSS(){
		// Inject minimal, safe CSS for desktop and mobile nav if missing
		if (!document.getElementById('mpl-mobile-nav-style-v4')){
			const s = document.createElement('style'); s.id='mpl-mobile-nav-style-v4'; s.textContent = `
  /* Ensure [hidden] truly hides dropdowns in any theme */
  nav .menu[hidden], nav .submenu[hidden] { display:none !important; }
  @media (max-width: 1024px) {
    #mainNav[hidden] { display: none !important; }
    .nav-group, .menu-group { position: relative; }
    .nav-group.open > .menu,
    .menu-group.open > .submenu { display:block; }
    .nav-group > .menu-toggle,
    .nav-group > .chevron,
    .nav-group [data-chevron],
    .menu-group > .menu-toggle,
    .menu-group > .chevron,
    .menu-group [data-chevron] { cursor:pointer; touch-action: manipulation; }
    .nav-group > a:focus,
    .nav-group > button:focus,
    .nav-group > .menu-toggle:focus,
    .nav-group > .chevron:focus,
    .menu-group > a:focus,
    .menu-group > button:focus,
    .menu-group > .menu-toggle:focus,
    .menu-group > .chevron:focus { outline:2px solid currentColor; outline-offset:2px; }
  }
  @media (min-width: 1025px) { #navToggle{ display:none !important; } }
`;
			document.head.appendChild(s);
		}
		if (!document.getElementById('mpl-desktop-nav-css-v3')){
			const s = document.createElement('style'); s.id='mpl-desktop-nav-css-v3'; s.textContent = `
@media (min-width:1025px){
  .mpl-nav-toggle{display:inline-flex;align-items:center;gap:.25rem;background:none;border:0;padding:.25rem;margin-left:.25rem;cursor:pointer;line-height:1}
  .mpl-nav-toggle:focus,.mpl-nav-toggle:focus-visible{outline:2px solid currentColor;outline-offset:2px}
  [data-mpl-submenu]{display:none;visibility:hidden}
  [data-mpl-open="true"] > [data-mpl-submenu]{display:block;visibility:visible}
  .mpl-chevron{display:inline-block;transform:rotate(0deg);transition:transform .2s ease}
  [data-mpl-open="true"] .mpl-chevron{transform:rotate(180deg)}
  .mpl-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
}
`;
			document.head.appendChild(s);
		}
	}

	function wireNavBehavior(){
		const mq = window.matchMedia('(min-width:1025px)');
		let enabled = false; let cleanups = [];
		const q = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

		function findSubmenu(el){
			return el.querySelector(':scope > .submenu, :scope > [role="menu"], :scope > ul, :scope > .dropdown-menu, :scope > ol');
		}
		function findTopNavGroups(){
			const nav = document.getElementById('mainNav'); if (!nav) return [];
			const groups = [];
			Array.from(nav.children).forEach(node=>{ if (findSubmenu(node)) groups.push(node); });
			return groups;
		}
		function closeAll(except){
			q('[data-mpl-open="true"]').forEach(g=>{
				if (except && g===except) return;
				g.setAttribute('data-mpl-open','false');
				const t = g.querySelector(':scope > .mpl-nav-toggle'); if (t) t.setAttribute('aria-expanded','false');
			});
		}
		function enhanceDesktop(){
			if (enabled) return; enabled = true;
			const groups = findTopNavGroups(); if (!groups.length) return;
			groups.forEach(group=>{
				const submenu = findSubmenu(group); if (!submenu) return;
				submenu.setAttribute('data-mpl-submenu','true');
				group.setAttribute('data-mpl-nav-group','true');
				if (!group.hasAttribute('data-mpl-open')) group.setAttribute('data-mpl-open','false');
				let label = group.querySelector(':scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
				if (!label) label = group.firstElementChild;
				let toggle = group.querySelector(':scope > .mpl-nav-toggle');
				if (!toggle){
					toggle = document.createElement('button'); toggle.type='button'; toggle.className='mpl-nav-toggle';
					toggle.setAttribute('aria-haspopup','menu'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('title','Toggle submenu');
					toggle.innerHTML = '<span class="mpl-chevron" aria-hidden="true">▾<\/span><span class="mpl-sr-only">Toggle submenu<\/span>';
					if (label && label.nextSibling) group.insertBefore(toggle, label.nextSibling); else group.appendChild(toggle);
				}
				const open = ()=>{ if (!mq.matches) return; closeAll(group); group.setAttribute('data-mpl-open','true'); toggle.setAttribute('aria-expanded','true'); };
				const close = ()=>{ if (!mq.matches) return; group.setAttribute('data-mpl-open','false'); toggle.setAttribute('aria-expanded','false'); };
				const onEnter = ()=> open();
				const onLeave = (e)=>{ const rel = e.relatedTarget; if (rel && group.contains(rel)) return; close(); };
				const onToggle = (e)=>{ if (!mq.matches) return; e.preventDefault(); const isOpen = group.getAttribute('data-mpl-open')==='true'; if (isOpen) close(); else open(); };
				const onKeys = (e)=>{ if (!mq.matches) return; if (e.key==='Enter'||e.key===' '){ e.preventDefault(); onToggle(e);} else if (e.key==='Escape'){ e.preventDefault(); close(); toggle.focus(); } };
				group.addEventListener('mouseenter', onEnter);
				group.addEventListener('mouseleave', onLeave);
				toggle.addEventListener('click', onToggle);
				toggle.addEventListener('keydown', onKeys);
				cleanups.push(()=>{ group.removeEventListener('mouseenter', onEnter); group.removeEventListener('mouseleave', onLeave); toggle.removeEventListener('click', onToggle); toggle.removeEventListener('keydown', onKeys); });
			});
			const onDocClick = (e)=>{ if (!mq.matches) return; const openEl = document.querySelector('[data-mpl-open="true"]'); if (!openEl) return; if (openEl.contains(e.target)) return; openEl.setAttribute('data-mpl-open','false'); const t = openEl.querySelector(':scope > .mpl-nav-toggle'); if (t) t.setAttribute('aria-expanded','false'); };
			const onDocEsc = (e)=>{ if (!mq.matches) return; if (e.key==='Escape'){ const openEl = document.querySelector('[data-mpl-open="true"]'); if (!openEl) return; openEl.setAttribute('data-mpl-open','false'); const t = openEl.querySelector(':scope > .mpl-nav-toggle'); if (t){ t.setAttribute('aria-expanded','false'); t.focus(); } } };
			document.addEventListener('click', onDocClick);
			document.addEventListener('keydown', onDocEsc);
			cleanups.push(()=>{ document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onDocEsc); });
		}
		function teardownDesktop(){ if (!enabled) return; closeAll(); cleanups.forEach(fn=>{ try{fn();}catch{} }); cleanups=[]; enabled=false; }
		function wireMobile(){
			const nav = document.getElementById('mainNav'); const toggle = document.getElementById('navToggle'); if (!nav||!toggle) return;
			const close = ()=>{ nav.setAttribute('hidden',''); document.body.classList.remove('is-nav'); toggle.setAttribute('aria-expanded','false'); };
			const open = ()=>{ nav.removeAttribute('hidden'); document.body.classList.add('is-nav'); toggle.setAttribute('aria-expanded','true'); };
			toggle.addEventListener('click', (e)=>{ e.preventDefault(); const openNow = toggle.getAttribute('aria-expanded')==='true'; if (openNow) close(); else open(); });
			// Tap to toggle submenu blocks
			nav.addEventListener('click', (e)=>{
				const btn = e.target.closest('.menu-group > .menu-toggle'); if (!btn) return;
				e.preventDefault(); const group = btn.parentElement; const isOpen = group.classList.contains('open');
				Array.from(nav.querySelectorAll('.menu-group.open')).forEach(g=>{ if (g!==group) g.classList.remove('open'); });
				group.classList.toggle('open', !isOpen);
			});
			// Close when clicking outside
			document.addEventListener('click', (e)=>{ const hdr = document.querySelector('header'); if (!hdr) return; if (!hdr.contains(e.target) && toggle.getAttribute('aria-expanded')==='true') close(); });
		}
		const react = ()=>{ if (mq.matches){ wireMobileCleanup(); enhanceDesktop(); } else { teardownDesktop(); wireMobile(); } };
		let mobileCleanupFns=[]; function wireMobileCleanup(){ mobileCleanupFns.forEach(fn=>{ try{fn();}catch{} }); mobileCleanupFns=[]; }
		if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', react, {once:true}); else react();
		mq.addEventListener('change', react);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyHeader, { once: true });
	else applyHeader();
})();
