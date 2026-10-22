// Unit tests for front end 2.2's outbox (delivery the page can see). outbox.js is plain JavaScript with no imports, so
// these run with no dependency installed (`node --test test/unit/outbox.test.mjs`, before any `npm ci`).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as ob from '../../src/v2/lib/outbox.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const answer = (obj, status = 200) => ({ status, text: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)) });
const OK = { ok: true, key: 'k', pending: false };
const fast = { backoffMs: [1], timeoutMs: 200 };
const stored = (st) => JSON.parse(st.getItem(ob.OUTBOX_KEY) || '[]');

test('classifyAnswer: the four answers, v16.1, v16 and the rest', () => {
  const c = (o, status = 200) => ob.classifyAnswer({ status, text: typeof o === 'string' ? o : JSON.stringify(o) }).kind;
  assert.equal(c({ ok: true, key: 'k', pending: false }), 'done');
  assert.equal(c({ ok: true, key: 'k', pending: true }), 'done');
  assert.equal(c({ ok: false, retry: true }), 'retry');
  assert.equal(c({ ok: false, retry: false }), 'refused');
  assert.equal(c({ ok: true, key: 'k', pending: false, event: 'lead_started', results: {} }), 'done'); // v16.1
  assert.equal(c({ event: 'lead_started', results: {} }), 'unconfirmed'); // v16: no ok
  assert.equal(c('<html>Script error</html>'), 'bad');
  assert.equal(c({ ok: false }), 'bad');
  assert.equal(c(OK, 500), 'bad');
  assert.equal(ob.classifyAnswer({ error: 'timeout' }).kind, 'retry');
  assert.equal(ob.classifyAnswer({ error: 'network' }).kind, 'retry');
  assert.equal(ob.classifyAnswer({ status: 200, text: JSON.stringify(OK) }).pending, false);
});

test('outbox: serial order, dedup by key, a network error resent with the same body', async () => {
  const bodies = [];
  let failOnce = true;
  const o = ob.createOutbox({ url: 'u', storage: memStorage(), session: memStorage(), ...fast, fetchImpl: async (u, opt) => {
    assert.equal(opt.method, 'POST');
    assert.equal(opt.mode, undefined); // never no-cors: the answer must be readable
    assert.match(opt.headers['Content-Type'], /^text\/plain/);
    const e = JSON.parse(opt.body).event;
    bodies.push(opt.body);
    if (e === 'a' && failOnce) { failOnce = false; throw new TypeError('network'); }
    return answer(OK);
  } });
  o.send('k1', { event: 'a', submissionId: 's1' });
  o.send('k2', { event: 'b', submissionId: 's1' });
  o.send('k1', { event: 'a', submissionId: 's1' });
  await o.idle();
  assert.deepEqual(bodies.map((b) => JSON.parse(b).event), ['a', 'a', 'b']);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(o.statusOf('k1'), 'sent');
  assert.equal(o.statusOf('k2'), 'sent');
});

test('outbox: pending true is taken, never resent; the item leaves storage', async () => {
  const st = memStorage();
  let n = 0;
  const o = ob.createOutbox({ url: 'u', storage: st, session: memStorage(), ...fast, fetchImpl: async () => { n++; return answer({ ok: true, key: 'k', pending: true }); } });
  o.send('k', { event: 'a', submissionId: 's' });
  await o.idle();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(n, 1);
  assert.equal(o.statusOf('k'), 'sent');
  assert.deepEqual(stored(st), []);
});

test('outbox: retry true resends the same submissionId until ok', async () => {
  const sids = [];
  const o = ob.createOutbox({ url: 'u', storage: memStorage(), session: memStorage(), ...fast, fetchImpl: async (u, opt) => {
    sids.push(JSON.parse(opt.body).submissionId);
    return answer(sids.length < 3 ? { ok: false, retry: true } : OK);
  } });
  o.send('k', { event: 'a', submissionId: 'same' });
  await o.idle();
  assert.deepEqual(sids, ['same', 'same', 'same']);
  assert.equal(o.statusOf('k'), 'sent');
});

test('outbox: retry false stops at once, shows failed, resends only on a manual retry', async () => {
  let n = 0;
  const o = ob.createOutbox({ url: 'u', storage: memStorage(), session: memStorage(), ...fast, fetchImpl: async () => { n++; return answer(n === 1 ? { ok: false, retry: false } : OK); } });
  o.send('k', { event: 'a', submissionId: 's' });
  await o.idle();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(n, 1);
  assert.equal(o.statusOf('k'), 'failed');
  assert.equal(o.failedCount(), 1);
  o.retryFailed();
  await o.idle();
  assert.equal(n, 2);
  assert.equal(o.statusOf('k'), 'sent');
});

test('outbox: an answer with no ok (v16) is never resent and never "sent"', async () => {
  const st = memStorage();
  let n = 0;
  const o = ob.createOutbox({ url: 'u', storage: st, session: memStorage(), ...fast, fetchImpl: async () => { n++; return answer({ event: 'a', results: {} }); } });
  o.send('k', { event: 'a', submissionId: 's' });
  await o.idle();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(n, 1);
  assert.equal(o.statusOf('k'), 'failed');
  assert.deepEqual(stored(st), []);
});

test('outbox: a non-JSON answer is resent at most BAD_CAP times, then held', async () => {
  let n = 0;
  const o = ob.createOutbox({ url: 'u', storage: memStorage(), session: memStorage(), ...fast, fetchImpl: async () => { n++; return answer('<html>error</html>'); } });
  o.send('k', { event: 'a', submissionId: 's' });
  await o.idle();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(n, ob.BAD_CAP);
  assert.equal(o.statusOf('k'), 'failed');
});

test('outbox: a timeout aborts the request and resends it', async () => {
  let n = 0;
  const o = ob.createOutbox({ url: 'u', storage: memStorage(), session: memStorage(), backoffMs: [1], timeoutMs: 30, fetchImpl: (u, opt) => {
    n++;
    if (n === 1) return new Promise((res, rej) => opt.signal.addEventListener('abort', () => rej(new Error('aborted'))));
    return Promise.resolve(answer(OK));
  } });
  o.send('k', { event: 'a', submissionId: 's' });
  await o.idle();
  assert.equal(n, 2);
  assert.equal(o.statusOf('k'), 'sent');
});

test('outbox: an unsent event survives a reload of the same tab and is resent; old ones are dropped', async () => {
  const st = memStorage(), sess = memStorage();
  const first = ob.createOutbox({ url: 'u', storage: st, session: sess, ...fast, fetchImpl: () => new Promise(() => {}) });
  first.send('k', { event: 'a', submissionId: 's' });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(stored(st).length, 1);
  assert.equal(stored(st)[0].submissionId, 's');
  // Another tab with the lease still fresh does not adopt it.
  let other = 0;
  ob.createOutbox({ url: 'u', storage: st, session: memStorage(), ...fast, fetchImpl: async () => { other++; return answer(OK); } });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(other, 0);
  // The same tab after a reload adopts and resends it, with the same body.
  const bodies = [];
  const second = ob.createOutbox({ url: 'u', storage: st, session: sess, ...fast, fetchImpl: async (u, opt) => { bodies.push(opt.body); return answer(OK); } });
  await new Promise((r) => setTimeout(r, 20));
  await second.idle();
  assert.equal(bodies.length, 1);
  assert.equal(JSON.parse(bodies[0]).submissionId, 's');
  assert.deepEqual(stored(st), []);
  // An item older than 48 hours is dropped, not resent.
  st.setItem(ob.OUTBOX_KEY, JSON.stringify([{ key: 'old', body: '{}', submissionId: 'x', event: 'a', firstAt: Date.now() - ob.MAX_AGE_MS - 1000, attempts: 1, owner: 'gone', leaseUntil: 0 }]));
  let late = 0;
  ob.createOutbox({ url: 'u', storage: st, session: memStorage(), ...fast, fetchImpl: async () => { late++; return answer(OK); } });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(late, 0);
  assert.deepEqual(stored(st), []);
});

test('outbox: a blocked storage falls back to memory and still delivers', async () => {
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  let n = 0;
  const o = ob.createOutbox({ url: 'u', storage: broken, session: broken, ...fast, fetchImpl: async () => { n++; return answer(OK); } });
  o.send('k', { event: 'a', submissionId: 's' });
  await o.idle();
  assert.equal(n, 1);
  assert.equal(o.statusOf('k'), 'sent');
});
