// Civil (calendar) dates in Asia/Jerusalem, independent of the browser's time zone.
// A civil date is a 'YYYY-MM-DD' string; weekday math runs in UTC on that string, so no local offset leaks in.
import { TZ } from '../config/site.js';

export const HDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const HDAYS_S = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];
export const HMONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const DAY = 864e5;
const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function partsAt(ms) {
  const p = {};
  for (const x of PARTS.formatToParts(new Date(ms))) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return p;
}

const pad = (n) => String(n).padStart(2, '0');
const civilUTC = (civil) => Date.parse(civil + 'T00:00:00Z');
export const fromUTC = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Jerusalem 'YYYY-MM-DD' for an instant (default: now). */
export function civilOf(ms = Date.now()) {
  const p = partsAt(ms);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
export const addDays = (civil, n) => fromUTC(civilUTC(civil) + n * DAY);
export const dowOf = (civil) => new Date(civilUTC(civil)).getUTCDay();
export const parts = (civil) => { const [y, m, d] = civil.split('-').map(Number); return { y, m, d }; };

/** Offset of Asia/Jerusalem from UTC, in minutes, at an instant. */
export function offsetAt(ms) {
  const p = partsAt(ms);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 60000;
}

/** The instant of a Jerusalem wall-clock time on a civil date (DST-aware). */
export function instantOf(civil, hm = '00:00') {
  const { y, m, d } = parts(civil);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetAt(guess) * 60000;
  const off2 = offsetAt(t);
  if (guess - off2 * 60000 !== t) t = guess - off2 * 60000;
  return t;
}

/** ISO string with the Jerusalem offset, e.g. 2026-10-25T17:00:00+02:00. */
export function isoWithOffset(civil, hm) {
  const off = offsetAt(instantOf(civil, hm));
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return `${civil}T${hm}:00${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

/** Legacy dd.mm.yyyy */
export const fmtDots = (civil) => { const { y, m, d } = parts(civil); return `${pad(d)}.${pad(m)}.${y}`; };
/** "יום ראשון, 11 באוקטובר" */
export const fmtLong = (civil) => { const { m, d } = parts(civil); return `יום ${HDAYS[dowOf(civil)]}, ${d} ב${HMONTHS[m - 1]}`; };
/** Sunday on or before a civil date. */
export const weekStart = (civil) => addDays(civil, -dowOf(civil));
