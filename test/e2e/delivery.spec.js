// Front end 2.2: delivery the page can see. One case per behaviour; each is red on 2.1.0 (EB_V2_URL=/releases/v2.1.0/
// index.html), which posts no-cors, keeps nothing and says "sent" at once, and green on 2.2.
import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL } from './v2-driver.js';
import { deferred, outbox, expectQueued, expectOutboxEmpty, drain, submitPrivate, h2, SENDING, RETRYING, REFUSED, PRIVATE_SENT } from './delivery-helpers.js';

const URL = V2_URL + '?utm_source=delivery-test';
const OK = (ev) => ({ body: { ok: true, key: ev.submissionId, pending: false } });
const sends = (rec) => rec.events.filter((e) => e.event === 'private_inquiry');

test('the answer is read: "sent" appears only once ok arrives, and the outbox empties', async ({ page }) => {
  const held = deferred();
  const rec = await openWidget(page, URL, { answer: (ev) => held.promise.then(() => OK(ev)) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  await expect(h2(page)).toHaveText(SENDING);
  held.resolve();
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
  await expectOutboxEmpty(page);
  expect(sends(rec)).toHaveLength(1);
});

test('a timeout: the request is given up after 45 s and resent with the same submissionId', async ({ page }) => {
  const never = deferred();
  const rec = await openWidget(page, URL, { answer: (ev, n) => (n === 1 ? never.promise.then(() => OK(ev)) : OK(ev)) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  await drain(page, async () => sends(rec).length >= 2, { step: 15_000 });
  expect(new Set(sends(rec).map((e) => e.submissionId)).size).toBe(1);
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
  await expectOutboxEmpty(page);
  never.resolve();
});

test('a network error: shown as retrying, resent, then "sent"', async ({ page }) => {
  const held = deferred();
  const rec = await openWidget(page, URL, { answer: (ev, n) => (n === 1 ? { abort: true } : held.promise.then(() => OK(ev))) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  await drain(page, async () => sends(rec).length >= 2, { step: 3_000 });
  await expect(page.getByText(RETRYING)).toBeVisible();
  await expect(h2(page)).not.toHaveText(PRIVATE_SENT);
  held.resolve();
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
  expect(new Set(sends(rec).map((e) => e.submissionId)).size).toBe(1);
});

test('retry: true is resent with the same submissionId until it is taken', async ({ page }) => {
  const rec = await openWidget(page, URL, { answer: (ev, n) => (n < 3 ? { body: { ok: false, retry: true } } : OK(ev)) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  await drain(page, async () => sends(rec).length >= 3, { step: 6_000 });
  expect(new Set(sends(rec).map((e) => e.submissionId)).size).toBe(1);
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
  await expectOutboxEmpty(page);
});

test('pending: true is taken: "sent", never resent', async ({ page }) => {
  const held = deferred();
  const rec = await openWidget(page, URL, { answer: (ev) => held.promise.then(() => ({ body: { ok: true, key: ev.submissionId, pending: true } })) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  held.resolve();
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
  for (let i = 0; i < 6; i++) { await page.clock.fastForward(30_000); await page.waitForTimeout(50); }
  expect(sends(rec)).toHaveLength(1);
  await expectOutboxEmpty(page);
});

test('retry: false is never looped: one send, the refusal said plainly', async ({ page }) => {
  const rec = await openWidget(page, URL, { answer: () => ({ body: { ok: false, retry: false } }) });
  await submitPrivate(page);
  await expect(h2(page)).toHaveText(REFUSED);
  await expect(page.getByRole('link', { name: 'כתבו לנו בוואטסאפ' })).toBeVisible();
  for (let i = 0; i < 10; i++) { await page.clock.fastForward(30_000); await page.waitForTimeout(50); }
  expect(sends(rec)).toHaveLength(1);
  expect(await outbox(page)).toEqual([]);
});

test('an answer with no ok (v16) is bounded: never resent, never "sent"', async ({ page }) => {
  const rec = await openWidget(page, URL, { answer: (ev) => ({ body: { event: ev.event, results: {} } }) });
  await submitPrivate(page);
  await expect(h2(page)).toHaveText(REFUSED);
  for (let i = 0; i < 10; i++) { await page.clock.fastForward(30_000); await page.waitForTimeout(50); }
  expect(sends(rec)).toHaveLength(1);
});

test('an unsent event survives a reload and is resent with the same submissionId', async ({ page }) => {
  const never = deferred();
  const rec = await openWidget(page, URL, { answer: (ev, n) => (n === 1 ? never.promise.then(() => OK(ev)) : OK(ev)) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  await page.reload();
  await page.locator('#element-booking-widget-container *').first().waitFor();
  await expect.poll(() => sends(rec).length, { timeout: 8000 }).toBe(2);
  expect(new Set(sends(rec).map((e) => e.submissionId)).size).toBe(1);
  await expectOutboxEmpty(page);
  never.resolve();
});

test("v16.1's answer is accepted: ok with event and results reads as taken", async ({ page }) => {
  const held = deferred();
  const rec = await openWidget(page, URL, { answer: (ev) => held.promise.then(() => ({ body: { ok: true, key: ev.submissionId, pending: false, event: ev.event, results: { clickup: 'ok' } } })) });
  await submitPrivate(page);
  await expectQueued(page, 'private_inquiry');
  held.resolve();
  await expect(h2(page)).toHaveText(PRIVATE_SENT);
  for (let i = 0; i < 4; i++) { await page.clock.fastForward(30_000); await page.waitForTimeout(50); }
  expect(sends(rec)).toHaveLength(1);
  await expectOutboxEmpty(page);
});
