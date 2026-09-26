// Bundle one source module (JSX, JSON imports, React) with esbuild and import it, so node:test can exercise
// the same code the browser runs.
import { build } from 'esbuild';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const cache = new Map();
export async function load(entry) {
  if (cache.has(entry)) return cache.get(entry);
  const out = path.resolve('.cache', 'unit', entry.replace(/[\\/]/g, '_') + '.mjs');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic',
    loader: { '.woff2': 'empty', '.webp': 'empty', '.css': 'empty' }, logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const mod = await import(pathToFileURL(out).href + '?t=' + Date.now());
  cache.set(entry, mod);
  return mod;
}
