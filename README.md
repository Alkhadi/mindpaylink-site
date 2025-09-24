
# M Share • Pro

A polished, mobile-first profile landing page with:
- A consistent sticky navigation bar across all pages.
- A professional card layout with accessible, responsive design.
- An editable **Wellbeing link** tile (same look & feel as AC Number) placed **above** AC Number.
- A **Share** bottom sheet that lets you:
  - Share **text** with all contact fields + social links and your profile URL.
  - Generate and save/share a **PNG** share image (1200×630) with key details.
- A Money page with copy-to-clipboard and quick bank app openers.
- A PDF page that links to `/assets/m_share_profile.pdf` (drop your file there).
- PWA (installable) via `manifest.webmanifest` and a light service worker cache.

## URL Parameters (short keys)
Use these to populate the profile:
```
?n=Name&ph=+447...&em=you@mail.com&s=https://site.com&a=SE15 3BG&av=https://...jpg&
ac=12345678&sc=12-34-56&ib=GB...&r=M%20SHARE&x=https://x.com/...&ig=https://instagram.com/...&
yt=https://youtube.com/@...&ln=https://linkedin.com/in/...&wb=https://your-wellbeing-link
```

The app also accepts the old long keys (e.g., `name`, `phone`, `email`, etc.) for backwards compatibility.

## Files
- `index.html` — Profile landing page
- `bank.html` — Send/Receive money
- `wellbeing.html` — Wellbeing tips
- `pdf.html` — Download profile PDF
- `style.css` — Global theme & components
- `app.js` — Routing, param parsing, share sheet, PNG generator
- `manifest.webmanifest` — PWA
- `sw.js` — Minimal offline cache
- `assets/m_share_profile.pdf` — (put your PDF here)

## Notes
- PNG generation uses Canvas with CORS-enabled avatar URLs. If your avatar host blocks CORS, the image will render without the avatar (everything else is included).
- Web Share API (with files) support varies by platform/browser. When unavailable, the app falls back to copying text or downloading the PNG.
