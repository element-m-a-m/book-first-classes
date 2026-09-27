import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, choose, press } from './v2-driver.js';

test('group selection stays focused; full address is outside the steps', async ({page}) => {
  await openWidget(page, V2_URL);
  await expect(page.locator('.eb-offer .eb-badge')).toHaveText('49% הנחה!');
  await expect(page.locator('.eb-offer__compare')).toHaveCount(0);
  // Standalone address: first screen only (Lior, 27-Sep-2026; EMBED-CONTRACT §8). Summary repeats it.
  await expect(page.locator('.eb-standalone-location')).toContainText('המגינים');
  await choose(page,'3 שיעורי היכרות'); await press(page,'המשך');
  await expect(page.locator('.eb-step .eb-location')).toHaveCount(0);
  await expect(page.locator('.eb-standalone-location')).toHaveCount(0);
  await choose(page,'עבור הילד/ה שלי');
  await expect(page.locator('.eb-group-list .eb-price')).toHaveCount(0);
  await expect(page.locator('.eb-step').getByRole('heading',{name:'כתובת'})).toHaveCount(0);
  await choose(page,'ילדים 6-8'); await press(page,'המשך לבחירת מועדים');
  await expect(page.locator('.eb-date-location')).toHaveCount(0);
  await press(page,'לא מצאתי תאריך מתאים, אדלג ואתאם בהמשך');
  await choose(page,'יש מה לדעת');
  await expect(page.getByRole('textbox',{name:'פרטים',exact:true})).toBeVisible();
});

test('private format precedes service and the summary changes without stale card prices', async ({page}) => {
  await openWidget(page,V2_URL+'?offer=private');
  const format = await page.locator('fieldset').filter({has:page.locator('input[name="format"]')}).boundingBox();
  const goal = await page.locator('fieldset').filter({has:page.locator('input[name="goal"]')}).boundingBox();
  expect(format.y).toBeLessThan(goal.y);
  await expect(page.locator('.eb-group .eb-price')).toHaveCount(0);
  await choose(page,'אומנויות לחימה');
  await expect(page.locator('.eb-rates')).toContainText('250');
  await choose(page,'זוגי');
  await expect(page.locator('.eb-rates')).toContainText('360');
  await expect(page.locator('.eb-rates')).not.toContainText('250');
  await choose(page,'שיקום וחזרה לאימון');
  await expect(page.locator('.eb-rates')).toContainText('360');
  await choose(page,'אישי');
  await expect(page.locator('.eb-rates')).toContainText('300');
  await expect(page.locator('.eb-rates')).toContainText('240');
});
