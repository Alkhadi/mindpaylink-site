(() => {
	const FOOTER_HTML = `
<footer id="footer2025" class="footer-2025 mpl-footer-v3">
	<div class="mpl-footer-wrap">
		<div class="mpl-footer-grid" role="navigation" aria-label="Site footer">
			<section class="col brand">
				<div class="brandline">
					<span class="logo" aria-hidden="true">M</span>
					<div><b>M Share</b><div class="muted">Quiet, practical tools for mental health and wellbeing.</div></div>
				</div>
				<div class="mpl-pay" aria-label="Support links">
						<a class="pay-link" data-href="coffee.html" target="_blank" rel="noopener">Support Us</a>
					<a class="pay-link" href="https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00" target="_blank" rel="noopener">☕
							Support Us</a>
				</div>
			</section>

			<section class="col center">
				<!-- Theme Explorer (center) -->
				<div id="mpl-theme-slot" aria-label="Theme controls"></div>
			</section>

			<section class="col right">
				<!-- Explore menu (chevrons) -->
				<nav class="mpl-footer-explore" aria-label="Explore">
					<h4>Explore</h4>
					<div id="mpl-footer-explore"></div>
				</nav>
			</section>
		</div>

		<div class="bottom">
				<div>© <span id="yearFooter"></span> MindPayLink · Educational information only; not medical advice.</div>
				<div class="credit"><a id="backToTop" href="#top" aria-label="Back to top">Back to top ↑</a> · Designed by <b>Alkhadi M Koroma</b></div>
		</div>
	</div>
</footer>`;

	function applyFooter() {
		const footers = Array.from(document.querySelectorAll('footer'));
		if (footers.length) {
			footers.forEach((f, i) => { if (i > 0) f.remove(); });
			footers[0].outerHTML = FOOTER_HTML;
		} else {
			const d = document.createElement('div'); d.innerHTML = FOOTER_HTML; document.body.appendChild(d.firstElementChild);
		}

		// set year
		const y = document.getElementById('yearFooter');
		if (y) y.textContent = new Date().getFullYear();

		// back to top wiring
		const b = document.getElementById('backToTop') || document.querySelector('a[href="#top"]');
		if (b) b.addEventListener('click', e => { e.preventDefault(); try { (document.getElementById('top') || document.body).scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch { location.hash = '#top'; } });

		// Build Explore menu from header nav (idempotent)
		try {
			const mount = document.getElementById('mpl-footer-explore');
			if (mount && !mount.__mpl_built) {
				const q = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
				const findSubmenu = (el) => el && el.querySelector(':scope > .submenu, :scope > [role="menu"], :scope > ul, :scope > .dropdown-menu, :scope > ol');
				const nav = document.getElementById('mainNav');
				const groups = [];
				if (nav) Array.from(nav.children).forEach(node => { if (findSubmenu(node)) groups.push(node); });
				if (groups.length) {
					const closeOthers = (btn) => { q('.mpl-footer-toggle[aria-expanded="true"]', mount).forEach(bn => { if (bn !== btn) { bn.setAttribute('aria-expanded', 'false'); const n = bn.nextElementSibling; if (n) n.style.display = 'none'; } }); };
					groups.forEach((g, idx) => {
						const sec = document.createElement('section');
						const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mpl-footer-toggle'; btn.setAttribute('aria-expanded', 'false');
						let labelNode = g.querySelector(':scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
						const labelText = (labelNode && (labelNode.textContent || '').trim()) || ('Menu ' + (idx + 1));
						btn.innerHTML = labelText + ' <span aria-hidden="true">▾</span>';
						const list = document.createElement('ul'); list.setAttribute('data-mpl-footer-list', ''); list.style.display = 'none';
						const submenu = findSubmenu(g);
						if (submenu) {
							q('a[href], [data-href]', submenu).forEach(a => {
								const href = a.getAttribute('href') || a.getAttribute('data-href') || '#';
								const text = (a.textContent || '').trim() || href;
								const li = document.createElement('li'); const cl = document.createElement('a'); cl.href = href; cl.textContent = text; li.appendChild(cl); list.appendChild(li);
							});
						}
						const toggle = () => { const open = btn.getAttribute('aria-expanded') === 'true'; closeOthers(btn); btn.setAttribute('aria-expanded', String(!open)); list.style.display = open ? 'none' : ''; };
						btn.addEventListener('click', toggle);
						btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } if (e.key === 'Escape') { btn.setAttribute('aria-expanded', 'false'); list.style.display = 'none'; btn.focus(); } });
						sec.appendChild(btn); sec.appendChild(list); mount.appendChild(sec);
					});
					mount.__mpl_built = true;
				}
			}
		} catch { }

		// Inject a small Aims & Stories promo card on standalone pages (idempotent)
		try {
			const path = (location && location.pathname) || '';
			// Skip on homepage and the Aims page itself and About (already has a card)
			if (path === '/' || /\/index\.html$/.test(path) || /aims-objectives\.html$/.test(path) || /about\.html$/.test(path)) {
				// do nothing
			} else {
				const root = document.querySelector('main.container') || document.querySelector('main') || document.body;
				if (root) {
					if (!document.getElementById('aimsPromoCard')) {
						// Avoid if a direct link already exists in main content
						if (!root.querySelector('a[href*="aims-objectives.html"], a[data-href="aims-objectives.html"]')) {
							const card = document.createElement('div'); card.className = 'card'; card.id = 'aimsPromoCard';
							card.innerHTML = '<h2>Aims & Stories</h2><p class="muted">Read our aims, objectives, and 15 real success stories from the M‑Share community.</p><div class="actions" style="margin-top:8px"><a class="btn" data-href="aims-objectives.html" href="aims-objectives.html">Aims & Stories →</a></div>';
							const footerEl = document.getElementById('footer2025');
							if (footerEl && footerEl.parentNode) footerEl.parentNode.insertBefore(card, footerEl);
							else root.appendChild(card);
						}
					}
				}
			}
		} catch { }

		// Ensure Voicebot assets are present (idempotent)
		try {
			// CSS once
			if (!document.querySelector('link[href$="assets/css/voicebot.css"]')) {
				const l = document.createElement('link');
				l.rel = 'stylesheet';
				l.href = 'assets/css/voicebot.css';
				document.head.appendChild(l);
			}
			// JS once (module self-inits)
			if (!document.querySelector('script[src$="assets/js/voicebot.js"]')) {
				const s = document.createElement('script');
				s.src = 'assets/js/voicebot.js';
				s.defer = true;
				document.body.appendChild(s);
			}
		} catch { }
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFooter, { once: true });
	else applyFooter();
})();
