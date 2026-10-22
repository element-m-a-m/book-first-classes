// Records the webhook payloads the v2 widget really sends in each merged-checkout journey, driven through
// the real UI. The Apps Script repo replays these goldens through the real Code.gs
// (apps-script/test/merged-checkout.test.mjs), so the backend is tested with the widget's own bytes.
// 2.2 records into golden/v2.2-pipeline/ (schema 3). golden/v2-pipeline/ stays frozen as 2.1.0's schema-2 record, which
// the backend tests read, and which the website's copy still sends.
// UPDATE_GOLDEN=1 re-records. Submission IDs and the test host are normalised; everything else is exact.
import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { openWidget, goldenPath, TEST_LEAD } from './harness.js';
import { V2_URL, GROUPS_V2, groupJourney, heading, choose, press, waitEvents } from './v2-driver.js';

function normalise(events) {
  const ids = new Map();
  return events.map((e) => {
    if (!ids.has(e.submissionId)) ids.set(e.submissionId, 'sub-' + (ids.size + 1));
    return { ...e, submissionId: ids.get(e.submissionId), host: 'TEST-HOST' };
  });
}

const PAY = 'לחצו כאן לתשלום מאובטח';
const GOLDEN_TREE = 'v2.2-pipeline';

const JOURNEYS = {
  // Standalone, 3 classes: summary viewed, then the payment link.
  'trial3-selfbook': async (page, rec) => {
    await groupJourney(page, GROUPS_V2[3], { finish: 'review' });
    await waitEvents(page, rec, 2);
    await page.getByRole('link', { name: PAY }).click();
    await waitEvents(page, rec, 3);
  },
  // Paid, went back, changed the medical answer, paid again: a fresh submission.
  'edited-resubmission-selfbook': async (page, rec) => {
    await groupJourney(page, GROUPS_V2[4], { finish: 'selfbook', medical: null });
    await waitEvents(page, rec, 3);
    await press(page, 'חזרה');
    await choose(page, 'יש מה לדעת');
    await page.getByLabel('פרטים', { exact: true }).fill('ברך שמאל רגישה');
    await press(page, 'המשך לסיכום');
    await waitEvents(page, rec, 5);
    await page.getByRole('link', { name: PAY }).click();
    await waitEvents(page, rec, 6);
  },
  // Opened payment, then also asked for a representative (still on the same final screen).
  'selfbook-then-callback': async (page, rec) => {
    await groupJourney(page, GROUPS_V2[0], { finish: 'selfbook' });
    await waitEvents(page, rec, 3);
    await page.getByRole('button', { name: /בקשת שיחה חוזרת/ }).click();
    await expect(heading(page)).toHaveText('הפנייה נשלחה בהצלחה!');
    await waitEvents(page, rec, 4);
  },
  // Single class, dates skipped, representative callback.
  'single-skip-callback': async (page, rec) => {
    await groupJourney(page, GROUPS_V2[5], { offer: 'single', dates: 'skip', finish: 'callback' });
    await waitEvents(page, rec, 3);
  },
  // 90 s on the final screen without a choice.
  'abandoned-checkout': async (page, rec) => {
    await groupJourney(page, GROUPS_V2[1], { finish: 'review' });
    await waitEvents(page, rec, 2);
    await page.clock.fastForward(91_000);
    await waitEvents(page, rec, 3);
  },
  // Paid for one child, then "book another" for a second child.
  'book-another-second-child': async (page, rec) => {
    await groupJourney(page, GROUPS_V2[0], { finish: 'selfbook' });
    await waitEvents(page, rec, 3);
    await page.getByRole('button', { name: 'הזמנת שיעור נוסף', exact: true }).click();
    await groupJourney(page, GROUPS_V2[1], { finish: 'selfbook' });
    await waitEvents(page, rec, 6);
  },
  // Private training: format and goal, then the inquiry.
  'private-duo-inquiry': async (page, rec) => {
    await choose(page, 'אימון אישי / זוגי');
    await press(page, 'המשך');
    await choose(page, 'זוגי');
    await choose(page, 'שיקום וחזרה לאימון');
    await press(page, 'המשך');
    await page.getByLabel('שם מלא').fill('בדיקה אוטומטית');
    await page.getByLabel('טלפון נייד').fill('050-0000000');
    await press(page, 'שליחת פנייה');
    await waitEvents(page, rec, 1);
  },
};

for (const [name, run] of Object.entries(JOURNEYS)) {
  test(`pipeline payloads: ${name}`, async ({ page }) => {
    const rec = await openWidget(page, V2_URL + '?utm_source=pipeline-test');
    await run(page, rec);
    await page.waitForTimeout(300);
    expect(rec.blocked).toEqual([]);
    const events = normalise(rec.events);
    const gp = goldenPath(GOLDEN_TREE, name);
    if (process.env.UPDATE_GOLDEN) {
      fs.mkdirSync(path.dirname(gp), { recursive: true });
      fs.writeFileSync(gp, JSON.stringify({ journey: name, events }, null, 2) + '\n');
    }
    expect(events).toEqual(JSON.parse(fs.readFileSync(gp, 'utf8')).events);
  });
}

// Schema 3 on the recorded bytes: a child booking carries the child's full name in `name` and the parent's in
// `parentName`. The same check run over 2.1.0's frozen golden must fail, or it proves nothing.
export function isSchema3Child(golden) {
  const kids = golden.events.filter((e) => e.audience === 'child');
  return kids.length > 0 && kids.every((e) => e.schema === 3 && e.name === TEST_LEAD.name && e.parentName === TEST_LEAD.parentName);
}

test('the recorded child golden is schema 3 with both names; 2.1.0\'s frozen golden fails the same check', () => {
  const read = (tree) => JSON.parse(fs.readFileSync(goldenPath(tree, 'book-another-second-child'), 'utf8'));
  expect(isSchema3Child(read(GOLDEN_TREE))).toBe(true);
  expect(isSchema3Child(read('v2-pipeline'))).toBe(false);
});
