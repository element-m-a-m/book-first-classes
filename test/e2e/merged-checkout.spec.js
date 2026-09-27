import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, GROUPS_V2, groupJourney, press, choose, waitEvents } from './v2-driver.js';

test('one checkout: direct payment, no extra screen, no duplicate intent or abandonment after payment', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await page.evaluate(() => { window.dataLayer = []; });
  await groupJourney(page, GROUPS_V2[3], { finish: 'review' });
  await waitEvents(page, rec, 2);
  expect(rec.events.map(e => e.event)).toEqual(['lead_started', 'checkout_reached']);
  expect(rec.payments).toEqual([]);
  const pay = page.getByRole('link', { name: 'לחצו כאן לתשלום מאובטח' });
  await expect(pay).toBeVisible();
  await expect(page.locator('.eb-step .eb-card')).toHaveCount(1);
  await expect(page.locator('.eb-step .eb-location')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /מה להביא לשיעור הראשון/ })).toHaveCount(1);
  const order = await page.locator('.eb-step').evaluate(el => {
    const y = selector => el.querySelector(selector).getBoundingClientRect().y;
    return [y('a.eb-btn--primary'), y('button.eb-btn--wa-outline'), y('.eb-card'), y('.eb-location')];
  });
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await pay.click();
  await waitEvents(page, rec, 3);
  await expect.poll(() => rec.payments.length).toBe(1);
  await expect(page.locator('.eb-h2')).toHaveText('סיכום והרשמה');
  await pay.click();
  await page.clock.fastForward(91_000);
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave', { clientY: 0 })));
  await expect(page.locator('.eb-pop')).toHaveCount(0);
  expect(rec.events.map(e => e.event)).toEqual(['lead_started', 'checkout_reached', 'booking_selfbook']);
  expect(await page.evaluate(() => window.dataLayer.filter(e => e.event === 'Pending_Payment_Gateway').length)).toBe(1);
  // Editing an earlier answer starts a fresh submission while the payment URL remains usable.
  await press(page, 'חזרה');
  await choose(page, 'יש מה לדעת');
  await press(page, 'המשך לסיכום');
  await waitEvents(page, rec, 5);
  await pay.click();
  await waitEvents(page, rec, 6);
  expect(rec.events[5].event).toBe('booking_selfbook');
  expect(rec.events[5].submissionId).not.toBe(rec.events[2].submissionId);
  expect(rec.blocked).toEqual([]);
});

for (const [group, destination] of [
  [GROUPS_V2[0], 'https://1pa.co/TvavILvPZj'],
  [GROUPS_V2[3], 'https://1pa.co/6nz790XZmG'],
]) {
  test(`single-class payment keeps the correct destination for ${group.id}`, async ({ page }) => {
    const rec = await openWidget(page, V2_URL);
    await groupJourney(page, group, { offer: 'single', finish: 'review' });
    const pay = page.getByRole('link', { name: 'לחצו כאן לתשלום מאובטח' });
    await expect(pay).toHaveAttribute('href', destination);
    await pay.focus();
    await page.keyboard.press('Enter');
    await waitEvents(page, rec, 3);
    await expect.poll(() => rec.payments).toEqual([destination]);
    expect(rec.events[2].event).toBe('booking_selfbook');
    expect(rec.blocked).toEqual([]);
  });
}
