// URL parameters (embed contract v2, plan §3.5). Whitelisted; anything else is ignored.
// Params only preselect - they never set price, eligibility or availability.
import { OFFER_IDS } from '../config/offers.js';
import { GROUP_ALIASES, GROUPS } from '../config/groups.js';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const SAFE = /^[\w .\-+%@:/֐-׿]{1,100}$/;

export function resolveGroup(v) {
  if (!v) return null;
  if (GROUPS.some((g) => g.id === v)) return v;
  return GROUP_ALIASES[v] || null;
}

export function parseParams(search) {
  const q = new URLSearchParams(search || '');
  const out = { embed: q.get('embed') === '1', offer: null, group: null, utm: {} };
  const offer = q.get('offer');
  if (OFFER_IDS.includes(offer)) out.offer = offer;
  out.group = resolveGroup(q.get('group'));
  if (out.offer === 'private') out.group = null;
  for (const k of UTM_KEYS) {
    const v = (q.get(k) || '').trim();
    if (v && SAFE.test(v)) out.utm[k] = v;
  }
  return out;
}
