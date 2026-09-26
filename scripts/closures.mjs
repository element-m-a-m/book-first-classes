// Closed-dates generator (plan §3.6). Rules are canonical in the Business Ecosystem doc, Spoke 8 §3,
// plus decisions 14 and 15 settled with Lior on 26-Sep-2026:
//   - every חג שבתון (Israel) is closed, and so is its eve when the eve falls Sun-Thu (a Friday eve is open:
//     Friday classes end before the holiday starts);
//   - Yom HaZikaron (with its eve) and Yom HaAtzmaut are closed; Chol HaMoed, Hanukkah, Purim, Tisha B'Av,
//     Yom HaShoah and Lag BaOmer are open;
//   - August break: from the Sunday after the first three full Sun-Fri class weeks of August through 31-Aug.
// Hebrew dates come from ICU (Intl 'en-u-ca-hebrew'), no third-party calendar library.
//
//   node scripts/closures.mjs [--to 2030-12-31] [--from 2026-01-01] [--print 2026-10-01:2027-09-30]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const FROM = arg('--from', '2026-01-01');
const TO = arg('--to', '2030-12-31');
const OUT = 'src/v2/config/closures.generated.json';

const HEB = new Intl.DateTimeFormat('en-u-ca-hebrew', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const parse = (s) => Date.parse(s + 'T00:00:00Z');
const dow = (t) => new Date(t).getUTCDay();

export function hebrewOf(t) {
  const p = Object.fromEntries(HEB.formatToParts(new Date(t + DAY / 2)).map((x) => [x.type, x.value]));
  return { day: Number(p.day), month: p.month, year: Number(p.year) };
}

const YOM_TOV = [
  ['Tishri', 1, 'rosh-hashana-1'], ['Tishri', 2, 'rosh-hashana-2'], ['Tishri', 10, 'yom-kippur'],
  ['Tishri', 15, 'sukkot'], ['Tishri', 22, 'shemini-atzeret'], ['Nisan', 15, 'pesach'],
  ['Nisan', 21, 'pesach-7'], ['Sivan', 6, 'shavuot'],
];

export function generate(from = FROM, to = TO, { postpone = true } = {}) { // postpone:false exists only for mutation tests
  const start = parse(from) - 40 * DAY, end = parse(to) + 40 * DAY; // margin so eves/postponements at the edges resolve
  const byDate = new Map();
  const add = (t, reason) => {
    const d = iso(t);
    if (!byDate.has(d)) byDate.set(d, new Set());
    byDate.get(d).add(reason);
  };
  const iyar5 = [];
  for (let t = start; t <= end; t += DAY) {
    const h = hebrewOf(t);
    for (const [m, d, name] of YOM_TOV) {
      if (h.month === m && h.day === d) {
        add(t, name);
        const eve = t - DAY;
        if (dow(eve) >= 0 && dow(eve) <= 4) add(eve, name + '-eve');
      }
    }
    if (h.month === 'Iyar' && h.day === 5) iyar5.push(t);
  }
  // Yom HaAtzmaut postponement rules (in force since 2004): 5 Iyar on Fri/Sat -> Thursday before;
  // on Monday -> Tuesday. Yom HaZikaron is the day before; its eve (the evening it starts) is closed too.
  for (const t5 of iyar5) {
    let ya = t5;
    if (!postpone) { /* mutation-test path: raw 5 Iyar */ }
    else if (dow(t5) === 5) ya = t5 - DAY;
    else if (dow(t5) === 6) ya = t5 - 2 * DAY;
    else if (dow(t5) === 1) ya = t5 + DAY;
    add(ya, 'yom-haatzmaut');
    add(ya - DAY, 'yom-hazikaron');
    if (dow(ya - 2 * DAY) <= 4) add(ya - 2 * DAY, 'yom-hazikaron-eve');
  }
  // August break (decision 15): three full Sun-Fri weeks first, then the break runs to 31-Aug.
  for (let y = new Date(start).getUTCFullYear(); y <= new Date(end).getUTCFullYear(); y++) {
    const aug1 = Date.UTC(y, 7, 1);
    const firstSunday = aug1 + ((7 - dow(aug1)) % 7) * DAY;
    for (let t = firstSunday + 21 * DAY; t <= Date.UTC(y, 7, 31); t += DAY) add(t, 'august-break');
  }
  return [...byDate.entries()]
    .filter(([d]) => d >= from && d <= to)
    .filter(([d]) => dow(parse(d)) !== 6) // no classes on Saturday anyway
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, reasons]) => ({ date, scope: 'all', reason: [...reasons].sort().join('+') }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = generate();
  const print = arg('--print', null);
  if (print) {
    const [a, b] = print.split(':');
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const r of rows.filter((r) => r.date >= a && r.date <= b)) console.log(`${r.date} ${DOW[dow(parse(r.date))]}  ${r.reason}`);
  } else {
    fs.mkdirSync('src/v2/config', { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ generatedFrom: FROM, horizon: TO, rules: 'Spoke 8 §3 + decisions 14/15 (26-Sep-2026)', closures: rows }, null, 1) + '\n');
    console.log(`wrote ${rows.length} closed dates ${FROM}..${TO} -> ${OUT}`);
  }
}
