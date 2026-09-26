// Parity gate for the restored legacy source (S1).
//
// Proves three things and exits non-zero if any fails:
//   1. HISTORY  - the readable JSX at 1153b608 compiles byte-for-byte to a19c150's inline script
//                 (esbuild 0.17.19, --loader=jsx --minify --target=es2017). Establishes the toolchain.
//   2. SHELL    - legacy/shell-pre.html + shell-post.html equal the HTML around the live script.
//   3. SOURCE   - legacy/app.jsx (1153b608 + the three 03-May edits) is equivalent to the live
//                 releases/v1.0.0-legacy script. The live file was hand-patched at the minified level,
//                 so it keeps a19c150's identifier names and one `;` esbuild would write as `,`. Both
//                 sides are therefore re-minified by the same esbuild, then compared token by token:
//                 all text must match; identifiers may differ only as a consistent bijection of
//                 short (<=3 char) minifier names. See legacy/equiv.mjs.
//
// Mutation evidence (26-Sep-2026): reverting `>=` to `>`, changing a loop bound, changing one Hebrew
// letter in a rendered string, and the real 99d4bf5 predecessor each make check 3 fail.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { transformSync } from 'esbuild';
import { split } from '../legacy/split.mjs';
import { equivalent } from '../legacy/equiv.mjs';

const OPTS = { loader: 'jsx', minify: true, target: 'es2017' };
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 });
let failed = 0;
const report = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  - ' + detail : ''}`); if (!ok) failed++; };

// 1. HISTORY
const h1153 = git('show', '1153b608:index.html');
const TAG = '<script type="text/babel">';
const g = h1153.indexOf(TAG) + TAG.length;
const jsx1153 = h1153.slice(g, h1153.indexOf('</script>', g));
const a19 = split(git('show', 'a19c1503:index.html')).script;
report('history: 1153b608 JSX -> a19c150 byte-exact', '\n' + transformSync(jsx1153, OPTS).code + '\n' === a19);

// 2. SHELL
const live = split(fs.readFileSync('releases/v1.0.0-legacy/index.html', 'utf8'));
const pre = fs.readFileSync('legacy/shell-pre.html', 'utf8'), post = fs.readFileSync('legacy/shell-post.html', 'utf8');
report('shell: pre/post HTML byte-exact', pre === live.pre && post === live.post);

// 3. SOURCE
const ours = transformSync(fs.readFileSync('legacy/app.jsx', 'utf8'), OPTS).code;
const canon = s => transformSync(s, { loader: 'js', minify: true, target: 'es2017' }).code;
const r = equivalent(canon(ours), canon(live.script));
report('source: legacy/app.jsx == live v1.0.0-legacy (canonical, rename-only)', r.ok, r.ok ? `${r.renamed} minifier names renamed` : r.why);

// Build artefact for inspection (same shell, fresh compile)
fs.mkdirSync('.cache', { recursive: true });
fs.writeFileSync('.cache/legacy-build.html', pre + '\n' + ours + '\n' + post);

process.exitCode = failed ? 1 : 0;
