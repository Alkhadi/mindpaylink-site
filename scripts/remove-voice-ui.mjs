import fs from 'fs';
import path from 'path';

const root = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'assets']); // HTML files are in root

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walk(p, out);
    } else if (ent.isFile() && /\.html?$/i.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function removePanelsAndRefs(html) {
  let s = html;
  let changed = false;

  const removals = [];

  // 1) Remove Voice Coach / Voice Assistant sections by id
  const ids = [
    'mshare-voicebot',
    'voice-coach', 'voiceCoach',
    'voice-assistant', 'voiceAssistant', 'voiceAssistantPanel',
    'voicebot', 'voiceBot',
    'audioUnlockBanner'
  ];
  for (const id of ids) {
    // Remove <section|div ... id="ID" ...> ... </section|div>
    const re = new RegExp(
      `<(section|div)([^>]*?\\s(?:id|name)=(["'])${id}\\3[^>]*)>[\\s\\S]*?<\\/\\1>`,
      'gi'
    );
    if (re.test(s)) {
      s = s.replace(re, '');
      changed = true;
      removals.push(`block#${id}`);
    }
  }

  // 2) Remove <script>/<link> that load voice-related assets (keep sound-kit.js intact)
  const scriptKillers = [
    /<script[^>]+src=["'][^"']*voice[-_]?coach[^"']*\.js[^>]*>\s*<\/script>\s*/gi,
    /<script[^>]+src=["'][^"']*voice[-_]?assistant[^"']*\.js[^>]*>\s*<\/script>\s*/gi,
    /<script[^>]+src=["'][^"']*voicebot[^"']*\.js[^>]*>\s*<\/script>\s*/gi
  ];
  const linkKillers = [
    /<link[^>]+href=["'][^"']*voice[-_]?coach[^"']*\.css[^>]*>\s*/gi,
    /<link[^>]+href=["'][^"']*voice[-_]?assistant[^"']*\.css[^>]*>\s*/gi,
    /<link[^>]+href=["'][^"']*voicebot[^"']*\.css[^>]*>\s*/gi
  ];

  for (const re of [...scriptKillers, ...linkKillers]) {
    if (re.test(s)) {
      s = s.replace(re, '');
      changed = true;
      removals.push('voice-assets');
    }
  }

  // 3) Remove the previously injected asset-audio player block (marker or function names),
  //    and strip all data-say-asset attributes.
  const markers = [
    /<script[^>]*>[\s\S]*?__mshare_asset_player__[\s\S]*?<\/script>\s*/gi,  // preferred marker
    /<script[^>]*>[\s\S]*?sayAsset[\s\S]*?<\/script>\s*/gi                  // fallback if marker not present
  ];
  for (const re of markers) {
    if (re.test(s)) {
      s = s.replace(re, '');
      changed = true;
      removals.push('asset-audio-script');
    }
  }

  // Remove any data-say-asset="…"
  if (/\sdata-say-asset=/i.test(s)) {
    s = s.replace(/\sdata-say-asset=(["']).*?\1/gi, '');
    changed = true;
    removals.push('data-say-asset');
  }

  // 4) Clean up stray empty lines left by removals
  s = s.replace(/\n{3,}/g, '\n\n');

  return { out: s, changed, removals };
}

function main() {
  const files = walk(root);
  let edits = 0;
  for (const f of files) {
    const before = fs.readFileSync(f, 'utf8');
    const { out, changed, removals } = removePanelsAndRefs(before);
    if (changed) {
      fs.writeFileSync(f, out, 'utf8');
      console.log(`✓ cleaned ${path.relative(root, f)}  :: ${removals.join(', ')}`);
      edits++;
    }
  }
  if (!edits) console.log('• No changes needed (voice UI already absent).');
  else console.log(`\nDone. Modified ${edits} file(s).`);
}

main();
