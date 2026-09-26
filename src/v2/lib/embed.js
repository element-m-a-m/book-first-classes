// Embed contract v2 (plan §3.5), plus the v1 messages the current website's booking.js understands.
//
// Child -> parent: { ns: 'element:booking', v: 2, type, ... }
//   ready { height, version } · resize { height } · step { step, index, total, path } · error { code }
//   complete { outcome } · contextIgnored { reason }
//   Never personal data.
// Parent -> child: { ns: 'element:booking', v: 2, type: 'init' | 'setContext', offer?, group? } and { type: 'exitIntent' }.
//   Accepted only from window.parent, from an allowed origin; context applies only before user interaction.
// Legacy v1 (until the website upgrades, removed in 2.1): { type: 'element:booking:ready|resize|error', version: 1, height }
//   posted to the widget's own origin, exactly as site/booking/bridge.js did.
import { EMBED_ORIGINS, EMBED_ORIGIN_PATTERNS, VERSION } from '../config/site.js';

export const NS = 'element:booking';

export function originAllowed(origin, self = location.origin) {
  return origin === self || EMBED_ORIGINS.includes(origin) || EMBED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export function createEmbed({ onContext, onExitIntent, hasInteracted }) {
  const embedded = window.parent !== window;
  let parentOrigin = null;
  try {
    const ref = document.referrer ? new URL(document.referrer).origin : null;
    if (ref && originAllowed(ref)) parentOrigin = ref;
  } catch (e) { /* no usable referrer */ }

  function post(type, data = {}) {
    if (!embedded) return;
    const msg = { ns: NS, v: 2, type, ...data };
    const targets = new Set([location.origin]);
    if (parentOrigin) targets.add(parentOrigin);
    for (const t of targets) { try { window.parent.postMessage(msg, t); } catch (e) { /* origin mismatch is expected */ } }
  }
  function postV1(type, height) {
    if (!embedded) return;
    try { window.parent.postMessage({ type: 'element:booking:' + type, version: 1, height }, location.origin); } catch (e) { /* cross-origin parent */ }
  }

  let ready = false;
  let last = 0;
  let queued = false;
  let target = null;
  function measure() {
    queued = false;
    if (!target) return;
    const h = Math.ceil(target.getBoundingClientRect().height);
    if (h < 100) return;
    if (!ready) { ready = true; post('ready', { height: h, version: VERSION }); postV1('ready', h); } else if (h !== last) { post('resize', { height: h }); postV1('resize', h); }
    last = h;
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(measure); } };
  function observe(el) {
    target = el;
    if (!embedded || !el) return;
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(el);
    window.addEventListener('resize', queue);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    queue();
  }

  window.addEventListener('message', (e) => {
    if (!embedded || e.source !== window.parent || !originAllowed(e.origin)) return;
    const d = e.data;
    if (!d || d.ns !== NS || d.v !== 2) return;
    parentOrigin = e.origin;
    if (d.type === 'exitIntent') { if (onExitIntent) onExitIntent(); return; }
    if (d.type === 'init' || d.type === 'setContext') {
      if (hasInteracted()) { post('contextIgnored', { reason: 'user-interacted' }); return; }
      onContext({ offer: d.offer, group: d.group });
    }
  });

  return {
    embedded,
    observe,
    step: (step, index, total, path) => post('step', { step, index, total, path }),
    complete: (outcome) => post('complete', { outcome }),
    error: (code) => { post('error', { code }); postV1('error'); },
  };
}
