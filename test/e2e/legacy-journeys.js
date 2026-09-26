// Scripted journeys through the LEGACY flow (qual -> branch -> cat -> details -> dates -> medical -> action).
// Used by parity.spec.js to prove the modular v1 build behaves exactly like the live legacy page, and to
// record golden payloads - the backward-compatibility contract the v2 redesign is checked against.
import { TEST_LEAD, snap, pickDays, collectOpened } from './harness.js';

const GROUPS = [
  { id: 'kids-6-8', label: 'ילדים גילאי 6-8', aud: 'child', branch: 'אומנויות לחימה' },
  { id: 'kids-9-11', label: 'ילדים גילאי 9-11', aud: 'child', branch: 'אומנויות לחימה' },
  { id: 'youth-12-15', label: 'נוער צעיר 12-15', aud: 'child', branch: 'אומנויות לחימה' },
  { id: 'adults-16-37', label: 'בוגרים ונוער 16-37', aud: 'self', branch: 'אומנויות לחימה' },
  { id: 'adults-38-58', label: 'מבוגרים צעירים 38-58', aud: 'self', branch: 'אומנויות לחימה' },
  { id: 'movement-class', label: 'מובמנט', aud: 'self', branch: 'מובמנט ואימון גופני' },
  { id: 'strength', label: 'כוח וגמישות', aud: 'self', branch: 'מובמנט ואימון גופני' },
];
const PRIVATE = [
  { id: 'private-martial', label: 'אומנויות לחימה והגנה עצמית' },
  { id: 'private-rehab', label: 'כושר, פיזיותרפיה ושיקום' },
  { id: 'private-duo', label: 'אימוני זוגות, ילדים ומשפחות' },
];
const AUD_BTN = { self: 'עבורי', child: 'עבור הילד/ה שלי' };
const text = (page, t) => page.getByText(t, { exact: true });

async function qualify(page, rec, aud) {
  await snap(page, rec, 'qual');
  await text(page, AUD_BTN[aud]).click();
  await page.getByPlaceholder('שם מלא').fill(TEST_LEAD.name);
  await page.getByPlaceholder('50-1234567').fill(TEST_LEAD.phone);
  await text(page, 'המשיכו לבחירת אימון ←').click();
  await snap(page, rec, 'branch');
}

async function groupJourney(page, rec, g, { pkg, dates, medical = 'ok', finish, upsell = false, abandon = false }) {
  await qualify(page, rec, g.aud);
  await text(page, g.branch).click();
  await snap(page, rec, 'cat');
  await text(page, g.label).click();
  await snap(page, rec, 'details');
  await text(page, pkg === 'single' ? 'שיעור בודד' : '3 שיעורי היכרות').click();
  await text(page, 'המשיכו לבחירת תאריכים ←').click();
  await snap(page, rec, 'dates');
  if (dates === 'skip') {
    await text(page, 'לא מצאתי תאריך מתאים, אדלג ואתאם בהמשך').click();
  } else {
    await pickDays(page, upsell ? 1 : dates);
    if (upsell) {
      await snap(page, rec, 'dates-upsell');
      await text(page, 'שדרגו ←').click();
      await snap(page, rec, 'dates-upgraded');
      await pickDays(page, dates);
    }
    await snap(page, rec, 'dates-picked');
    await text(page, 'המשיכו ←').click();
  }
  await snap(page, rec, 'medical');
  if (medical === 'ok') await text(page, 'הכל תקין').click();
  else { await text(page, 'יש מה לדעת').click(); await page.getByPlaceholder('פרטו בקצרה: פציעות עבר, מגבלות...').fill(medical); }
  await text(page, 'המשיכו לסיכום ←').click();
  await snap(page, rec, 'action');
  if (abandon) {
    await page.clock.fastForward(91_000);
    await page.waitForTimeout(100);
  }
  if (finish === 'selfbook') { await text(page, 'מעבר למערכת ההזמנה ←').click(); await snap(page, rec, 'done'); }
  if (finish === 'callback') { await text(page, 'שלחו').click(); await snap(page, rec, 'done-wa'); }
  await collectOpened(page, rec);
}

async function privateJourney(page, rec, p, note) {
  await qualify(page, rec, 'self');
  await text(page, 'אימונים אישיים / זוגיים').click();
  await snap(page, rec, 'cat');
  await text(page, p.label).click();
  await snap(page, rec, 'pform');
  if (note) await page.getByPlaceholder(/ספרו לנו על המטרה שלכם/).fill(note);
  await text(page, 'שלחו פנייה בוואטסאפ').click();
  await snap(page, rec, 'pdone');
  await collectOpened(page, rec);
}

export const JOURNEYS = [
  ...GROUPS.flatMap((g) => [
    { name: `${g.id}--trial3-selfbook`, run: (p, r) => groupJourney(p, r, g, { pkg: 'trial3', dates: 3, finish: 'selfbook' }) },
    { name: `${g.id}--single-callback`, run: (p, r) => groupJourney(p, r, g, { pkg: 'single', dates: 1, finish: 'callback', medical: 'ברך שמאל רגישה' }) },
  ]),
  { name: 'adults-16-37--skip-dates-selfbook', run: (p, r) => groupJourney(p, r, GROUPS[3], { pkg: 'trial3', dates: 'skip', finish: 'selfbook' }) },
  { name: 'movement-class--single-upsell-trial3', run: (p, r) => groupJourney(p, r, GROUPS[5], { pkg: 'single', dates: 3, upsell: true, finish: 'selfbook' }) },
  { name: 'kids-9-11--abandoned-checkout', run: (p, r) => groupJourney(p, r, GROUPS[1], { pkg: 'trial3', dates: 2, abandon: true }) },
  ...PRIVATE.map((pv, i) => ({ name: `${pv.id}--inquiry`, run: (p, r) => privateJourney(p, r, pv, i === 0 ? '' : 'מטרה: לחזור לכושר') })),
];
