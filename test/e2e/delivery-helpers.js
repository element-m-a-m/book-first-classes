// Helpers for the 2.2 delivery specs: held answers, the stored outbox, and a short private journey (one event).
import { expect } from '@playwright/test';
import { TEST_LEAD } from './harness.js';
import { choose, press, heading } from './v2-driver.js';

export const SENDING = 'שולחים את הפרטים...';
export const RETRYING = 'הפרטים עוד לא הגיעו אלינו. ממשיכים לנסות לשלוח.';
export const REFUSED = 'לא הצלחנו לקבל את הפנייה כרגע.';
export const PRIVATE_SENT = 'הפנייה נשלחה';
export const CALLBACK_SENT = 'הפנייה נשלחה בהצלחה!';

/** A promise the test resolves later: an answer held open. */
export function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

/** The outbox the page keeps in localStorage (2.2 only; 2.1.0 keeps nothing). */
export const outbox = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('eb.outbox.v1') || '[]'));

export async function expectQueued(page, event) {
  await expect.poll(async () => (await outbox(page)).map((x) => x.event), { timeout: 5000 }).toContain(event);
}
export async function expectOutboxEmpty(page) {
  await expect.poll(async () => (await outbox(page)).length, { timeout: 5000 }).toBe(0);
}

/** Advance the page clock in steps until `done()` holds (backoffs and timeouts run on the page's fake clock). */
export async function drain(page, done, { step = 20_000, max = 12 } = {}) {
  for (let i = 0; i < max && !(await done()); i++) {
    await page.clock.fastForward(step);
    await page.waitForTimeout(150);
  }
  expect(await done()).toBe(true);
}

/** Private path up to the send: one event, private_inquiry. */
export async function submitPrivate(page) {
  await choose(page, 'אימון אישי / זוגי');
  await press(page, 'המשך');
  await choose(page, 'שיקום וחזרה לאימון');
  await choose(page, 'אישי');
  await press(page, 'המשך');
  await page.getByLabel('שם מלא').fill(TEST_LEAD.name);
  await page.getByLabel('טלפון נייד').fill(TEST_LEAD.phone);
  await press(page, 'שליחת פנייה');
}

export const h2 = heading;
