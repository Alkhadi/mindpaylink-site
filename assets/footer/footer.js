(() => {
	const FOOTER_HTML = `
<footer id="footer2025" class="footer-2025 mpl-footer-v3">
	<div class="mpl-footer-wrap">
		<div class="mpl-footer-grid" role="navigation" aria-label="Site footer">
			<section class="col brand">
				<div class="brandline">
					<span class="logo" aria-hidden="true">M</span>
					<div><b>M Share</b>
						<div class="muted">Quiet, practical tools for mental health and wellbeing.</div>
					</div>
				</div>
				<div class="mpl-pay" aria-label="Support links">
					<a class="pay-link" data-href="coffee.html" target="_blank" rel="noopener">Support Us</a>
					<a class="pay-link" href="https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00" target="_blank" rel="noopener">☕ Support Us</a>
				</div>
			</section>

			<section class="col center">
				<div id="mpl-theme-slot" aria-label="Theme controls"></div>
			</section>

			<section class="col right">
				<nav class="mpl-footer-explore" aria-label="Explore">
					<h4>Explore</h4>
					<div id="mpl-footer-explore"></div>
				</nav>
			</section>
		</div>

		<div class="bottom">
			<div>© <span id="yearFooter"></span> MindPayLink · Educational information only; not medical advice.</div>
			<div class="credit">Designed by <b>Alkhadi M Koroma</b></div>
		</div>
	</div>
</footer>`;

	function setYear() { const y = document.getElementById('yearFooter'); if (y) y.textContent = new Date().getFullYear(); }

	function buildFooterExplore() {
		const mount = document.getElementById('mpl-footer-explore'); if (!mount) return;
		if (mount.__built) return; mount.__built = true;
		mount.innerHTML = '';
		const q = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
		const findSubmenu = (el) => el && el.querySelector(':scope > .submenu, :scope > [role="menu"], :scope > ul, :scope > .dropdown-menu, :scope > ol');
		const groups = (() => {
			const navs = q('header nav, nav[role="navigation"], nav.primary, .navbar nav, nav');
			const set = new Set();
			navs.forEach(nav => {
				const ul = nav.querySelector(':scope > ul');
				const kids = ul ? Array.from(ul.children) : Array.from(nav.children);
				kids.forEach(node => { const sub = findSubmenu(node); if (sub) set.add(node); });
			});
			return Array.from(set);
		})();
		if (!groups.length) { mount.parentElement?.style && (mount.parentElement.style.display = 'none'); return; }

		function closeOthers(exceptBtn) {
			q('.mpl-footer-toggle[aria-expanded="true"]', mount).forEach(btn => {
				if (btn === exceptBtn) return;
				btn.setAttribute('aria-expanded', 'false');
				const nxt = btn.nextElementSibling; if (nxt) nxt.style.display = 'none';
			});
		}

		groups.forEach((g, idx) => {
			const sec = document.createElement('section');
			const btn = document.createElement('button');
			btn.type = 'button'; btn.className = 'mpl-footer-toggle'; btn.setAttribute('aria-expanded', 'false');
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

			const toggle = () => {
				const open = btn.getAttribute('aria-expanded') === 'true';
				closeOthers(btn);
				btn.setAttribute('aria-expanded', String(!open));
				list.style.display = open ? 'none' : '';
			};
			btn.addEventListener('click', toggle);
			btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } if (e.key === 'Escape') { btn.setAttribute('aria-expanded', 'false'); list.style.display = 'none'; btn.focus(); } });
			sec.appendChild(btn); sec.appendChild(list); mount.appendChild(sec);
		});
	}

	function applyFooter() {
		const footers = Array.from(document.querySelectorAll('footer'));
		if (footers.length) {
			footers.forEach((f, i) => { if (i > 0) f.remove(); });
			footers[0].outerHTML = FOOTER_HTML;
		} else {
			const d = document.createElement('div'); d.innerHTML = FOOTER_HTML; document.body.appendChild(d.firstElementChild);
		}
		setYear();
		// Build Explore after header/nav is available or soon after
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildFooterExplore, { once: true });
		else setTimeout(buildFooterExplore, 0);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyFooter, { once: true });
	else applyFooter();
})();
