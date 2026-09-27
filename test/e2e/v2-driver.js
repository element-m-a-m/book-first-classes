// Driver for the v2 flow. Chooses by visible text, advances with the real buttons.
import { expect } from '@playwright/test';
import { TEST_LEAD } from './harness.js';

export const V2_URL = '/.cache/build-v2/index.html';

export const GROUPS_V2 = [
  { id: 'kids-6-8', label: 'ילדים 6-8', aud: 'עבור הילד/ה שלי', kids: true, dows: [0, 3], start: '17:00', end: '17:45' },
  { id: 'kids-9-11', label: 'ילדים 9-11', aud: 'עבור הילד/ה שלי', kids: true, dows: [0, 3], start: '17:45', end: '18:45' },
  { id: 'youth-12-15', label: 'נוער 12-15', aud: 'עבור הילד/ה שלי', dows: [0, 3], start: '17:15', end: '18:45' },
  { id: 'adults-16-37', label: 'בוגרים 16-37', aud: 'עבורי', dows: [0, 3], start: '19:00', end: '21:00' },
  { id: 'adults-38-58', label: 'כושר ולחימה לגילאי 40+', aud: 'עבורי', dows: [1, 4], start: '18:15', end: '19:45' },
  { id: 'movement-class', label: 'מובמנט', aud: 'עבורי', dows: [2, 5] },
  { id: 'strength', label: 'כוח וגמישות', aud: 'עבורי', dows: [2, 5] },
];

export const heading = (page) => page.locator('h2.eb-h2');
// Pick a card by its radio's accessible name (the card title), exactly - the way a screen reader user would.
export const choose = async (page, text) => {
  const radio = page.getByRole('radio', { name: text, exact: true });
  if (!await radio.isChecked()) await page.locator('label.eb-choice', { has: radio }).click();
};
export const press = (page, name) => page.getByRole('button', { name, exact: true }).click();

export async function openDays(page) {
  return page.locator('button.eb-cal__day.is-open:not([aria-disabled="true"])');
}
export async function pickDays(page, n) {
  for (let i = 0; i < n; i++) {
    const days = page.locator('button.eb-cal__day.is-open:not(.is-selected):not([aria-disabled="true"])');
    await days.nth(Math.min(1, (await days.count()) - 1)).click();
  }
}

export async function toGroup(page, offerText, g) {
  await choose(page, offerText);
  await press(page, 'המשך');
  await expect(heading(page)).toHaveText('עבור מי השיעור?');
  await choose(page, g.aud);
  await choose(page, g.label);
  await press(page, 'המשך לבחירת מועדים');
  await expect(heading(page)).toHaveText('בחרו מועדים');
}

export async function fillContact(page, { medical = null } = {}) {
  await page.getByLabel('שם מלא').fill(TEST_LEAD.name);
  await page.getByLabel('טלפון נייד').fill(TEST_LEAD.phone);
  if (medical) { await choose(page, 'יש מה לדעת'); await page.getByLabel('פרטים', { exact: true }).fill(medical); } else await choose(page, 'הכל תקין');
}

export async function groupJourney(page, g, { offer = 'trial3', dates = offer === 'single' ? 1 : 3, finish = 'selfbook', medical = null } = {}) {
  await toGroup(page, offer === 'single' ? 'שיעור היכרות בודד' : '3 שיעורי היכרות', g);
  if (dates === 'skip') await page.getByRole('button', { name: 'לא מצאתי תאריך מתאים, אדלג ואתאם בהמשך' }).click();
  else { await pickDays(page, dates); await press(page, 'המשך'); }
  await expect(heading(page)).toHaveText('פרטי קשר לשמירת מקום');
  await fillContact(page, { medical });
  await press(page, 'המשך לסיכום');
  await expect(heading(page)).toHaveText('סיכום והרשמה');
  if (finish === 'selfbook') { await page.getByRole('link', { name: 'לחצו כאן לתשלום מאובטח' }).click(); await expect(heading(page)).toHaveText('סיכום והרשמה'); }
  if (finish === 'callback') { await page.getByRole('button', { name: /בקשת שיחה חוזרת/ }).click(); await expect(heading(page)).toHaveText('הפנייה נשלחה בהצלחה!'); }
}

export async function privateJourney(page, goal, format, note = '') {
  await choose(page, 'אימון אישי / זוגי');
  await press(page, 'המשך');
  await expect(heading(page)).toHaveText('איזה אימון מתאים לכם?');
  await choose(page, goal);
  await choose(page, format);
  await press(page, 'המשך');
  await expect(heading(page)).toHaveText('פרטים ליצירת קשר');
  await page.getByLabel('שם מלא').fill(TEST_LEAD.name);
  await page.getByLabel('טלפון נייד').fill(TEST_LEAD.phone);
  if (note) await page.getByLabel('הערות (לא חובה)').fill(note);
  await press(page, 'שליחת פנייה');
  await expect(heading(page)).toHaveText('הפנייה נשלחה');
}

/** Wait until the serial sender has flushed n events. */
export async function waitEvents(page, rec, n) {
  await expect.poll(() => rec.events.length, { timeout: 5000 }).toBeGreaterThanOrEqual(n);
}
