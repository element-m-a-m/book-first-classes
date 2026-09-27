import {test,expect} from '@playwright/test';
import {openWidget} from './harness.js';
import {V2_URL,choose,pickDays,fillContact} from './v2-driver.js';

test('top navigation validates and preserves the group flow without skipping decisions',async({page})=>{
 const rec=await openWidget(page,V2_URL+'?embed=1');
 const next=page.locator('.eb-stepper__forward');
 await expect(next).toBeDisabled();
 await choose(page,'3 שיעורי היכרות');await next.click();
 await expect(next).toBeDisabled();
 await choose(page,'עבורי');await choose(page,'בוגרים 16-37');await next.click();
 await expect(next).toBeDisabled();
 await pickDays(page,1);await next.click();
 await next.click();
 await expect(page.getByLabel('שם מלא')).toBeFocused();expect(rec.events).toHaveLength(0);
 await fillContact(page);await next.click();
 await expect(page.locator('h2.eb-h2')).toHaveText('סיכום והרשמה');
 await expect(next).toHaveCount(0);
 await expect(page.locator('.eb-stepper__progress')).toHaveAttribute('aria-label','שלב 5 מתוך 5');
 await page.getByRole('button',{name:'חזרה',exact:true}).click();
 await expect(page.getByLabel('שם מלא')).not.toHaveValue('');
});

test('private top navigation requires choices and leaves explicit inquiry submission',async({page})=>{
 await openWidget(page,V2_URL+'?embed=1&offer=private');
 const next=page.locator('.eb-stepper__forward');
 await expect(next).toBeDisabled();
 await choose(page,'אומנויות לחימה');await next.press('Enter');
 await expect(page.locator('h2.eb-h2')).toHaveText('פרטים ליצירת קשר');
 await expect(next).toHaveCount(0);
 await expect(page.getByRole('button',{name:'שליחת פנייה',exact:true})).toBeVisible();
});
