import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, choose, press, pickDays } from './v2-driver.js';

const card = (page, name) => page.locator('label.eb-choice').filter({has:page.getByRole('radio',{name,exact:true})});
const radio = (page, name) => page.getByRole('radio',{name,exact:true});

test('offer cards toggle by pointer and Space; first-step copy is concise', async ({page}) => {
  await openWidget(page,V2_URL);
  await expect(page.locator('.eb-stepper__label')).toHaveText('שלב 1 מתוך 5');
  await expect(page.locator('.eb-step .eb-hint')).toHaveCount(0);
  for(const name of ['3 שיעורי היכרות','שיעור היכרות בודד','אימון אישי / זוגי']) {
    await card(page,name).click();
    await expect(radio(page,name)).toBeChecked();
    await card(page,name).click();
    await expect(radio(page,name)).not.toBeChecked();
    await expect(page.getByRole('button',{name:'המשך',exact:true})).toBeDisabled();
  }
  await radio(page,'3 שיעורי היכרות').focus();
  await page.keyboard.press('Space');
  await expect(radio(page,'3 שיעורי היכרות')).toBeChecked();
  await page.keyboard.press('Space');
  await expect(radio(page,'3 שיעורי היכרות')).not.toBeChecked();
});

test('clearing groups and audiences clears dates and blocks progression', async ({page}) => {
  await openWidget(page,V2_URL);
  await choose(page,'3 שיעורי היכרות'); await press(page,'המשך');
  await choose(page,'עבור הילד/ה שלי'); await choose(page,'ילדים 6-8');
  await press(page,'המשך לבחירת מועדים'); await pickDays(page,1); await press(page,'חזרה');
  await card(page,'ילדים 6-8').click();
  await expect(radio(page,'ילדים 6-8')).not.toBeChecked();
  await expect(page.getByRole('button',{name:'המשך לבחירת מועדים',exact:true})).toBeDisabled();
  await choose(page,'ילדים 6-8'); await press(page,'המשך לבחירת מועדים');
  await expect(page.locator('.eb-cal__day.is-selected')).toHaveCount(0);
  await press(page,'חזרה'); await card(page,'עבור הילד/ה שלי').click();
  await expect(page.locator('.eb-group-list')).toHaveCount(0);
  await choose(page,'עבור הילד/ה שלי');
  await expect(page.locator('input[name="group"]:checked')).toHaveCount(0);
  await choose(page,'ילדים 6-8'); await press(page,'חזרה');
  await card(page,'3 שיעורי היכרות').click(); await choose(page,'3 שיעורי היכרות'); await press(page,'המשך');
  await expect(page.locator('input[name="audience"]:checked')).toHaveCount(0);
});

test('private format and goal can be cleared without showing a stale price', async ({page}) => {
  await openWidget(page,V2_URL+'?offer=private');
  await choose(page,'אומנויות לחימה');
  await expect(page.locator('.eb-rates')).toContainText('250');
  await card(page,'אישי').click();
  await expect(page.locator('.eb-rates')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'המשך',exact:true})).toBeDisabled();
  await choose(page,'זוגי'); await expect(page.locator('.eb-rates')).toContainText('360');
  await card(page,'אומנויות לחימה').click();
  await expect(page.locator('.eb-rates')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'המשך',exact:true})).toBeDisabled();
});

test('medical choices return to unanswered without losing entered text', async ({page}) => {
  await openWidget(page,V2_URL+'?offer=single&group=kids-6-8');
  await press(page,'המשך לבחירת מועדים'); await press(page,'לא מצאתי תאריך מתאים, אדלג ואתאם בהמשך');
  await choose(page,'יש מה לדעת'); await page.getByLabel('פרטים',{exact:true}).fill('בדיקת ממשק מקומית');
  await card(page,'יש מה לדעת').click();
  await expect(page.locator('input[name="med"]:checked')).toHaveCount(0);
  await press(page,'המשך לסיכום');
  await expect(page.locator('#eb-med-err')).toBeVisible();
  await choose(page,'יש מה לדעת');
  await expect(page.getByLabel('פרטים',{exact:true})).toHaveValue('בדיקת ממשק מקומית');
  await choose(page,'הכל תקין'); await card(page,'הכל תקין').click();
  await expect(page.locator('input[name="med"]:checked')).toHaveCount(0);
});
