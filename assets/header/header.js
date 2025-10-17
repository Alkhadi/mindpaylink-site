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
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyHeader, { once: true });
	else applyHeader();
})();
