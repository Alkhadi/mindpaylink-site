(() => {
	const FOOTER_HTML = ';
			// Skip on homepage and the Aims page itself and About (already has a card)
			if (path === '/' || /\/index\.html$/.test(path) || /aims-objectives\.html$/.test(path) || /about\.html$/.test(path)) {
				// do nothing
			} else {
				const root = document.querySelector('main.container') || document.querySelector('main') || document.body;
				if (root) {
					if (!document.getElementById('aimsPromoCard')) {
						// Avoid if a direct link already exists in main content
							const card = document.createElement('div'); card.className = 'card'; card.id = 'aimsPromoCard';
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
