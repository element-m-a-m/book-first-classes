// Unit tests for the v2 libraries. Bundled on the fly with esbuild (JSX/JSON imports) - see test/unit/load.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { load } from './load.mjs';

const cd = await load('src/v2/lib/civil-date.js');
const ph = await load('src/v2/lib/phone.js');
const pr = await load('src/v2/lib/params.js');
const ev = await load('src/v2/lib/events.js');
const fl = await load('src/v2/state/flow.js');
const gr = await load('src/v2/config/groups.js');
const cl = await load('src/v2/lib/closures.js');
const dt = await load('src/v2/steps/Dates.jsx');

test('civil dates: DST edges resolve to the right Jerusalem offset (plan §4)', () => {
  assert.equal(cd.isoWithOffset('2026-10-25', '17:00'), '2026-10-25T17:00:00+02:00'); // Sun after DST ends (25-Oct-2026 02:00)
  assert.equal(cd.isoWithOffset('2026-10-24', '17:00'), '2026-10-24T17:00:00+03:00');
  assert.equal(cd.isoWithOffset('2027-03-26', '14:30'), '2027-03-26T14:30:00+03:00'); // Fri, DST started 26-Mar-2027 02:00
  assert.equal(cd.isoWithOffset('2027-03-25', '14:30'), '2027-03-25T14:30:00+02:00');
  assert.equal(new Date(cd.instantOf('2026-10-11', '00:00')).toISOString(), '2026-10-10T21:00:00.000Z');
  assert.equal(cd.civilOf(Date.parse('2026-10-10T21:30:00Z')), '2026-10-11'); // already Sunday in Jerusalem
  assert.equal(cd.dowOf('2026-10-11'), 0);
  assert.equal(cd.fmtLong('2026-10-11'), 'יום ראשון, 11 באוקטובר');
});

test('phone: Israeli forms accepted, junk rejected, E.164 out', () => {
  for (const ok of ['050-0000000', '0501234567', '501234567', '+972 50-123-4567', '972501234567', '03-1234567', '077-1234567']) assert.ok(ph.isValidPhone(ok), ok);
  for (const bad of ['', '123', '05012345', '050123456789', '+1 212 555 0100', '0601234567', 'abc']) assert.ok(!ph.isValidPhone(bad), bad);
  assert.equal(ph.toE164('050-000-0000'), '+972500000000');
  assert.equal(ph.toE164('bad'), '');
});

test('params: whitelisted offer/group/utm only; aliases resolve; private drops group', () => {
  const p = pr.parseParams('?embed=1&offer=trial3&group=forty&utm_source=instagram&utm_medium=%3Cscript%3E&evil=1&price=1');
  assert.deepEqual(p, { embed: true, offer: 'trial3', group: 'adults-38-58', utm: { utm_source: 'instagram' } });
  assert.deepEqual(pr.parseParams('?offer=free&group=nope'), { embed: false, offer: null, group: null, utm: {} });
  assert.equal(pr.parseParams('?offer=private&group=youth').group, null);
  assert.equal(pr.parseParams('?utm_source=' + 'x'.repeat(101)).utm.utm_source, undefined);
});

test('payload: every legacy field name the backend reads is present with the legacy type', () => {
  const golden = JSON.parse(fs.readFileSync('test/e2e/golden/legacy/kids-6-8--trial3-selfbook.json', 'utf8')).events.find((e) => e.event === 'checkout_reached');
  const group = gr.groupById('kids-6-8');
  const snap = { name: 'בדיקה אוטומטית ', phone: '050-0000000', audience: 'child', offerId: 'trial3', group, medHas: false, medText: '',
    slots: [{ date: '2026-10-11', start: '17:00', end: '17:45' }], datesSkipped: false, submissionId: 'w1', goal: null, format: 'individual', note: '' };
  const p = ev.buildPayload('checkout_reached', snap, { device: 'desktop', utm: {}, source: 'standalone', host: 'x' });
  for (const [k, v] of Object.entries(golden)) {
    if (k === 'branchTitle') continue; // legacy omitted it (bug); v2 sends it
    assert.ok(k in p, `missing legacy field ${k}`);
    assert.equal(Array.isArray(p[k]) ? 'array' : typeof p[k], Array.isArray(v) ? 'array' : typeof v, `type of ${k}`);
  }
  assert.equal(p.name, 'בדיקה אוטומטית');
  assert.equal(p.branchTitle, 'אומנויות לחימה');
  assert.deepEqual(p.dates, ['2026-10-10T21:00:00.000Z']);
  assert.equal(p.medical, 'הכל תקין');
  assert.equal(p.categoryLabel, 'ילדים 6-8');
});

test('payload: private inquiry carries goal, format and note; never dates', () => {
  const p = ev.buildPayload('private_inquiry', { name: 'א ב', phone: '0500000000', audience: null, offerId: 'private', group: null, slots: [],
    goal: 'private-fitness', format: 'duo', note: ' לחזור לכושר ', submissionId: 'w2', medHas: null, medText: '' },
    { device: 'mobile', utm: { utm_source: 'fb' }, source: 'embed', host: 'element-m-a-m.co.il' });
  assert.equal(p.categoryId, 'private-fitness');
  assert.equal(p.privateFormat, 'duo');
  assert.equal(p.pvMsg, 'לחזור לכושר');
  assert.equal(p.branchTitle, 'אימון אישי');
  assert.equal(p.utm, 'fb');
  assert.ok(!('dates' in p) && !('slots' in p));
});

test('sender: serial order, retry on network failure, dedup by key', async () => {
  const seen = [];
  let failOnce = true;
  const s = ev.createSender({ url: 'u', backoffMs: 1, fetchImpl: async (u, o) => {
    const e = JSON.parse(o.body).event;
    if (e === 'a' && failOnce) { failOnce = false; throw new TypeError('network'); }
    await new Promise((r) => setTimeout(r, e === 'a' ? 20 : 0));
    seen.push(e);
  } });
  s.send('k1', { event: 'a' });
  s.send('k2', { event: 'b' });
  s.send('k1', { event: 'a' });
  await s.idle();
  assert.deepEqual(seen, ['a', 'b']);
  const dead = ev.createSender({ url: 'u', backoffMs: 1, retries: 1, fetchImpl: async () => { throw new TypeError('down'); } });
  dead.send('x', { event: 'x' });
  await dead.idle();
  assert.equal(dead.failedCount(), 1);
});

test('flow: changing group clears dates with a notice; audience change clears a mismatched group', () => {
  let s = fl.withContext(fl.initialState, { offer: 'trial3', group: 'kids-6-8' });
  assert.equal(s.step, 'group');
  s = fl.reducer(s, { type: 'toggleDate', date: '2026-10-11' });
  s = fl.reducer(s, { type: 'group', groupId: 'kids-9-11' });
  assert.deepEqual(s.dates, []);
  assert.match(s.notice, /המועדים/);
  s = fl.reducer(s, { type: 'toggleDate', date: '2026-10-11' });
  s = fl.reducer(s, { type: 'audience', audience: 'self' });
  assert.equal(s.groupId, null);
  assert.deepEqual(s.dates, []);
  // trial3 -> single keeps only the first date
  let t = fl.withContext(fl.initialState, { offer: 'trial3', group: 'adults-16-37' });
  for (const d of ['2026-10-14', '2026-10-11']) t = fl.reducer(t, { type: 'toggleDate', date: d });
  t = fl.reducer(t, { type: 'offer', offer: 'single' });
  assert.deepEqual(t.dates, ['2026-10-11']);
  // max 3
  for (const d of ['2026-10-11', '2026-10-14', '2026-10-18', '2026-10-21']) t = fl.reducer({ ...t, offer: 'trial3' }, { type: 'toggleDate', date: d });
  assert.ok(t.dates.length <= 3);
});

test('calendar: closed, started and open days for a group (fixed clock)', () => {
  // Sun 11-Apr-2027 12:00 Jerusalem; kids-6-8 run Sun/Wed 17:00. Pesach eve Wed 21-Apr, Pesach 7 Wed 28-Apr: closed.
  const now = Date.parse('2027-04-18T12:00:00+03:00');
  const days = dt.buildWeeks('kids-6-8', now).flat().filter((d) => d.slot);
  const st = Object.fromEntries(days.map((d) => [d.date, d.status]));
  assert.equal(st['2027-04-18'], 'open');
  assert.equal(st['2027-04-21'], 'closed');
  assert.equal(st['2027-04-25'], 'open'); // Chol HaMoed: open
  assert.equal(st['2027-04-28'], 'closed');
  const late = dt.buildWeeks('kids-6-8', Date.parse('2027-04-18T17:05:00+03:00')).flat().find((d) => d.date === '2027-04-18');
  assert.equal(late.status, 'started');
  assert.equal(cl.closureFor('2027-04-21', 'kids-6-8').closed, true);
  assert.equal(cl.closureFor('2027-04-21', 'kids-6-8', [{ date: '2027-04-21', scope: ['kids-6-8'], action: 'open' }]).closed, false);
});
