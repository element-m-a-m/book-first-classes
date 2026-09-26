import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, choose, press } from './v2-driver.js';

test('group address stays anchored and class cards do not repeat package prices', async ({page}) => {
  await openWidget(page, V2_URL);
  await expect(page.locator('.eb-offer .eb-badge')).toHaveText('49% הנחה!');
  await expect(page.locator('.eb-offer__compare')).toHaveCount(0);
  await choose(page,'3 שיעורי היכרות'); await press(page,'המשך');
  const y = (await page.locator('.eb-location-section').boundingBox()).y;
  await choose(page,'עבור הילד/ה שלי');
  await expect(page.locator('.eb-group-list .eb-price')).toHaveCount(0);
  expect((await page.locator('.eb-location-section').boundingBox()).y).toBeCloseTo(y,0);
  await expect(page.getByRole('heading',{name:'כתובת'})).toBeVisible();
  await choose(page,'ילדים 6-8'); await press(page,'המשך לבחירת מועדים');
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
