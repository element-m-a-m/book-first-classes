// Shared e2e harness: an offline, deterministic page with every external side effect captured.
//
// - Webhook POSTs (script.google.com) are fulfilled locally and recorded - nothing leaves the machine.
// - window.open (WhatsApp) is stubbed and recorded.
// - unpkg React is served from node_modules (18.3.1, the version unpkg resolves for react@18);
//   fonts and github.io images are served locally or emptied. Any other external request is
//   aborted and recorded in `blocked`, so a test can assert the page made no unexpected calls.
// - The clock starts at a fixed Asia/Jerusalem instant and flows naturally (page.clock.install).
import fs from 'fs';
import path from 'path';

export const FIXED_NOW = new Date('2026-10-05T10:00:00+03:00'); // Monday
export const TEST_LEAD = { name: 'בדיקה אוטומטית', phone: '050-0000000' };

const UMD = {
  'https://unpkg.com/react@18/umd/react.production.min.js': 'node_modules/react/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js': 'node_modules/react-dom/umd/react-dom.production.min.js',
};

export async function openWidget(page, url, { now = FIXED_NOW } = {}) {
  const rec = { events: [], opened: [], blocked: [], steps: [] };
  await page.clock.install({ time: now });
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (u) => { window.__opened.push(String(u)); return null; };
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const req = route.request(), u = req.url();
    if (u.startsWith('https://script.google.com/')) {
      rec.events.push(JSON.parse(req.postData() || '{}'));
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
    }
    if (UMD[u]) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(UMD[u]) });
    if (u.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (u.startsWith('https://element-m-a-m.github.io/book-first-classes/')) {
      const local = decodeURIComponent(u.slice('https://element-m-a-m.github.io/book-first-classes/'.length));
      if (fs.existsSync(local)) return route.fulfill({ status: 200, body: fs.readFileSync(local), contentType: 'image/png' });
    }
    rec.blocked.push(u);
    return route.abort();
  });
  await page.goto(url);
  await page.locator('#element-booking-widget-container *').first().waitFor();
  return rec;
}

/** Wait out the 200 ms step transition (setTimeout + opacity) and let React commit. */
export async function settle(page) {
  await page.waitForTimeout(260);
  await page.waitForFunction(() => {
    const s = document.querySelector('.widget-scroll');
    return !s || getComputedStyle(s).opacity === '1';
  });
}

const norm = (t) => t
  .replace(/\d+%/g, 'N%')
  .replace(/⏳ מכינים את עמוד התשלום\.\.\.|✅ עמוד התשלום מוכן!/g, '<progress>')
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

export async function snap(page, rec, step) {
  await settle(page);
  rec.steps.push({ step, text: norm(await page.locator('#element-booking-widget-container').innerText()) });
}

export async function collectOpened(page, rec) {
  rec.opened = await page.evaluate(() => window.__opened.slice());
}

/** Indices (among all <button>s) of calendar day cells that are currently clickable. */
export async function pickableDays(page) {
  return page.evaluate(() => [...document.querySelectorAll('button')]
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.style.minHeight === '48px' && b.style.cursor === 'pointer')
    .map(({ i }) => i));
}

export async function pickDays(page, n) {
  for (let k = 0; k < n; k++) {
    const idx = await pickableDays(page);
    // choose every other available day so picks spread across weeks
    const unselected = [];
    for (const i of idx) {
      const selected = await page.locator('button').nth(i).evaluate((b) => b.style.border.startsWith('2px'));
      if (!selected) unselected.push(i);
    }
    if (!unselected.length) throw new Error(`no pickable day for pick ${k + 1}`);
    await page.locator('button').nth(unselected[Math.min(unselected.length - 1, 1)]).click();
  }
}

export function goldenPath(tree, name) { return path.join('test', 'e2e', 'golden', tree, `${name}.json`); }
