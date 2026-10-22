// Front end 2.2: honest screens. A done screen says "sent" only on ok: true; while the answer is held it says it is
// sending; WhatsApp still opens synchronously inside the click. Red on 2.1.0, which says "sent" at once.
import { test, expect } from '@playwright/test';
import { openWidget, collectOpened, OK_ANSWER } from './harness.js';
import { V2_URL, GROUPS_V2, groupJourney } from './v2-driver.js';
import { deferred, submitPrivate, h2, SENDING, REFUSED, PRIVATE_SENT, CALLBACK_SENT } from './delivery-helpers.js';

test('callback: WhatsApp opens inside the click; no "sent" while the answer is held; "sent" on ok', async ({ page }) => {
  const held = deferred();
  const rec = await openWidget(page, V2_URL, { answer: (ev) => (ev.event === 'booking_callback' ? held.promise.then(() => OK_ANSWER(ev)) : OK_ANSWER(ev)) });
  await groupJourney(page, GROUPS_V2[3], { finish: 'review' });
  await page.getByRole('button', { name: /בקשת שיחה חוזרת/ }).click();
  await collectOpened(page, rec);
  expect(rec.opened.some((u) => u.startsWith('https://wa.me/'))).toBe(true); // opened before any answer came
  await expect(h2(page)).toHaveText(SENDING);
  await page.waitForTimeout(500);
  await expect(h2(page)).not.toHaveText(CALLBACK_SENT);
  held.resolve();
  await expect(h2(page)).toHaveText(CALLBACK_SENT);
});

test('callback: a refusal is said plainly, with the WhatsApp way in', async ({ page }) => {
  await openWidget(page, V2_URL, { answer: (ev) => (ev.event === 'booking_callback' ? { body: { ok: false, retry: false } } : OK_ANSWER(ev)) });
  await groupJourney(page, GROUPS_V2[3], { finish: 'review' });
  await page.getByRole('button', { name: /בקשת שיחה חוזרת/ }).click();
  await expect(h2(page)).toHaveText(REFUSED);
  await expect(page.getByRole('link', { name: 'כתבו לנו בוואטסאפ' })).toBeVisible();
});

test('private inquiry: no "sent" while the answer is held; "sent" on ok', async ({ page }) => {
  const held = deferred();
  await openWidget(page, V2_URL, { answer: (ev) => held.promise.then(() => OK_ANSWER(ev)) });
  await submitPrivate(page);
  await expect(h2(page)).toHaveText(SENDING);
  await page.waitForTimeout(500);
  await expect(h2(page)).not.toHaveText(PRIVATE_SENT);
  held.resolve();
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
});
