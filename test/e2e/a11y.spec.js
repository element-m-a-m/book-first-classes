// Accessibility + layout at five viewports (plan §4): axe (WCAG 2.2 AA tags) on every screen of both paths,
// no horizontal scroll, and screenshots for the review contact sheet (SCREENS=1).
import fs from 'fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openWidget } from './harness.js';
import { V2_URL, GROUPS_V2, choose, press, pickDays, fillContact, heading } from './v2-driver.js';

const VIEWPORTS = [[320, 700], [360, 780], [390, 844], [768, 1024], [1280, 900]];
const SHOT_DIR = '../deliverables/screens';
const SHOTS = process.env.SCREENS === '1';
const report = [];

async function audit(page, label, w, mode) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  report.push({ w, mode, label, serious: bad.map((v) => `${v.id} (${v.nodes.length})`), other: res.violations.filter((v) => !bad.includes(v)).map((v) => v.id) });
  expect(bad.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), `${label} @${w}`).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${label} @${w}: horizontal scroll`).toBeLessThanOrEqual(0);
  if (SHOTS && [390, 1280].includes(w)) {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: `${SHOT_DIR}/${mode}-${w}-${label}.png`, fullPage: true });
  }
}

for (const [w, h] of VIEWPORTS) {
  test(`standalone @${w}px: every screen passes axe, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openWidget(page, V2_URL);
    await audit(page, '01-offer', w, 'standalone');
    await choose(page, '3 שיעורי היכרות');
    await press(page, 'המשך');
    await choose(page, 'עבור הילד/ה שלי');
    await choose(page, GROUPS_V2[0].label);
    await audit(page, '02-group', w, 'standalone');
    await press(page, 'המשך לבחירת מועדים');
    await pickDays(page, 3);
    await audit(page, '03-dates', w, 'standalone');
    await press(page, 'המשך');
    await press(page, 'המשך לסיכום');
    await audit(page, '04-contact-errors', w, 'standalone');
    await fillContact(page);
    await press(page, 'המשך לסיכום');
    await expect(heading(page)).toHaveText('סיכום והרשמה');
    await audit(page, '05-summary', w, 'standalone');
    await press(page, 'מעבר למערכת ההזמנה');
    await audit(page, '06-done', w, 'standalone');
    await page.goto(V2_URL);
    await choose(page, 'אימון אישי / זוגי');
    await press(page, 'המשך');
    await choose(page, 'שיקום וחזרה לאימון');
    await choose(page, 'זוגי');
    await audit(page, '07-private-goal', w, 'standalone');
    await press(page, 'המשך');
    await audit(page, '08-private-contact', w, 'standalone');
    await page.getByLabel('שם מלא').fill('בדיקה אוטומטית');
    await page.getByLabel('טלפון נייד').fill('050-0000000');
    await press(page, 'שליחת פנייה');
    await audit(page, '09-private-done', w, 'standalone');
  });
}

for (const w of [390, 1280]) {
  test(`embedded @${w}px: host page with the widget passes axe`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await openWidget(page, '/test/e2e/pages/embed-v2.html?src=' + encodeURIComponent('/.cache/build-v2/index.html?embed=1&offer=trial3&group=adults'), { host: true });
    const frame = page.frameLocator('#w');
    await expect(frame.locator('h2')).toHaveText('עבור מי השיעור?');
    await page.waitForTimeout(300);
    await audit(page, '02-group-preselected', w, 'embedded');
    await frame.getByRole('button', { name: 'המשך לבחירת מועדים' }).click();
    await page.waitForTimeout(300);
    await audit(page, '03-dates', w, 'embedded');
  });
}

test.afterAll(() => {
  fs.mkdirSync('.cache', { recursive: true });
  fs.appendFileSync('.cache/axe-report.jsonl', report.map((r) => JSON.stringify(r)).join('\n') + (report.length ? '\n' : ''));
});
