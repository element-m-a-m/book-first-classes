// Delivery the page can see (2.2). Every event is posted as text/plain, which Apps Script answers readably, and the
// backend's JSON answer decides what happens next:
//   {ok: true, key, pending}      taken (pending: the backend finishes it) -> done, never resent
//   {ok: false, retry: true}      not taken -> resent with the same body (same submissionId)
//   {ok: false, retry: false}     refused by the request gate -> stopped, shown as failed, never looped
//   JSON without `ok`             an older backend (v16's {event, results}) -> stopped, never resent, never "sent"
//   a timeout or a network error  -> resent like retry: true
//   anything else (an HTML error page, a non-2xx) -> resent at most BAD_CAP times, then held for a manual retry
// Unsent events live in localStorage until a confirmed answer, so a reload resends them. Events leave one at a time,
// in order (lead_started before checkout_reached).

export const OUTBOX_KEY = 'eb.outbox.v1';
const TAB_KEY = 'eb.outbox.tab';
export const TIMEOUT_MS = 45000;      // above the backend's ~25 s budget for starting a leg, plus one leg and the redirect
export const BACKOFF_MS = [2000, 5000, 15000, 30000, 60000];
export const BAD_CAP = 3;
export const MAX_AGE_MS = 48 * 3600e3; // the backend's own dead-letter age
const LEASE_MS = 90000;               // another tab adopts an item only after its owner stopped refreshing it

/** Pure: what an answer means. `res` is {status, text} or {error: 'timeout' | 'network'}. */
export function classifyAnswer(res) {
  if (!res || res.error) return { kind: 'retry' };
  if (!(res.status >= 200 && res.status < 300)) return { kind: 'bad' };
  let j;
  try { j = JSON.parse(res.text); } catch (e) { return { kind: 'bad' }; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { kind: 'bad' };
  if (!('ok' in j)) return { kind: 'unconfirmed' };
  if (j.ok === true) return { kind: 'done', pending: j.pending === true };
  if (j.retry === true) return { kind: 'retry' };
  if (j.retry === false) return { kind: 'refused' };
  return { kind: 'bad' };
}

function safeStorage(s) {
  const mem = new Map();
  const fallback = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); } };
  if (!s) return fallback;
  return {
    getItem: (k) => { try { return s.getItem(k); } catch (e) { return fallback.getItem(k); } },
    setItem: (k, v) => { try { s.setItem(k, v); } catch (e) { fallback.setItem(k, v); } },
  };
}

const defaultStorage = (name) => { try { return globalThis[name]; } catch (e) { return null; } };

/**
 * createOutbox({url, fetchImpl, storage, session, now, onChange})
 * Item states: queued -> inflight -> done | wait (backoff) | held (failed, retryable) | dead (stopped for good).
 */
export function createOutbox({ url, fetchImpl, storage, session, now = () => Date.now(), onChange, timeoutMs = TIMEOUT_MS, backoffMs = BACKOFF_MS } = {}) {
  const doFetch = fetchImpl || ((u, o) => fetch(u, o));
  const store = safeStorage(storage === undefined ? defaultStorage('localStorage') : storage);
  const sess = safeStorage(session === undefined ? defaultStorage('sessionStorage') : session);
  let tab = sess.getItem(TAB_KEY);
  if (!tab) { tab = 't' + Math.random().toString(36).slice(2, 10); sess.setItem(TAB_KEY, tab); }
  const items = [];
  const byKey = new Map();
  let running = false;
  let timer = null;
  let waiters = [];

  const read = () => { try { const a = JSON.parse(store.getItem(OUTBOX_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const keep = (it) => ['queued', 'inflight', 'wait', 'held'].includes(it.state) && !it.local;
  function persist() {
    const mine = new Set(items.map((it) => it.key));
    const t = now();
    const others = read().filter((x) => x.owner !== tab && !mine.has(x.key) && t - x.firstAt <= MAX_AGE_MS);
    store.setItem(OUTBOX_KEY, JSON.stringify([...others, ...items.filter(keep).map((it) => ({
      key: it.key, body: it.body, submissionId: it.submissionId, event: it.event, firstAt: it.firstAt,
      attempts: it.attempts, owner: tab, leaseUntil: t + LEASE_MS,
    }))]));
  }
  const changed = () => { persist(); if (onChange) onChange(); };
  const busy = () => items.some((it) => ['queued', 'inflight', 'wait'].includes(it.state));
  const settle = () => { if (!busy()) { const w = waiters; waiters = []; w.forEach((r) => r()); } };

  async function post(body) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    let timedOut = false;
    const to = setTimeout(() => { timedOut = true; if (ctrl) ctrl.abort(); }, timeoutMs);
    try {
      const r = await doFetch(url, {
        method: 'POST', cache: 'no-cache', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctrl ? ctrl.signal : undefined,
      });
      const text = await r.text();
      if (timedOut) return { error: 'timeout' };
      return { status: r.status, text };
    } catch (e) {
      return { error: timedOut ? 'timeout' : 'network' };
    } finally { clearTimeout(to); }
  }

  function schedule(at) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; pump(); }, Math.max(0, at - now()));
  }

  async function pump() {
    if (running) return;
    running = true;
    try {
      for (;;) {
        const head = items.find((it) => it.state === 'queued' || it.state === 'wait');
        if (!head) break;
        if (head.state === 'wait' && head.nextAt > now()) { schedule(head.nextAt); break; }
        if (now() - head.firstAt > MAX_AGE_MS) { head.state = 'dead'; changed(); continue; }
        head.state = 'inflight';
        head.attempts += 1;
        changed();
        const verdict = classifyAnswer(await post(head.body));
        if (verdict.kind === 'done') { head.state = 'done'; head.pending = verdict.pending; } else if (verdict.kind === 'refused') { head.state = 'held'; head.local = true; } else if (verdict.kind === 'unconfirmed') { head.state = 'dead'; } else {
          if (verdict.kind === 'bad') head.bad = (head.bad || 0) + 1;
          if (head.bad >= BAD_CAP) head.state = 'held';
          else { head.state = 'wait'; head.nextAt = now() + backoffMs[Math.min(head.retries || 0, backoffMs.length - 1)]; head.retries = (head.retries || 0) + 1; }
        }
        head.verdict = verdict.kind;
        changed();
      }
    } finally {
      running = false;
      settle();
    }
  }

  function add(it) {
    items.push(it);
    byKey.set(it.key, it);
  }

  /** Queue one event; a key already known is ignored (double clicks, re-renders). */
  function send(key, payload) {
    if (byKey.has(key)) return key;
    add({ key, body: JSON.stringify(payload), submissionId: payload.submissionId, event: payload.event, firstAt: now(), attempts: 0, state: 'queued' });
    changed();
    pump();
    return key;
  }

  /** Resend the events a refusal or a bad answer stopped. */
  function retryFailed() {
    for (const it of items) if (it.state === 'held') { it.state = 'queued'; it.bad = 0; it.local = false; }
    changed();
    pump();
  }

  /** sending | retrying | sent | failed, or null for a key never sent. */
  function statusOf(key) {
    const it = byKey.get(key);
    if (!it) return null;
    if (it.state === 'done') return 'sent';
    if (it.state === 'held' || it.state === 'dead') return 'failed';
    return it.attempts > 1 || it.retries ? 'retrying' : 'sending';
  }

  // Adopt what an earlier load of this tab (a reload), or a tab that stopped refreshing its lease, left unsent.
  const t0 = now();
  const stored = read();
  const fresh = stored.filter((x) => t0 - x.firstAt <= MAX_AGE_MS);
  for (const x of fresh) {
    if (x.owner !== tab && x.leaseUntil > t0) continue;
    if (byKey.has(x.key)) continue;
    add({ key: x.key, body: x.body, submissionId: x.submissionId, event: x.event, firstAt: x.firstAt, attempts: x.attempts || 0, state: 'queued', adopted: true });
  }
  if (fresh.length !== stored.length || items.length) persist();
  if (items.length) setTimeout(() => pump(), 0);

  return {
    send, retryFailed, statusOf,
    failedCount: () => items.filter((it) => it.state === 'held').length,
    idle: () => (busy() || running ? new Promise((r) => waiters.push(r)) : Promise.resolve()),
  };
}
