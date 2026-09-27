// Standalone vs embedded differences decided with Lior on 27-Sep-2026 (docs/EMBED-CONTRACT.md §8),
// plus the merged checkout's payment-intent and "book another" contracts.
import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, GROUPS_V2, groupJourney, toGroup, heading, choose, press, waitEvents } from './v2-driver.js';
import { MAP_URL, WA_PHONE } from '../../src/v2/config/site.js';
import { QUESTION_WA } from '../../src/v2/lib/messages.js';

const QUESTION_HREF = 'https://wa.me/' + WA_PHONE + '?text=' + encodeURIComponent(QUESTION_WA);
const location = (page) => page.locator('.eb-standalone-location');
const brandWA = (page) => page.locator('.eb-brand__wa');

test('standalone: address on the first screen only, directions via Maps, WhatsApp in the brand bar on every step', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await expect(location(page)).toBeVisible();
  await expect(location(page).getByRole('link', { name: /מפה ופרטי הגעה/ })).toHaveAttribute('href', MAP_URL);
  await expect(brandWA(page)).toHaveAttribute('href', QUESTION_HREF);
  await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[3]);
  await expect(location(page)).toHaveCount(0);
  await expect(brandWA(page)).toBeVisible();
  await press(page, 'חזרה');
  await press(page, 'חזרה');
  await expect(heading(page)).toHaveText('איך תרצו להתחיל?');
  await expect(location(page)).toBeVisible();
  // The standalone page never depends on the (pre-launch, password-protected) website for directions.
  expect(await page.locator('a[href*="contact.html"]').count()).toBe(0);
  expect(rec.events).toEqual([]);
});

test('standalone summary keeps the centred address; the top block stays hidden there', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await groupJourney(page, GROUPS_V2[0], { finish: 'review' });
  await waitEvents(page, rec, 2);
  await expect(location(page)).toHaveCount(0);
  await expect(page.locator('.eb-step--summary .eb-location')).toHaveCount(1);
  await expect(brandWA(page)).toBeVisible();
});

test('embedded: no standalone address block and no brand-bar WhatsApp link', async ({ page }) => {
  await openWidget(page, V2_URL + '?embed=1');
  await expect(heading(page)).toHaveText('איך תרצו להתחיל?');
  await expect(location(page)).toHaveCount(0);
  await expect(page.locator('.eb-brand')).toHaveCount(0);
  await expect(brandWA(page)).toHaveCount(0);
});

test('viewing the summary is not payment intent; middle-click on the payment link is, exactly once', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await groupJourney(page, GROUPS_V2[4], { finish: 'review' });
  await waitEvents(page, rec, 2);
  await page.waitForTimeout(500);
  expect(rec.events.map((e) => e.event)).toEqual(['lead_started', 'checkout_reached']);
  const pay = page.getByRole('link', { name: 'לחצו כאן לתשלום מאובטח' });
  // A right-click only opens the context menu: not activation.
  await pay.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(rec.events).toHaveLength(2);
  await pay.click({ button: 'middle' });
  await waitEvents(page, rec, 3);
  await pay.click({ button: 'middle' });
  await pay.click();
  await page.waitForTimeout(500);
  expect(rec.events.map((e) => e.event)).toEqual(['lead_started', 'checkout_reached', 'booking_selfbook']);
  expect(rec.events[2].submissionId).toBe(rec.events[1].submissionId);
  expect(rec.blocked).toEqual([]);
});

test('book another: restarts at the offer with no event, and the next journey gets a fresh submission', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await groupJourney(page, GROUPS_V2[0], { finish: 'selfbook' });
  await waitEvents(page, rec, 3);
  const first = rec.events[2].submissionId;
  await page.getByRole('button', { name: 'הזמנת שיעור נוסף', exact: true }).click();
  await expect(heading(page)).toHaveText('איך תרצו להתחיל?');
  await expect(heading(page)).toBeFocused();
  await page.waitForTimeout(300);
  expect(rec.events).toHaveLength(3);
  await expect(page.getByRole('radio', { name: '3 שיעורי היכרות', exact: true })).not.toBeChecked();
  // Second child, same contact details: a new submission, and paying for it is recorded again.
  await groupJourney(page, GROUPS_V2[1], { finish: 'selfbook' });
  await waitEvents(page, rec, 6);
  expect(rec.events.slice(3).map((e) => e.event)).toEqual(['lead_started', 'checkout_reached', 'booking_selfbook']);
  expect(rec.events[5].submissionId).not.toBe(first);
  expect([rec.events[2].categoryId, rec.events[5].categoryId]).toEqual(['kids-6-8', 'kids-9-11']);
});

test('book another before paying cancels the pending abandonment timer', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await groupJourney(page, GROUPS_V2[3], { finish: 'review' });
  await waitEvents(page, rec, 2);
  await page.getByRole('button', { name: 'הזמנת שיעור נוסף', exact: true }).click();
  await page.clock.fastForward(91_000);
  await page.waitForTimeout(300);
  expect(rec.events.map((e) => e.event)).toEqual(['lead_started', 'checkout_reached']);
  await choose(page, '3 שיעורי היכרות');
});
