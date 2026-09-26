// Closed-dates engine checks (plan §3.6 validation 1 and 3). Each check is shown able to fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { generate } from '../../scripts/closures.mjs';

const REF = JSON.parse(fs.readFileSync('test/fixtures/google-israel-holidays-2026-2030.json', 'utf8')).rows;
const dow = (d) => new Date(d + 'T00:00:00Z').getUTCDay();
const HOLIDAYS = new Set(REF.map((r) => r.holiday));

/** Mismatches between engine rows and the reference, both directions. Saturdays carry no classes. */
export function compare(rows, ref) {
  const engine = new Set();
  for (const r of rows) for (const reason of r.reason.split('+')) if (HOLIDAYS.has(reason)) engine.add(`${r.date}|${reason}`);
  const want = new Set(ref.filter((r) => dow(r.date) !== 6).map((r) => `${r.date}|${r.holiday}`));
  return { missing: [...want].filter((k) => !engine.has(k)), extra: [...engine].filter((k) => !want.has(k)) };
}

test('every holiday date 2026-2030 matches Google "Holidays in Israel", both directions', () => {
  const diff = compare(generate('2026-01-01', '2030-12-31'), REF);
  assert.deepEqual(diff, { missing: [], extra: [] });
});

test('the comparison fails on a one-day shift in the reference (check can fail)', () => {
  const shifted = REF.map((r, i) => (i === 7 ? { ...r, date: new Date(Date.parse(r.date) + 864e5).toISOString().slice(0, 10) } : r));
  const diff = compare(generate('2026-01-01', '2030-12-31'), shifted);
  assert.ok(diff.missing.length + diff.extra.length > 0);
});

test('the comparison catches a real engine bug: Yom HaAtzmaut without postponement rules', () => {
  const diff = compare(generate('2026-01-01', '2030-12-31', { postpone: false }), REF);
  assert.ok(diff.missing.some((k) => k.includes('yom-haatzmaut')), JSON.stringify(diff));
});

test('eves: only Sun-Thu, always the day before a closed holiday; Friday eves stay open', () => {
  const rows = generate('2026-01-01', '2030-12-31');
  const byDate = new Map(rows.map((r) => [r.date, r.reason]));
  for (const r of rows.filter((x) => x.reason.includes('-eve'))) {
    assert.ok(dow(r.date) <= 4, `${r.date} eve on ${dow(r.date)}`);
    const next = new Date(Date.parse(r.date) + 864e5).toISOString().slice(0, 10);
    assert.ok(byDate.has(next) || dow(next) === 6, `${r.date} eve without a closed next day`);
  }
  assert.ok(!rows.some((r) => dow(r.date) === 6), 'no Saturday rows');
  // Rosh Hashana 5787 starts Sat 12-Sep-2026: its eve is Friday 11-Sep and stays open
  assert.ok(!byDate.has('2026-09-11'));
});

test('August break matches the samples approved on 26-Sep-2026', () => {
  const rows = generate('2026-01-01', '2030-12-31').filter((r) => r.reason.includes('august-break'));
  const first = {};
  for (const r of rows) { const y = r.date.slice(0, 4); if (!first[y]) first[y] = r.date; }
  assert.deepEqual(first, { 2026: '2026-08-23', 2027: '2027-08-22', 2028: '2028-08-27', 2029: '2029-08-26', 2030: '2030-08-25' });
  assert.ok(rows.every((r) => r.date.slice(5, 7) === '08' && Number(r.date.slice(8)) >= 22));
});

test('open days stay open: Chol HaMoed, Hanukkah, Purim, Yom HaShoah, Lag BaOmer, Tisha B\'Av 2027', () => {
  const closed = new Set(generate('2026-01-01', '2030-12-31').map((r) => r.date));
  // Pesach 5787 Chol HaMoed Fri 23 - Mon 26 Apr 2027; Yom HaShoah Tue 4 May 2027; Lag BaOmer Tue 25 May 2027
  for (const d of ['2027-04-23', '2027-04-25', '2027-04-26', '2027-05-04', '2027-05-25', '2026-12-06', '2027-03-23']) {
    assert.ok(!closed.has(d), `${d} should be open`);
  }
});

test('replay: every day Element Calendar left empty in 2025-26 is closed by the engine (validation 2)', () => {
  const fx = JSON.parse(fs.readFileSync('test/fixtures/element-calendar-2025-26.json', 'utf8'));
  const closed = new Map(generate('2025-09-01', '2026-08-31').map((r) => [r.date, r.reason]));
  assert.deepEqual(fx.observedClosed.filter((d) => !closed.has(d)), []);
  for (const n of fx.notClosures) assert.ok(!closed.has(n.date), `${n.date} ran classes`);
  // August 2026: last class Fri 21-Aug, break from Sun 23-Aug
  assert.ok(!closed.has(fx.lastClassBeforeAugustBreak2026));
  assert.equal([...closed.keys()].find((d) => closed.get(d).includes('august-break')), '2026-08-23');
  // the known anomalies are exactly the days where the rule and the calendar disagree
  for (const a of fx.anomalies) assert.ok(closed.has(a.date), `${a.date} anomaly should be a rule-closed day`);
});

test('replay check can fail: an engine without eve closures misses observed closed eves', () => {
  const fx = JSON.parse(fs.readFileSync('test/fixtures/element-calendar-2025-26.json', 'utf8'));
  const noEves = new Set(generate('2025-09-01', '2026-08-31').filter((r) => !/^[a-z0-9-]+-eve$/.test(r.reason)).map((r) => r.date));
  assert.ok(fx.observedClosed.some((d) => !noEves.has(d)));
});
