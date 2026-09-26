// node scripts/sync-booking-widget.mjs 2.0.0
import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const v = process.argv[2]; if (!/^\d+\.\d+\.\d+$/.test(v || '')) throw new Error('usage: sync-booking-widget.mjs <x.y.z>');
const base = `https://raw.githubusercontent.com/element-m-a-m/book-first-classes/v${v}/releases/v${v}/`;
const get = async (f) => { const r = await fetch(base + f); if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); };
const manifest = JSON.parse((await get('manifest.json')).toString('utf8'));
if (manifest.version !== v || manifest.embedContract !== 2) throw new Error('unexpected manifest');
const out = 'site/booking';
const files = {};
for (const [f, h] of Object.entries(manifest.files)) {
  const buf = await get(f);
  if (crypto.createHash('sha256').update(buf).digest('hex') !== h) throw new Error(`hash mismatch: ${f}`);
  files[f] = buf;
}
fs.rmSync(out, { recursive: true, force: true });
for (const [f, buf] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.writeFileSync(path.join(out, f), buf); }
fs.writeFileSync(path.join(out, 'release.json'), JSON.stringify({ version: v, commit: manifest.commit, files: manifest.files }, null, 2) + '\n');
console.log(`site/booking <- v${v} (${Object.keys(files).length} files, sha256 verified)`);
