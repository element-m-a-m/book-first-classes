// Webhook payloads (plan §3.4). Delivery lives in outbox.js.
// Backward compatible: every legacy field keeps its name and meaning; schema-2 fields are additive. Schema 3 (2.2):
// a child booking carries `name` (the child's full name) and `parentName` (the parent's full name).
// `dates` stay ISO instants of Jerusalem midnight (what Code.gs v9 formats); `datesLocal`/`slots` carry
// the civil dates so v10 no longer depends on the browser's zone.
import { VERSION, WEBHOOK_KEY } from '../config/site.js';
import { branchTitleOf } from '../config/groups.js';
import { OFFERS, priceFor } from '../config/offers.js';
import { goalById, FORMATS } from '../config/private.js';
import { instantOf, isoWithOffset } from './civil-date.js';
import { toE164 } from './phone.js';

export function medicalText(medHas, medText) {
  if (medHas === null || medHas === undefined) return '';
  return medHas ? (medText.trim() || 'כן, לא פורט') : 'הכל תקין';
}

/** A group booking made for a child: the page asks two full names (T5, variant B). */
export const isChildBooking = (s) => s.offerId !== 'private' && s.audience === 'child';

export function buildPayload(event, s, ctx) {
  const p = { event, name: s.name.trim() };
  if (isChildBooking(s)) p.parentName = (s.parentName || '').trim();
  Object.assign(p, { phone: s.phone, audience: s.audience || '' });
  if (s.offerId === 'private') {
    const goal = goalById(s.goal);
    Object.assign(p, {
      categoryId: goal ? goal.id : '', categoryLabel: goal ? goal.label : '', branchTitle: 'אימון אישי', pvMsg: s.note.trim(),
    });
  } else if (s.group) {
    const slots = s.slots;
    Object.assign(p, {
      categoryId: s.group.id, categoryLabel: s.group.label, branchTitle: branchTitleOf(s.group),
      packageLabel: OFFERS[s.offerId] ? OFFERS[s.offerId].packageLabel : '', price: priceFor(s.offerId, s.group.id),
      dates: slots.map((x) => new Date(instantOf(x.date, '00:00')).toISOString()),
      classTime: slots.length ? slots[0].start : '',
      medical: medicalText(s.medHas, s.medText),
    });
  }
  Object.assign(p, {
    device: ctx.device, utm: ctx.utm.utm_source || '',
    schema: 3, widgetVersion: VERSION, source: ctx.source, host: ctx.host, submissionId: s.submissionId, key: WEBHOOK_KEY,
    offerId: s.offerId || '', phoneE164: toE164(s.phone),
  });
  if (s.offerId === 'private') {
    p.privateFormat = s.format;
    p.privateFormatLabel = (FORMATS.find((f) => f.id === s.format) || {}).label || '';
  } else if (s.group) {
    p.datesLocal = s.slots.map((x) => x.date);
    p.slots = s.slots.map((x) => ({
      date: x.date, start: x.start, end: x.end, startIso: isoWithOffset(x.date, x.start), endIso: isoWithOffset(x.date, x.end),
    }));
    p.datesSkipped = !!s.datesSkipped;
  }
  Object.assign(p, ctx.utm);
  return p;
}

/** Stable short hash of the parts of a submission that matter (dedup key + fresh submissionId on edit). */
export function selectionHash(s) {
  const str = JSON.stringify([s.offerId, s.group && s.group.id, s.slots.map((x) => x.date), s.medHas, s.medText,
    s.name.trim(), (s.parentName || '').trim(), s.phone, s.goal, s.format, s.note]);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

export function newSubmissionId() {
  const a = new Uint32Array(2);
  (globalThis.crypto || window.crypto).getRandomValues(a);
  return 'w' + a[0].toString(36) + a[1].toString(36);
}
