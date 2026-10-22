// The tests stay offline: every webhook POST is answered by the harness, so none reaches the production /exec, and a
// request to any host the harness does not know is aborted and listed in `blocked`.
import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, GROUPS_V2, groupJourney, waitEvents } from './v2-driver.js';

test('a whole journey: every webhook POST answered locally, nothing unexpected requested', async ({ page }) => {
  const responses = [];
  page.on('response', (r) => { if (r.url().startsWith('https://script.google.com/')) responses.push(r.headers()['content-type'] || ''); });
  const rec = await openWidget(page, V2_URL);
  await groupJourney(page, GROUPS_V2[0], { finish: 'selfbook' });
  await waitEvents(page, rec, 3);
  await page.waitForTimeout(300);
  expect(rec.blocked).toEqual([]);
  expect(responses).toHaveLength(rec.events.length); // each one a harness answer, none from Google
  expect(responses.every((t) => t.startsWith('application/json'))).toBe(true);
});

test('a planted request to an unintercepted host is caught in `blocked`', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await page.evaluate(() => fetch('https://planted.invalid/macros/s/x/exec', { method: 'POST', body: '{}' }).catch(() => null));
  await expect.poll(() => rec.blocked).toContain('https://planted.invalid/macros/s/x/exec');
});
