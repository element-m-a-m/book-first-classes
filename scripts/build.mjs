// Build a widget tree into a self-contained, hash-named release folder.
//
//   node scripts/build.mjs <tree> [--out <dir>]
//     tree = v1 (modularised legacy, S2) | v2 (redesign, S4)
//
// Output: <out>/index.html + app.<sha256-10>.js, and manifest.json listing every file's sha256.
// Asset URLs are relative, so the same folder works at /book-first-classes/ and the website's /booking/.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { build } from 'esbuild';

const args = process.argv.slice(2);
const tree = args[0];
const outIdx = args.indexOf('--out');
const out = outIdx > -1 ? args[outIdx + 1] : `.cache/build-${tree}`;
const TREES = {
  v1: { entry: 'src/v1/main.jsx', shell: 'src/v1/shell.html' },
};
if (!TREES[tree]) { console.error(`unknown tree "${tree}" (known: ${Object.keys(TREES).join(', ')})`); process.exit(1); }

export const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');

const res = await build({
  entryPoints: [TREES[tree].entry],
  bundle: true, write: false, format: 'iife', minify: true, target: 'es2017',
  jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof', logLevel: 'warning',
});
const js = res.outputFiles[0].contents;
const jsName = `app.${sha(js).slice(0, 10)}.js`;
const html = fs.readFileSync(TREES[tree].shell, 'utf8').replace('%%APP%%', jsName);
if (html.includes('%%')) throw new Error('unreplaced placeholder in shell');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, jsName), js);
fs.writeFileSync(path.join(out, 'index.html'), html);
const files = {};
for (const f of fs.readdirSync(out).sort()) files[f] = sha(fs.readFileSync(path.join(out, f)));
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ tree, files }, null, 2) + '\n');
console.log(`built ${tree} -> ${out} (${jsName}, ${(js.length / 1024).toFixed(1)} KB)`);
