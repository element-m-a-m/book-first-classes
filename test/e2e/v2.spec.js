// S4 e2e: every path of the v2 widget, offline, webhook captured (plan §4).
import { test, expect } from '@playwright/test';
import { openWidget, collectOpened, TEST_LEAD } from './harness.js';
import { V2_URL, GROUPS_V2, heading, choose, press, pickDays, groupJourney, privateJourney, toGroup, fillContact, waitEvents } from './v2-driver.js';

const TIMETABLE_START = { 'movement-class': { 2: '19:45', 5: '14:30' }, strength: { 2: '18:30', 5: '15:45' } };
const dowOf = (civil) => new Date(civil + 'T00:00:00Z').getUTCDay();
const jerusalemMidnightISO = (civil) => {
  const [y, m, d] = civil.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  const off = /GMT([+-]\d+)/.exec(probe.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'short' }))[1];
  return new Date(Date.UTC(y, m - 1, d) - Number(off) * 3600e3).toISOString();
};

function checkGroupPayload(p, g, offer) {
  expect(p.categoryId).toBe(g.id);
  expect(p.categoryLabel).toBe(g.label);
  expect(p.price).toBe(offer === 'trial3' ? 99 : g.kids ? 60 : 70);
  expect(p.packageLabel).toBe(offer === 'trial3' ? '3 שיעורי היכרות' : 'שיעור בודד');
  expect(p.schema).toBe(2);
  expect(p.phoneE164).toBe('+972500000000');
  expect([...p.datesLocal].sort()).toEqual(p.datesLocal);
  expect(p.dates).toEqual(p.datesLocal.map(jerusalemMidnightISO));
  for (const s of p.slots) {
    expect(g.dows).toContain(dowOf(s.date));
    const start = g.start || TIMETABLE_START[g.id][dowOf(s.date)];
    expect(s.start).toBe(start);
    expect(s.startIso.startsWith(`${s.date}T${start}:00+0`)).toBeTruthy();
  }
  expect(p.classTime).toBe(p.slots[0] ? p.slots[0].start : '');
  expect(JSON.stringify(p)).not.toContain('undefined');
}

test.describe('group path', () => {
  for (const g of GROUPS_V2) {
    test(`${g.id}: trial3, 3 dates, pay online`, async ({ page }) => {
      const rec = await openWidget(page, V2_URL);
      await groupJourney(page, g, { offer: 'trial3', finish: 'selfbook' });
      await waitEvents(page, rec, 3);
      expect(rec.events.map((e) => e.event)).toEqual(['lead_started', 'checkout_reached', 'booking_selfbook']);
      const c = rec.events[1];
      checkGroupPayload(c, g, 'trial3');
      expect(c.slots).toHaveLength(3);
      expect(new Set(rec.events.map((e) => e.submissionId)).size).toBe(1);
      await expect(page.getByRole('link', { name: /תשלום/ })).toHaveAttribute('href', 'https://letts.co.il/payment/WXZycXZLa09XMlp3QzhJS2hhNHFkdz09');
      const wtb = page.getByRole('button', { name: /מה להביא לשיעור הראשון/ });
      await expect(page.getByText('💧 בקבוק מים')).toBeHidden();
      await wtb.click();
      await expect(wtb).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText('💧 בקבוק מים')).toBeVisible();
      expect(rec.blocked).toEqual([]);
    });
    test(`${g.id}: single, 1 date, callback via WhatsApp`, async ({ page }) => {
      const rec = await openWidget(page, V2_URL);
      await groupJourney(page, g, { offer: 'single', finish: 'callback', medical: 'ברך שמאל רגישה' });
      await waitEvents(page, rec, 3);
      expect(rec.events.map((e) => e.event)).toEqual(['lead_started', 'checkout_reached', 'booking_callback']);
      checkGroupPayload(rec.events[1], g, 'single');
      expect(rec.events[1].medical).toBe('ברך שמאל רגישה');
      await collectOpened(page, rec);
      expect(rec.opened).toHaveLength(1);
      const wa = decodeURIComponent(rec.opened[0]);
      expect(wa).toContain('https://wa.me/972512826106?text=');
      expect(wa).toContain('קבוצה: ' + g.label);
      expect(wa).toContain('טלפון: +972500000000');
    });
  }

  test('single to trial3 upsell keeps the picked date', async ({ page }) => {
    const rec = await openWidget(page, V2_URL);
    await toGroup(page, 'שיעור היכרות בודד', GROUPS_V2[3]);
    await pickDays(page, 1);
    await expect(page.getByText('רוצים גם יום')).toBeVisible();
    await press(page, 'שדרוג ל-3 שיעורים');
    await pickDays(page, 2);
    await press(page, 'המשך');
    await fillContact(page);
    await press(page, 'המשך לסיכום');
    await waitEvents(page, rec, 2);
    expect(rec.events[1].offerId).toBe('trial3');
    expect(rec.events[1].price).toBe(99);
    expect(rec.events[1].datesLocal).toHaveLength(3);
  });

  test('skip dates: coordinated later, no dates sent', async ({ page }) => {
    const rec = await openWidget(page, V2_URL);
    await groupJourney(page, GROUPS_V2[3], { dates: 'skip', finish: 'selfbook' });
    await waitEvents(page, rec, 3);
    const c = rec.events[1];
    expect(c.datesSkipped).toBe(true);
    expect(c.dates).toEqual([]);
    expect(c.classTime).toBe('');
    await expect(page.getByText('מועדים יתואמו טלפונית בהמשך')).toBeVisible();
  });

  test('abandoned checkout after 90 s on the summary', async ({ page }) => {
    const rec = await openWidget(page, V2_URL);
    await groupJourney(page, GROUPS_V2[1], { finish: null });
    await waitEvents(page, rec, 2);
    await page.clock.fastForward(91_000);
    await waitEvents(page, rec, 3);
    expect(rec.events[2].event).toBe('abandoned_checkout');
  });

  test('overlapping Sunday classes (two halls): kids 6-8 and youth both bookable on the same Sunday', async ({ page }) => {
    await openWidget(page, V2_URL);
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[0]);
    const kidsSunday = await page.locator('button.eb-cal__day.is-open').first().getAttribute('aria-label');
    await press(page, 'חזרה');
    await choose(page, 'נוער 12-15');
    await press(page, 'המשך לבחירת מועדים');
    const youthSunday = await page.locator('button.eb-cal__day.is-open').first().getAttribute('aria-label');
    expect(kidsSunday.split(',').slice(0, 2).join()).toBe(youthSunday.split(',').slice(0, 2).join());
    expect(kidsSunday).toContain('17:00 עד 17:45');
    expect(youthSunday).toContain('17:15 עד 18:45');
  });
});

test.describe('private path', () => {
  for (const goal of ['אומנויות לחימה', 'כושר ואימון גופני', 'שיקום וחזרה לאימון']) {
    for (const [format, id] of [['אישי', 'individual'], ['זוגי', 'duo']]) {
      test(`${goal} x ${format}`, async ({ page }) => {
        const rec = await openWidget(page, V2_URL);
        await privateJourney(page, goal, format, 'מטרה: לחזור לכושר');
        await waitEvents(page, rec, 1);
        expect(rec.events).toHaveLength(1);
        const p = rec.events[0];
        expect(p.event).toBe('private_inquiry');
        expect(p.categoryLabel).toBe(goal);
        expect(p.privateFormat).toBe(id);
        expect(p.pvMsg).toBe('מטרה: לחזור לכושר');
        await collectOpened(page, rec);
        expect(rec.opened).toEqual([]); // WhatsApp is optional, never auto-opened
        await expect(page.getByRole('link', { name: /המשך בוואטסאפ/ })).toHaveAttribute('href', /wa\.me\/972512826106/);
      });
    }
  }
  test('prices shown per goal and format (duo = per meeting for the pair)', async ({ page }) => {
    await openWidget(page, V2_URL);
    await choose(page, 'אימון אישי / זוגי');
    await press(page, 'המשך');
    await choose(page, 'שיקום וחזרה לאימון');
    await expect(page.locator('.eb-rates')).toContainText('300');
    await expect(page.locator('.eb-rates')).toContainText('240');
    await choose(page, 'זוגי');
    await expect(page.locator('.eb-rates')).toContainText('360');
    await expect(page.locator('.eb-rates')).toContainText('300');
    await expect(page.locator('.eb-card')).toContainText('לשני המתאמנים יחד');
  });
});

test.describe('changes, validation, failures', () => {
  test('Back keeps selections; changing the group clears dates with a notice', async ({ page }) => {
    await openWidget(page, V2_URL);
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[3]);
    await pickDays(page, 2);
    await press(page, 'חזרה');
    await expect(page.locator('label.eb-choice.is-checked', { hasText: 'בוגרים 16-37' })).toHaveCount(1);
    await choose(page, 'כושר ולחימה לגילאי 40+');
    await expect(page.getByRole('status')).toContainText('המועדים שבחרתם נוקו');
    await press(page, 'המשך לבחירת מועדים');
    await expect(page.locator('button.eb-cal__day.is-selected')).toHaveCount(0);
  });

  test('invalid input: errors shown, focus on the first invalid field, nothing sent', async ({ page }) => {
    const rec = await openWidget(page, V2_URL);
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[3]);
    await pickDays(page, 1);
    await press(page, 'המשך');
    await page.getByLabel('טלפון נייד').fill('12345');
    await press(page, 'המשך לסיכום');
    await expect(page.getByText('* נא להזין שם מלא')).toBeVisible();
    await expect(page.getByText('* נא להזין מספר טלפון תקין')).toBeVisible();
    await expect(page.getByLabel('שם מלא')).toBeFocused();
    await expect(page.getByLabel('שם מלא')).toHaveAttribute('aria-invalid', 'true');
    await page.waitForTimeout(300);
    expect(rec.events).toEqual([]);
  });

  test('double submit sends once; an edited resubmit sends fresh with a new submissionId', async ({ page }) => {
    const rec = await openWidget(page, V2_URL);
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[3]);
    await pickDays(page, 1);
    await press(page, 'המשך');
    await fillContact(page);
    await page.getByRole('button', { name: 'המשך לסיכום' }).dblclick();
    await waitEvents(page, rec, 2);
    await press(page, 'חזרה');
    await press(page, 'המשך לסיכום');
    await page.waitForTimeout(400);
    expect(rec.events).toHaveLength(2); // same selection: deduplicated
    await press(page, 'חזרה');
    await choose(page, 'יש מה לדעת');
    await press(page, 'המשך לסיכום');
    await waitEvents(page, rec, 4);
    expect(rec.events[2].submissionId).not.toBe(rec.events[0].submissionId);
    expect(rec.events[3].medical).toBe('כן, לא פורט');
  });

  test('webhook failure: retried, then a visible retry that recovers', async ({ page }) => {
    let failures = 0;
    const rec = await openWidget(page, V2_URL);
    await page.route('https://script.google.com/**', async (route) => {
      if (failures < 6) { failures++; return route.abort('failed'); }
      rec.events.push(JSON.parse(route.request().postData()));
      return route.fulfill({ status: 200, body: 'ok' });
    });
    await groupJourney(page, GROUPS_V2[0], { finish: null });
    await expect.poll(() => failures, { timeout: 15000 }).toBe(6); // both events exhausted their retries
    await expect(page.getByText('לא הצלחנו לשמור את הפרטים אצלנו')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'ניסיון נוסף' }).click();
    await waitEvents(page, rec, 2);
    expect(rec.events.map((e) => e.event)).toEqual(['lead_started', 'checkout_reached']);
    await expect(page.getByText('לא הצלחנו לשמור את הפרטים אצלנו')).toHaveCount(0);
  });
});

test.describe('calendar rules', () => {
  test('closed holiday dates show "אין שיעור" and cannot be picked (Pesach 2027, kids Sun/Wed)', async ({ page }) => {
    await openWidget(page, V2_URL, { now: new Date('2027-04-18T10:00:00+03:00') });
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[0]);
    const eve = page.getByRole('button', { name: /יום רביעי, 21 באפריל, אין שיעור/ });
    await expect(eve).toBeDisabled();
    await expect(eve).toContainText('אין שיעור');
    await expect(page.getByRole('button', { name: /יום ראשון, 25 באפריל, 17:00 עד 17:45/ })).toBeEnabled(); // Chol HaMoed
    await expect(page.getByRole('button', { name: /יום רביעי, 28 באפריל, אין שיעור/ })).toBeDisabled();
  });
  test('same-day booking until the class starts, then "נסגר"', async ({ page }) => {
    await openWidget(page, V2_URL, { now: new Date('2026-10-11T16:30:00+03:00') });
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[0]);
    await expect(page.getByRole('button', { name: /יום ראשון, 11 באוקטובר, 17:00 עד 17:45/ })).toBeEnabled();
    await page.clock.fastForward('45:00');
    await page.getByRole('button', { name: 'ממשיך/ה' }).click(); // the idle nudge appears after 60 s; a person would dismiss it
    await press(page, 'חזרה');
    await press(page, 'המשך לבחירת מועדים');
    await expect(page.getByRole('button', { name: /יום ראשון, 11 באוקטובר, נסגר/ })).toBeDisabled();
  });
  test('August break: 2027 classes stop from Sun 22-Aug', async ({ page }) => {
    await openWidget(page, V2_URL, { now: new Date('2027-08-10T10:00:00+03:00') });
    await toGroup(page, '3 שיעורי היכרות', GROUPS_V2[3]);
    await expect(page.getByRole('button', { name: /יום רביעי, 18 באוגוסט, 19:00/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /יום ראשון, 22 באוגוסט, אין שיעור/ })).toBeDisabled();
  });
});

for (const tz of ['Asia/Jerusalem', 'America/New_York', 'Asia/Tokyo']) {
  test.describe(`browser time zone ${tz}`, () => {
    test.use({ timezoneId: tz });
    test('same civil dates and Jerusalem instants regardless of the browser zone', async ({ page }) => {
      const rec = await openWidget(page, V2_URL);
      await groupJourney(page, GROUPS_V2[3], { finish: null });
      await waitEvents(page, rec, 2);
      const c = rec.events[1];
      expect(c.datesLocal).toEqual(['2026-10-11', '2026-10-14', '2026-10-18']);
      expect(c.dates).toEqual(['2026-10-10T21:00:00.000Z', '2026-10-13T21:00:00.000Z', '2026-10-17T21:00:00.000Z']);
      expect(c.slots[0].startIso).toBe('2026-10-11T19:00:00+03:00');
    });
  });
}
