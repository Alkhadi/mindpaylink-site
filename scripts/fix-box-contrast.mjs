import fs from 'fs';

const FILE = 'box-breathing.html';
let s = fs.readFileSync(FILE, 'utf8');
const marker = '/* __contrast_fix_2025__ */';

// 1) Add scope attribute to <body> (idempotent)
if (!/data-contrast-scope=["']box-breathing["']/.test(s)) {
  s = s.replace(/<body(\s[^>]*)?>/i, (m, g='') => {
    // If body already has attributes, append; otherwise add fresh attribute.
    if (/data-contrast-scope=/i.test(m)) return m;
    return `<body${g || ''} data-contrast-scope="box-breathing">`;
  });
}

// 2) Inject scoped CSS before </head> (idempotent, uses marker)
if (!s.includes(marker)) {
  const css = `
<style>
${marker}
/* All rules limited to this page via [data-contrast-scope="box-breathing"] */
[data-contrast-scope="box-breathing"] {
  color: #e7eef9;
  background: #0b1220; /* dark base */
}

/* Panels / cards in setup area */
[data-contrast-scope="box-breathing"] .card,
[data-contrast-scope="box-breathing"] .panel,
[data-contrast-scope="box-breathing"] .setup,
[data-contrast-scope="box-breathing"] .ui-panel,
[data-contrast-scope="box-breathing"] .box,
[data-contrast-scope="box-breathing"] .bb-setup,
[data-contrast-scope="box-breathing"] .bb-card {
  background: rgba(22,33,51,0.96);
  border: 1px solid #334155; /* slate-600 */
  color: #e7eef9;
  box-shadow: 0 2px 12px rgba(0,0,0,0.35);
}

/* Headings, labels, helper text */
[data-contrast-scope="box-breathing"] h1,
[data-contrast-scope="box-breathing"] h2,
[data-contrast-scope="box-breathing"] h3,
[data-contrast-scope="box-breathing"] h4,
[data-contrast-scope="box-breathing"] .field-label,
[data-contrast-scope="box-breathing"] label { color: #e7eef9; }

[data-contrast-scope="box-breathing"] .muted,
[data-contrast-scope="box-breathing"] .subtle,
[data-contrast-scope="box-breathing"] .hint,
[data-contrast-scope="box-breathing"] small,
[data-contrast-scope="box-breathing"] .tip { color: #c2cddb; }

/* Quick session bar & common rows */
[data-contrast-scope="box-breathing"] .quick-session,
[data-contrast-scope="box-breathing"] .quick-session * { color: #e7eef9; }

/* Inputs & selects */
[data-contrast-scope="box-breathing"] input[type="text"],
[data-contrast-scope="box-breathing"] input[type="number"],
[data-contrast-scope="box-breathing"] input[type="search"],
[data-contrast-scope="box-breathing"] input[type="email"],
[data-contrast-scope="box-breathing"] input[type="tel"],
[data-contrast-scope="box-breathing"] select,
[data-contrast-scope="box-breathing"] textarea {
  color: #e7eef9;
  background: #0f172a;           /* slate-900 */
  border: 1px solid #334155;
  outline: none;
}
[data-contrast-scope="box-breathing"] input::placeholder,
[data-contrast-scope="box-breathing"] textarea::placeholder { color: #9fb2c7; }
[data-contrast-scope="box-breathing"] select option {
  color: #e7eef9; background: #0f172a;
}

/* Disabled stays readable */
[data-contrast-scope="box-breathing"] :disabled,
[data-contrast-scope="box-breathing"] [disabled] {
  color: #b5c2d6 !important;
  background: #1b2537 !important;
  border-color: #41526b !important;
  opacity: 1 !important;
}

/* Buttons */
[data-contrast-scope="box-breathing"] .btn,
[data-contrast-scope="box-breathing"] button,
[data-contrast-scope="box-breathing"] .button {
  color: #0b1220; background: #22c55e; border: 1px solid #16a34a;
}
[data-contrast-scope="box-breathing"] .btn.secondary,
[data-contrast-scope="box-breathing"] button.secondary {
  color: #e7eef9; background: #1f2937; border: 1px solid #334155;
}
[data-contrast-scope="box-breathing"] #startBtn,
[data-contrast-scope="box-breathing"] .start,
[data-contrast-scope="box-breathing"] .btn-start { color: #0b1220; background: #22c55e; }
[data-contrast-scope="box-breathing"] #stopBtn,
[data-contrast-scope="box-breathing"] .stop,
[data-contrast-scope="box-breathing"] .btn-stop  { color: #e7eef9; background: #ef4444; border: 1px solid #b91c1c; }

/* Slider */
[data-contrast-scope="box-breathing"] input[type="range"] {
  -webkit-appearance: none; width: 100%; height: 2px; background: #3b4a62; border-radius: 2px;
}
[data-contrast-scope="box-breathing"] input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; background: #22c55e;
  border-radius: 50%; border: 1px solid #128146;
}
[data-contrast-scope="box-breathing"] input[type="range"]::-moz-range-track { height: 2px; background: #3b4a62; border: none; }
[data-contrast-scope="box-breathing"] input[type="range"]::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%; background: #22c55e; border: 1px solid #128146;
}

/* Keyboard focus */
[data-contrast-scope="box-breathing"] :where(a,button,input,select,textarea,[tabindex]):focus {
  outline: 2px solid #60a5fa; outline-offset: 2px;
}

/* Translucent overlays never drop below AA */
[data-contrast-scope="box-breathing"] .translucent,
[data-contrast-scope="box-breathing"] .backdrop-blur,
[data-contrast-scope="box-breathing"] .frosted {
  background-color: rgba(17,24,39,0.92) !important;
  color: #e7eef9 !important;
}
</style>`;
  s = s.replace(/<\/head>/i, css + '\n</head>');
}

fs.writeFileSync(FILE, s, 'utf8');
console.log('✓ Contrast fix injected into', FILE);
