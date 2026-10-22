// Front end 2.2: a child booking asks two full names (T5, variant B: two titled groups, one full-name field per
// person, the hint under each), validates both, and posts schema 3. Red on 2.1.0 (one name field, schema 2).
import { test, expect } from '@playwright/test';
import { openWidget, TEST_LEAD } from './harness.js';
import { V2_URL, GROUPS_V2, toGroup, pickDays, press, heading, choose, groupJourney, waitEvents } from './v2-driver.js';

const HINT = 'שם פרטי ושם משפחה';
const CHILD = 'שם מלא של הילד/ה';
const PARENT = 'שם מלא של ההורה';

async function toContact(page, g) {
  await toGroup(page, '3 שיעורי היכרות', g);
  await pickDays(page, 1);
  await press(page, 'המשך');
  await expect(heading(page)).toHaveText('פרטי קשר לשמירת מקום');
}

test('a child booking asks the child\'s and the parent\'s full names, validates both, and posts schema 3', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await toContact(page, GROUPS_V2[0]);
  await expect(page.getByRole('group', { name: 'פרטי הילד/ה' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'פרטי ההורה' })).toBeVisible();
  await expect(page.getByText(HINT, { exact: true })).toHaveCount(2);
  await expect(page.getByLabel(CHILD)).toHaveAccessibleDescription(HINT);
  await page.getByLabel(CHILD).fill(TEST_LEAD.name);
  await page.getByLabel('טלפון נייד').fill(TEST_LEAD.phone);
  await choose(page, 'הכל תקין');
  await press(page, 'המשך לסיכום');
  // The parent's name is missing: an error under it, focus on it, nothing sent.
  await expect(page.getByLabel(PARENT)).toBeFocused();
  await expect(page.getByLabel(PARENT)).toHaveAttribute('aria-invalid', 'true');
  await page.waitForTimeout(300);
  expect(rec.events).toEqual([]);
  await page.getByLabel(PARENT).fill(TEST_LEAD.parentName);
  await press(page, 'המשך לסיכום');
  await expect(heading(page)).toHaveText('סיכום והרשמה');
  await waitEvents(page, rec, 2);
  for (const e of rec.events) {
    expect(e.schema).toBe(3);
    expect(e.name).toBe(TEST_LEAD.name);
    expect(e.parentName).toBe(TEST_LEAD.parentName);
    expect(e.audience).toBe('child');
  }
});

test('an adult booking keeps one name field, with the hint, and sends no parentName', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await toContact(page, GROUPS_V2[3]);
  await expect(page.getByLabel(PARENT)).toHaveCount(0);
  await expect(page.getByLabel('שם מלא', { exact: true })).toHaveAccessibleDescription(HINT);
  await page.getByLabel('שם מלא', { exact: true }).fill('ש');
  await page.getByLabel('טלפון נייד').fill(TEST_LEAD.phone);
  await choose(page, 'הכל תקין');
  await press(page, 'המשך לסיכום');
  await expect(page.getByText('* נא להזין שם מלא')).toBeVisible(); // the 2-character minimum stays
  await page.getByLabel('שם מלא', { exact: true }).fill('שמעון'); // one word is accepted (Lior, 14-OCT 23:14)
  await press(page, 'המשך לסיכום');
  await waitEvents(page, rec, 2);
  expect(rec.events[0].schema).toBe(3);
  expect('parentName' in rec.events[0]).toBe(false);
});

test('"book another" for a second child keeps the parent\'s name and phone, and clears the child\'s', async ({ page }) => {
  const rec = await openWidget(page, V2_URL);
  await groupJourney(page, GROUPS_V2[0], { finish: 'selfbook' });
  await waitEvents(page, rec, 3);
  await page.getByRole('button', { name: 'הזמנת שיעור נוסף', exact: true }).click();
  await toContact(page, GROUPS_V2[1]);
  await expect(page.getByLabel(PARENT)).toHaveValue(TEST_LEAD.parentName);
  await expect(page.getByLabel('טלפון נייד')).toHaveValue(TEST_LEAD.phone);
  await expect(page.getByLabel(CHILD)).toHaveValue('');
});
