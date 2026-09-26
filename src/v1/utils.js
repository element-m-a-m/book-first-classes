// v1 module, sliced verbatim from legacy/app.jsx (L56-94). Behaviour must match the legacy build;
// the parity harness (test/e2e/parity.spec.js) proves it. Superseded by the v2 tree in S4.
import { CFG } from "./config.js";

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */
export function makeWeeks(start, n, active) {
  const out = [];
  const c = new Date(start);
  if (c.getDay() !== 0) c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  for (let w = 0; w < n; w++) {
    const wk = [];
    for (let d = 0; d < 6; d++) {
      const dt = new Date(c); dt.setDate(c.getDate() + d);
      wk.push({ date: dt, dayNum: dt.getDay(), day: dt.getDate(), month: dt.getMonth(), year: dt.getFullYear(), isActive: active.includes(dt.getDay()) && dt >= now });
    }
    out.push(wk);
    c.setDate(c.getDate() + 7);
  }
  return out;
}

export function fmt(d) { return String(d.getDate()).padStart(2,"0") + "." + String(d.getMonth()+1).padStart(2,"0") + "." + d.getFullYear(); }
export function waLink(phone, text) { return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text); }

/* ── Backend webhook ── */
export function sendEvent(eventName, data) {
  if (!CFG.webhookUrl) return;
  var payload = JSON.stringify({ event: eventName, ...data, device: /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop", utm: new URLSearchParams(window.location.search).get("utm_source") || "" });
  fetch(CFG.webhookUrl, { method: "POST", mode: "no-cors", cache: "no-cache", redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: payload }).catch(function(e) { console.warn("Webhook error:", e); });
}

export function getCleanPhone(p) {
  let c = p.replace(/\D/g, '');
  if (c.startsWith('972')) return '+' + c;
  if (c.startsWith('0')) return '+972' + c.substring(1);
  return c ? '+972' + c : '';
}

export function countDigits(p) { return p.replace(/\D/g, '').length; }
