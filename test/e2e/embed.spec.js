// Embed contract (plan §3.5): v2 messages, URL params, parent context, exit intent, origin checks, no PII,
// and the v1 messages the current website's booking.js depends on.
import { test, expect } from '@playwright/test';
import { VERSION } from '../../src/v2/config/site.js';
import { openWidget, TEST_LEAD } from './harness.js';
import { GROUPS_V2, press, choose, pickDays, fillContact, waitEvents } from './v2-driver.js';

const V2_HOST = '/test/e2e/pages/embed-v2.html';
const msgs = (page) => page.evaluate(() => window.__msgs.map((m) => m.data));
const v2 = (list, type) => list.filter((d) => d && d.ns === 'element:booking' && d.v === 2 && (!type || d.type === type));

test('v2: ready/resize carry height, the iframe fits the content, no internal scroll', async ({ page }) => {
  await openWidget(page, V2_HOST, { host: true });
  const frame = page.frameLocator('#w');
  await expect(frame.locator('h2')).toHaveText('איך תרצו להתחיל?');
  await expect.poll(async () => v2(await msgs(page), 'ready').length).toBe(1);
  const ready = v2(await msgs(page), 'ready')[0];
  expect(ready.version).toBe(VERSION);
  expect(ready.height).toBeGreaterThan(300);
  // legacy v1 messages are sent too, for the current website
  expect((await msgs(page)).some((d) => d && d.type === 'element:booking:ready' && d.version === 1)).toBeTruthy();
  const fit = await page.evaluate(() => {
    const f = document.getElementById('w');
    const doc = f.contentDocument.documentElement;
    return { frame: f.getBoundingClientRect().height, content: doc.scrollHeight };
  });
  expect(Math.abs(fit.frame - fit.content)).toBeLessThanOrEqual(2);
  // no brand header when embedded
  await expect(frame.locator('.eb-brand')).toHaveCount(0);
});

test('v2: URL params preselect offer and group (not skip); utm travels; messages never carry personal data', async ({ page }) => {
  const rec = await openWidget(page, V2_HOST + '?src=' + encodeURIComponent('/.cache/build-v2/index.html?embed=1&offer=trial3&group=youth&utm_source=site&utm_campaign=autumn&price=1'), { host: true });
  const frame = page.frameLocator('#w');
  await expect(frame.locator('h2')).toHaveText('עבור מי השיעור?');
  await expect(frame.getByRole('radio', { name: 'נוער 12-15', exact: true })).toBeChecked();
  await frame.getByRole('button', { name: 'המשך לבחירת מועדים' }).click();
  for (let i = 0; i < 2; i++) await frame.locator('button.eb-cal__day.is-open:not(.is-selected)').nth(1).click();
  await frame.getByRole('button', { name: 'המשך', exact: true }).click();
  await frame.getByLabel('שם מלא').fill(TEST_LEAD.name);
  await frame.getByLabel('טלפון נייד').fill(TEST_LEAD.phone);
  await frame.locator('label.eb-choice', { has: frame.getByRole('radio', { name: 'הכל תקין' }) }).click();
  await frame.getByRole('button', { name: 'המשך לסיכום' }).click();
  await frame.getByRole('button', { name: 'מעבר למערכת ההזמנה' }).click();
  await waitEvents(page, rec, 3);
  const p = rec.events[1];
  expect(p.source).toBe('embed');
  expect(p.categoryId).toBe('youth-12-15');
  expect(p.price).toBe(99);
  expect(p.utm).toBe('site');
  expect(p.utm_campaign).toBe('autumn');
  const all = await msgs(page);
  const steps = v2(all, 'step').map((d) => d.step);
  expect(steps).toEqual(['group', 'dates', 'contact', 'summary', 'done']);
  expect(v2(all, 'complete')).toEqual([{ ns: 'element:booking', v: 2, type: 'complete', outcome: 'selfbook' }]);
  const text = JSON.stringify(all);
  for (const pii of [TEST_LEAD.name, '0500000000', '050-0000000', '+972500000000', '500000000']) expect(text).not.toContain(pii);
});

test('v2: parent setContext applies before interaction, is ignored after it', async ({ page }) => {
  await openWidget(page, V2_HOST, { host: true });
  const frame = page.frameLocator('#w');
  await expect(frame.locator('h2')).toHaveText('איך תרצו להתחיל?');
  await page.evaluate(() => window.sendToChild({ ns: 'element:booking', v: 2, type: 'setContext', offer: 'single', group: 'forty' }));
  await expect(frame.locator('h2')).toHaveText('עבור מי השיעור?');
  await expect(frame.getByRole('radio', { name: 'כושר ולחימה לגילאי 40+' })).toBeChecked();
  await expect(frame.locator('.eb-group .eb-price')).toHaveCount(0);
  await frame.locator('label.eb-choice', { has: frame.getByRole('radio', { name: 'מובמנט', exact: true }) }).click();
  await page.evaluate(() => window.sendToChild({ ns: 'element:booking', v: 2, type: 'setContext', offer: 'trial3', group: 'kids-6-8' }));
  await expect.poll(async () => v2(await msgs(page), 'contextIgnored').length).toBe(1);
  await expect(frame.getByRole('radio', { name: 'מובמנט', exact: true })).toBeChecked();
  await frame.getByRole('button', { name: 'המשך לבחירת מועדים' }).click();
  await expect(frame.locator('.eb-bar')).toHaveCount(0);
  await expect(frame.locator('h2')).toHaveText('בחרו מועדים');
});

test('v2: exitIntent from the parent shows the WhatsApp prompt inline, once', async ({ page }) => {
  await openWidget(page, V2_HOST + '?src=' + encodeURIComponent('/.cache/build-v2/index.html?embed=1&offer=trial3'), { host: true });
  const frame = page.frameLocator('#w');
  await expect(frame.locator('h2')).toHaveText('עבור מי השיעור?');
  await page.evaluate(() => window.sendToChild({ ns: 'element:booking', v: 2, type: 'exitIntent' }));
  await expect(frame.getByText('מתלבטים?')).toBeVisible();
  await expect(frame.locator('.eb-scrim')).toHaveCount(0); // inline, not an overlay inside the iframe
  await frame.getByRole('button', { name: 'לא תודה, אחזור להזמנה' }).click();
  await page.evaluate(() => window.sendToChild({ ns: 'element:booking', v: 2, type: 'exitIntent' }));
  await page.waitForTimeout(300);
  await expect(frame.getByText('מתלבטים?')).toHaveCount(0);
});

test('v2: an unknown parent origin gets no messages and cannot set context', async ({ page }) => {
  // parent on http://localhost, widget on http://127.0.0.1: different origins, parent not in the allowlist
  await openWidget(page, 'http://localhost:4173' + V2_HOST + '?src=' + encodeURIComponent('http://127.0.0.1:4173/.cache/build-v2/index.html?embed=1'), { host: true });
  const frame = page.frameLocator('#w');
  await expect(frame.locator('h2')).toHaveText('איך תרצו להתחיל?');
  await page.evaluate(() => window.sendToChild({ ns: 'element:booking', v: 2, type: 'setContext', offer: 'private' }, '*'));
  await page.waitForTimeout(400);
  await expect(frame.locator('h2')).toHaveText('איך תרצו להתחיל?');
  expect(await msgs(page)).toEqual([]);
});

test('v1: the current website booking.js loads the v2 widget, sizes it and marks it ready', async ({ page }) => {
  const rec = await openWidget(page, '/test/e2e/pages/embed-v1.html?utm_source=website-test', { host: true });
  const widget = page.locator('.booking-widget');
  await expect(widget).toHaveAttribute('data-state', 'ready', { timeout: 10000 });
  await expect(page.locator('.booking-widget__status')).toBeHidden();
  const h = await page.locator('iframe').evaluate((f) => f.getBoundingClientRect().height);
  expect(h).toBeGreaterThan(300);
  const frame = page.frameLocator('iframe');
  await frame.locator('label.eb-choice', { has: frame.getByRole('radio', { name: '3 שיעורי היכרות' }) }).click();
  await frame.getByRole('button', { name: 'המשך', exact: true }).click();
  await expect(frame.locator('h2')).toHaveText('עבור מי השיעור?');
  await expect.poll(() => page.locator('iframe').evaluate((f) => f.getBoundingClientRect().height)).not.toBe(h); // resize reached the parent
  expect(rec.blocked).toEqual([]);
});

test('website v2 parent script (handoff): carries the carousel choice, sizes, hands over later choices until the visitor starts', async ({ page }) => {
  const rec = await openWidget(page, '/test/e2e/pages/website-v2.html?utm_source=website&utm_campaign=autumn', { host: true });
  await expect(page.locator('.booking-widget')).toHaveAttribute('data-state', 'ready', { timeout: 10000 });
  const frame = page.frameLocator('iframe');
  // the carousel showed "שיעור בודד" when the widget loaded -> offer=single in the iframe URL
  await expect(frame.locator('h2')).toHaveText('עבור מי השיעור?');
  expect(await page.locator('iframe').getAttribute('src')).toMatch(/offer=single/);
  expect(await page.locator('iframe').getAttribute('src')).toMatch(/utm_campaign=autumn/);
  // visitor flips the carousel to 3 שיעורים before touching the widget -> setContext applies
  await page.getByRole('button', { name: '3 שיעורים' }).click();
  const h1 = await page.locator('iframe').evaluate((f) => f.getBoundingClientRect().height);
  expect(h1).toBeGreaterThan(100);
  const contentHeight = await frame.locator('.eb').evaluate(el => Math.ceil(el.getBoundingClientRect().height));
  expect(Math.abs(h1 - contentHeight)).toBeLessThanOrEqual(2);
  await frame.getByRole('button', { name: 'חזרה' }).click(); // first interaction inside the widget
  await expect(frame.getByRole('radio', { name: '3 שיעורי היכרות' })).toBeChecked();
  // after the visitor starts using the widget, the carousel no longer changes it
  await page.getByRole('button', { name: 'אישי / זוגי' }).click();
  await page.waitForTimeout(300);
  await expect(frame.getByRole('radio', { name: '3 שיעורי היכרות' })).toBeChecked();
  await expect(frame.getByRole('radio', { name: 'אימון אישי / זוגי' })).not.toBeChecked();
  expect(rec.blocked).toEqual([]);
});
