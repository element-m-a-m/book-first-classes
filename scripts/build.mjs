// Build a widget tree into a self-contained, hash-named release folder.
//
//   node scripts/build.mjs <tree> [--out <dir>]
//     tree = v1 (modularised legacy, S2) | v2 (redesign, S4)
//
// Output: <out>/index.html + hashed app JS/CSS/assets, and manifest.json listing every file's sha256.
// Every URL is relative, so the same folder works at /book-first-classes/ and at the website's /booking/.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { build } from 'esbuild';

const args = process.argv.slice(2);
const tree = args[0];
const outIdx = args.indexOf('--out');
const out = outIdx > -1 ? args[outIdx + 1] : `.cache/build-${tree}`;
const TREES = {
  v1: { entry: 'src/v1/main.jsx', shell: 'src/v1/shell.html' },
  v2: { entry: 'src/v2/main.jsx', shell: 'src/v2/shell.html', version: '2.0.0', embedContract: 2, payloadSchema: 2 },
};
const T = TREES[tree];
if (!T) { console.error(`unknown tree "${tree}" (known: ${Object.keys(TREES).join(', ')})`); process.exit(1); }

export const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

if (tree === 'v2') {
  // Closed dates must cover at least 12 months ahead of the build (renewal reminder, plan §3.6).
  const { horizon } = JSON.parse(fs.readFileSync('src/v2/config/closures.generated.json', 'utf8'));
  const minEnd = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  if (horizon < minEnd) { console.error(`closures horizon ${horizon} is < 12 months away (${minEnd}) - run scripts/closures.mjs --to <later>`); process.exit(1); }
}

fs.rmSync(out, { recursive: true, force: true });
const res = await build({
  entryPoints: { app: T.entry }, outdir: out, bundle: true, write: true, format: 'iife', minify: true, target: 'es2017',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof', logLevel: 'warning',
  entryNames: '[name].[hash]', assetNames: 'assets/[name].[hash]', loader: { '.woff2': 'file', '.webp': 'file' },
  metafile: true,
});
const outputs = Object.keys(res.metafile.outputs).map((p) => path.relative(out, p).replace(/\\/g, '/'));
const pick = (re) => outputs.find((p) => re.test(p));
const rep = { '%%APP%%': pick(/^app\..*\.js$/), '%%CSS%%': pick(/^app\..*\.css$/), '%%LOGO%%': pick(/logo-96\..*\.webp$/), '%%FONT_HE%%': pick(/Heebo-hebrew\..*\.woff2$/) };
let html = fs.readFileSync(T.shell, 'utf8');
for (const [k, v] of Object.entries(rep)) if (html.includes(k)) { if (!v) throw new Error(`no output for ${k}`); html = html.split(k).join(v); }
if (html.includes('%%')) throw new Error('unreplaced placeholder in shell');
fs.writeFileSync(path.join(out, 'index.html'), html);

const files = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (e.name !== 'manifest.json') files[path.relative(out, p).replace(/\\/g, '/')] = sha(fs.readFileSync(p));
});
walk(out);
let commit = '';
try { commit = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e) { /* not a repo */ }
const manifest = { tree, version: T.version || null, commit, embedContract: T.embedContract || 1, payloadSchema: T.payloadSchema || 1,
  files: Object.fromEntries(Object.entries(files).sort()) };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const kb = (f) => (fs.statSync(path.join(out, f)).size / 1024).toFixed(1);
console.log(`built ${tree} -> ${out}: ${Object.keys(files).map((f) => `${f} ${kb(f)}KB`).join(', ')}`);
