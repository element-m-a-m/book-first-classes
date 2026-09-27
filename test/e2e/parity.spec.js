// S2 gate: the modular v1 build must behave exactly like the live legacy page.
// Each journey runs on both builds; payloads, WhatsApp URLs and per-step widget text must be identical,
// and both must match the golden recorded from the legacy page (UPDATE_GOLDEN=1 re-records).
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { openWidget, goldenPath } from './harness.js';
import { JOURNEYS } from './legacy-journeys.js';

const BUILDS = {
  legacy: '/releases/v1.0.0-legacy/index.html',
  v1: '/.cache/build-v1/index.html',
};

for (const j of JOURNEYS) {
  test(`parity: ${j.name}`, async ({ browser }) => {
    const out = {};
    for (const [build, url] of Object.entries(BUILDS)) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const rec = await openWidget(page, url);
      await j.run(page, rec);
      out[build] = rec;
      await ctx.close();
    }
    const gp = goldenPath('legacy', j.name);
    if (process.env.UPDATE_GOLDEN) {
      fs.mkdirSync(path.dirname(gp), { recursive: true });
      fs.writeFileSync(gp, JSON.stringify(out.legacy, null, 2) + '\n');
    }
    expect(out.legacy.blocked, 'legacy made unexpected network calls').toEqual([]);
    expect(out.v1.blocked, 'v1 made unexpected network calls').toEqual([]);
    expect(out.legacy.events.length, 'journey produced no webhook events').toBeGreaterThan(0);
    expect(out.v1).toEqual(out.legacy);
    // The goldens predate the harness's payment-tab recorder: no legacy journey may open a payment tab,
    // and everything the golden did record must match exactly.
    const { payments, ...recorded } = out.legacy;
    expect(payments, 'legacy journeys never open a payment tab').toEqual([]);
    expect(recorded).toEqual(JSON.parse(fs.readFileSync(gp, 'utf8')));
  });
}
