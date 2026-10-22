// Unit tests for front end 2.2: the schema-3 payload and "book another" (the outbox: outbox.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const ev = await load('src/v2/lib/events.js');
const fl = await load('src/v2/state/flow.js');
const gr = await load('src/v2/config/groups.js');

const CTX = { device: 'mobile', utm: {}, source: 'standalone', host: 'h' };
const GROUP_SNAP = (over) => ({
  name: ' ילד בדיקה ', parentName: ' הורה בדיקה ', phone: '050-0000000', audience: 'child', offerId: 'trial3',
  group: gr.groupById('kids-6-8'), slots: [], medHas: false, medText: '', submissionId: 'sid',
  goal: null, format: 'individual', note: '', datesSkipped: false, ...over,
});

test('payload: schema 3; a child booking carries both full names, an adult booking none for a parent', () => {
  const child = ev.buildPayload('lead_started', GROUP_SNAP({}), CTX);
  assert.equal(child.schema, 3);
  assert.equal(child.name, 'ילד בדיקה');
  assert.equal(child.parentName, 'הורה בדיקה');
  const adult = ev.buildPayload('lead_started', GROUP_SNAP({ audience: 'adult', parentName: '' }), CTX);
  assert.equal(adult.schema, 3);
  assert.ok(!('parentName' in adult));
  const priv = ev.buildPayload('private_inquiry', GROUP_SNAP({ offerId: 'private', group: null, goal: 'private-fitness' }), CTX);
  assert.ok(!('parentName' in priv));
  // Editing the parent's name draws a fresh submission id (a different selection hash).
  assert.notEqual(ev.selectionHash(GROUP_SNAP({})), ev.selectionHash(GROUP_SNAP({ parentName: 'אחר' })));
});

test('flow: "book another" keeps the parent on a child booking and clears everything on an adult one', () => {
  let s = { ...fl.initialState, offer: 'trial3', audience: 'child', groupId: 'kids-6-8', name: 'ילד', parentName: 'הורה', phone: '0500000000', step: 'summary' };
  const next = fl.reducer(s, { type: 'another' });
  assert.equal(next.parentName, 'הורה');
  assert.equal(next.phone, '0500000000');
  assert.equal(next.name, '');
  assert.equal(next.groupId, null);
  assert.equal(next.step, 'offer');
  s = { ...s, audience: 'adult' };
  const adult = fl.reducer(s, { type: 'another' });
  assert.equal(adult.parentName, '');
  assert.equal(adult.phone, '');
});

test('embed: only Element\'s own origins may talk to an embedded widget (2.2 dropped element-website.pages.dev)', async () => {
  const em = await load('src/v2/lib/embed.js');
  const self = 'https://element-m-a-m.github.io';
  for (const ok of ['https://element-m-a-m.co.il', 'https://www.element-m-a-m.co.il', self]) assert.ok(em.originAllowed(ok, self), ok);
  for (const bad of ['https://element-website.pages.dev', 'https://abc123.element-website.pages.dev', 'https://evil.example']) assert.ok(!em.originAllowed(bad, self), bad);
});
