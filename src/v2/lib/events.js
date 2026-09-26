// Webhook payloads (plan §3.4) and a serial sender.
// Backward compatible: every legacy field keeps its name and meaning; schema-2 fields are additive.
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

export function buildPayload(event, s, ctx) {
  const p = { event, name: s.name.trim(), phone: s.phone, audience: s.audience || '' };
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
    schema: 2, widgetVersion: VERSION, source: ctx.source, host: ctx.host, submissionId: s.submissionId, key: WEBHOOK_KEY,
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
    s.name.trim(), s.phone, s.goal, s.format, s.note]);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

export function newSubmissionId() {
  const a = new Uint32Array(2);
  (globalThis.crypto || window.crypto).getRandomValues(a);
  return 'w' + a[0].toString(36) + a[1].toString(36);
}

/**
 * Serial sender: events leave in order (lead_started before checkout_reached), each retried on network
 * failure. The request is no-cors (Apps Script), so only network errors are detectable.
 */
export function createSender({ url, fetchImpl, retries = 2, backoffMs = 700, onFailChange } = {}) {
  const doFetch = fetchImpl || ((u, o) => fetch(u, o));
  let chain = Promise.resolve();
  const sent = new Set();
  const failed = [];
  const post = (body) => doFetch(url, {
    method: 'POST', mode: 'no-cors', cache: 'no-cache', redirect: 'follow', keepalive: true,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body,
  });
  async function attempt(body) {
    for (let i = 0; i <= retries; i++) {
      try { await post(body); return true; } catch (e) {
        if (i < retries) await new Promise((r) => setTimeout(r, backoffMs * (i + 1)));
      }
    }
    return false;
  }
  const settle = (item) => (ok) => { if (!ok) failed.push(item); if (onFailChange) onFailChange(failed.length); };
  function send(key, payload) {
    if (sent.has(key)) return chain;
    sent.add(key);
    const item = { key, body: JSON.stringify(payload) };
    chain = chain.then(() => attempt(item.body)).then(settle(item));
    return chain;
  }
  function retryFailed() {
    for (const item of failed.splice(0)) chain = chain.then(() => attempt(item.body)).then(settle(item));
    if (onFailChange) onFailChange(failed.length);
    return chain;
  }
  return { send, retryFailed, failedCount: () => failed.length, idle: () => chain };
}
