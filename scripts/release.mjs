// Pinned releases (plan §3.2, decision 5).
//
//   node scripts/release.mjs 2.0.0                 build v2 into releases/v2.0.0 (refuses to overwrite a release)
//   node scripts/release.mjs 2.0.0 --root [dir]    also publish that release to the site root (default: repo root,
//                                                  i.e. what GitHub Pages serves) - S6, only with approval
//   node scripts/release.mjs --verify [dir]        verify the root against releases/<version>/manifest.json
//   node scripts/release.mjs --retire 2.0.0        retire an old release: its index.html becomes a redirect to the
//                                                  current page (query and hash kept); refuses the current version
//
// A retired release keeps its app files and its manifest.json, the record of the bytes it shipped; only its page is
// replaced, so an old ad, bio or QR link lands on the current page and never goes dark. The original page stays
// readable at the release's tag in the public repo.
// The root keeps a small release.json { version, files } so the next publish removes exactly the old app files.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const args = process.argv.slice(2);
const argAfter = (flag) => { const i = args.indexOf(flag); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };

function verify(rootDir) {
  const rel = JSON.parse(fs.readFileSync(path.join(rootDir, 'release.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(`releases/v${rel.version}/manifest.json`, 'utf8'));
  const bad = [];
  for (const [f, h] of Object.entries(manifest.files)) {
    const p = path.join(rootDir, f);
    if (!fs.existsSync(p)) bad.push(`missing ${f}`);
    else if (sha(p) !== h) bad.push(`hash differs ${f}`);
  }
  if (bad.length) { console.error(`root does NOT match v${rel.version}:\n  ${bad.join('\n  ')}`); process.exit(1); }
  console.log(`root matches v${rel.version} (${Object.keys(manifest.files).length} files, sha256)`);
}

if (args[0] === '--verify') { verify(argAfter('--verify') || '.'); process.exit(0); }

export const RETIRED_PAGE = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="robots" content="noindex">
  <title>Element | אומנויות לחימה ותנועה</title>
  <script>location.replace('../../' + location.search + location.hash);</script>
  <meta http-equiv="refresh" content="0; url=../../">
</head>
<body><noscript><a href="../../">Element | אומנויות לחימה ותנועה</a></noscript></body>
</html>
`;

if (args[0] === '--retire') {
  const v = args[1];
  if (!/^\d+\.\d+\.\d+(-[a-z]+)?$/.test(v || '')) { console.error('usage: release.mjs --retire <x.y.z[-suffix]>'); process.exit(1); }
  const page = `releases/v${v}/index.html`;
  if (!fs.existsSync(page)) { console.error(`${page} does not exist`); process.exit(1); }
  const current = JSON.parse(fs.readFileSync('release.json', 'utf8')).version;
  if (v === current) { console.error(`v${v} is the release the site serves now: retire it only after a newer release is at the root`); process.exit(1); }
  if (fs.readFileSync(page, 'utf8') === RETIRED_PAGE) { console.log(`v${v} is already retired`); process.exit(0); }
  fs.writeFileSync(page, RETIRED_PAGE);
  console.log(`retired v${v}: ${page} now redirects to the current page`);
  process.exit(0);
}

const version = args[0];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) { console.error('usage: release.mjs <x.y.z> [--root [dir]] | --verify [dir]'); process.exit(1); }
const dir = `releases/v${version}`;
if (fs.existsSync(dir)) { console.error(`${dir} exists - releases are immutable; bump the version`); process.exit(1); }
execFileSync(process.execPath, ['scripts/build.mjs', 'v2', '--out', dir], { stdio: 'inherit' });
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
if (manifest.version !== version) { fs.rmSync(dir, { recursive: true }); console.error(`build says ${manifest.version}, asked for ${version} - update VERSION`); process.exit(1); }
console.log(`released ${dir}`);

if (args.includes('--root')) {
  const root = argAfter('--root') || '.';
  const prevPath = path.join(root, 'release.json');
  if (fs.existsSync(prevPath)) {
    for (const f of JSON.parse(fs.readFileSync(prevPath, 'utf8')).files) if (f !== 'index.html') fs.rmSync(path.join(root, f), { force: true });
  }
  for (const f of Object.keys(manifest.files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.copyFileSync(path.join(dir, f), path.join(root, f));
  }
  fs.writeFileSync(prevPath, JSON.stringify({ version, files: Object.keys(manifest.files) }, null, 2) + '\n');
  verify(root);
}
