import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { WEBHOOK_URL } from './config/site.js';
import { groupById } from './config/groups.js';
import { slotOn } from './config/timetable.js';
import { OFFERS, priceFor } from './config/offers.js';
import { dowOf } from './lib/civil-date.js';
import { buildPayload, createSender, newSubmissionId, selectionHash } from './lib/events.js';
import { createEmbed } from './lib/embed.js';
import { resolveGroup } from './lib/params.js';
import { waLink, groupWA } from './lib/messages.js';
import { toE164 } from './lib/phone.js';
import { reducer, initialState, withContext, stepsOf, pathOf, STEP_NAMES, DONE_STEPS } from './state/flow.js';
import { Stepper, T, Price } from './ui/primitives.jsx';
import { ExitIntent, IdleNudge } from './ui/Popups.jsx';
import { Offer } from './steps/Offer.jsx';
import { Group, Location } from './steps/Group.jsx';
import { Dates } from './steps/Dates.jsx';
import { Contact, contactErrors } from './steps/Contact.jsx';
import { Summary } from './steps/Summary.jsx';
import { Done, DoneCallback } from './steps/Done.jsx';
import { PrivateGoal, PrivateContact, PrivateDone } from './steps/Private.jsx';
import logoUrl from './assets/logo-96.webp';

const ANALYTICS = { offer: 'Viewed_Offer', group: 'Viewed_Category_Select', dates: 'Viewed_Dates_Select', contact: 'Viewed_Contact',
  summary: 'Viewed_Checkout', done: 'Pending_Payment_Gateway', 'done-callback': 'Completed_Booking_WA', pgoal: 'Viewed_Private_Goal',
  pcontact: 'Viewed_Private_Form', pdone: 'Completed_Private_Lead' };
const ABANDON_MS = 90000;
const IDLE_MS = 60000;

export function App({ params, embedded }) {
  const [state, dispatch] = useReducer(reducer, initialState, (s) => withContext(s, { offer: params.offer, group: params.group }));
  const [failed, setFailed] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const [idleOpen, setIdleOpen] = useState(false);
  const seen = useRef({ exit: false, idle: false });
  const rootRef = useRef(null);
  const headingRef = useRef(null);
  const liveRef = useRef(null);
  const firstRender = useRef(true);
  const stateRef = useRef(state);
  stateRef.current = state;
  const subIds = useRef(new Map());

  // Local previews never reach the production webhook: on localhost the sender records payloads in
  // window.__ebDryRun instead. The e2e harness opts in (window.__EB_ALLOW_WEBHOOK__) and intercepts every request.
  const dryRun = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !window.__EB_ALLOW_WEBHOOK__;
  const sender = useMemo(() => createSender({
    url: WEBHOOK_URL, onFailChange: setFailed,
    fetchImpl: dryRun ? async (u, o) => { (window.__ebDryRun = window.__ebDryRun || []).push(JSON.parse(o.body)); } : undefined,
  }), []);
  const ctx = useMemo(() => ({
    source: embedded ? 'embed' : 'standalone', host: location.hostname, utm: params.utm,
    device: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  }), []);
  const embed = useMemo(() => createEmbed({
    hasInteracted: () => stateRef.current.interacted,
    onContext: ({ offer, group }) => dispatch({ type: 'context', offer: OFFERS[offer] ? offer : null, group: resolveGroup(group), user: false }),
    onExitIntent: () => { if (!seen.current.exit && !DONE_STEPS.includes(stateRef.current.step) && stateRef.current.step !== 'offer') { seen.current.exit = true; setExitOpen(true); } },
  }), []);

  useEffect(() => { embed.observe(rootRef.current); }, []);

  const group = groupById(state.groupId);
  const slots = group ? state.dates.map((d) => { const s = slotOn(group.id, dowOf(d)); return { date: d, start: s.start, end: s.end }; }) : [];
  const steps = stepsOf(state);
  const path = pathOf(state);
  const isDone = DONE_STEPS.includes(state.step);

  // ── step change: focus the heading, announce, tell the parent ──
  useEffect(() => {
    const idx = steps.indexOf(state.step);
    embed.step(state.step, idx, steps.length, path);
    if (window.dataLayer) window.dataLayer.push({ event: ANALYTICS[state.step], category: group ? group.label : undefined, package: state.offer });
    if (firstRender.current) { firstRender.current = false; return; }
    if (headingRef.current) headingRef.current.focus({ preventScroll: true });
    if (!embedded && rootRef.current && rootRef.current.getBoundingClientRect().top < 0) rootRef.current.scrollIntoView({ block: 'start' });
    if (liveRef.current) liveRef.current.textContent = idx >= 0 ? `שלב ${idx + 1} מתוך ${steps.length}: ${STEP_NAMES[state.step]}` : '';
  }, [state.step]);

  // ── events ──
  const snapshot = useCallback((s = stateRef.current) => {
    const g = groupById(s.groupId);
    const sl = g ? s.dates.map((d) => { const x = slotOn(g.id, dowOf(d)); return { date: d, start: x.start, end: x.end }; }) : [];
    const base = { ...s, group: g, slots: sl, offerId: s.offer };
    const h = selectionHash(base);
    if (!subIds.current.has(h)) subIds.current.set(h, newSubmissionId());
    return { ...base, submissionId: subIds.current.get(h), hash: h };
  }, []);
  const fire = (event, snap) => sender.send(`${event}|${snap.submissionId}|${snap.hash}`, buildPayload(event, snap, ctx));

  const focusFirstError = (errs) => {
    const id = errs.name ? 'eb-name' : errs.phone ? 'eb-phone' : null;
    if (id) document.getElementById(id).focus();
    else if (errs.med) document.querySelector('input[name="med"]').focus();
  };

  const submitContact = () => {
    const errs = contactErrors(state);
    if (errs.name || errs.phone || errs.med) { dispatch({ type: 'touch', fields: { submit: true } }); setTimeout(() => focusFirstError(errs)); return; }
    const snap = snapshot();
    fire('lead_started', snap);
    fire('checkout_reached', snap);
    dispatch({ type: 'go', step: 'summary' });
  };
  const submitPrivate = () => {
    const errs = contactErrors(state, { medical: false });
    if (errs.name || errs.phone) { dispatch({ type: 'touch', fields: { submit: true } }); setTimeout(() => focusFirstError(errs)); return; }
    fire('private_inquiry', snapshot());
    dispatch({ type: 'go', step: 'pdone', outcome: 'private' });
    embed.complete('private');
  };
  const pay = () => {
    fire('booking_selfbook', snapshot());
    dispatch({ type: 'go', step: 'done', outcome: 'selfbook' });
    embed.complete('selfbook');
  };
  const callback = () => {
    const snap = snapshot();
    fire('booking_callback', snap);
    const text = groupWA({ name: state.name, e164: toE164(state.phone), groupLabel: group.label, isChild: state.audience === 'child',
      medical: state.medHas ? (state.medText.trim() || 'לא פורט') : '', slots, offerId: state.offer });
    window.open(waLink(text), '_blank', 'noopener');   // synchronously inside the click, or popup blockers win
    dispatch({ type: 'go', step: 'done-callback', outcome: 'callback' });
    embed.complete('callback');
  };

  // ── abandoned checkout: 90 s on the summary without choosing ──
  useEffect(() => {
    if (state.step !== 'summary') return undefined;
    const id = setTimeout(() => fire('abandoned_checkout', snapshot()), ABANDON_MS);
    return () => clearTimeout(id);
  }, [state.step]);

  // ── exit intent (standalone desktop) ──
  useEffect(() => {
    if (embedded) return undefined;
    const h = (e) => {
      const s = stateRef.current;
      if (e.clientY <= 0 && s.step !== 'offer' && !DONE_STEPS.includes(s.step) && !seen.current.exit) { seen.current.exit = true; setExitOpen(true); }
    };
    document.addEventListener('mouseleave', h);
    return () => document.removeEventListener('mouseleave', h);
  }, []);

  // ── idle nudge: 60 s without activity mid-journey ──
  useEffect(() => {
    let last = Date.now();
    const touch = () => { last = Date.now(); };
    const evs = ['click', 'touchstart', 'scroll', 'keydown', 'mousemove'];
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const id = setInterval(() => {
      const s = stateRef.current;
      if (Date.now() - last > IDLE_MS && s.step !== 'offer' && !DONE_STEPS.includes(s.step) && !seen.current.idle) { seen.current.idle = true; setIdleOpen(true); }
    }, 5000);
    return () => { evs.forEach((e) => window.removeEventListener(e, touch)); clearInterval(id); };
  }, []);

  const go = (step) => dispatch({ type: 'go', step });
  const restart = () => { subIds.current.clear(); dispatch({ type: 'reset' }); };
  const Heading = useCallback(({ children }) => <h2 className="eb-h2" tabIndex={-1} ref={headingRef}>{children}</h2>, []);
  const common = { state, dispatch, Heading };

  let body;
  switch (state.step) {
    case 'offer': body = <Offer {...common} next={() => go(state.offer === 'private' ? 'pgoal' : 'group')} />; break;
    case 'group': body = <Group {...common} back={() => go('offer')} next={() => go('dates')} />; break;
    case 'dates': body = <Dates {...common} nowMs={Date.now()} back={() => go('group')} next={() => go('contact')} />; break;
    case 'contact': body = <Contact {...common} back={() => go(state.datesSkipped ? 'dates' : 'dates')} submit={submitContact} />; break;
    case 'summary': body = <Summary {...common} group={group} slots={slots} back={() => go('contact')} pay={pay} callback={callback} failed={failed} retry={() => sender.retryFailed()} />; break;
    case 'done': body = <Done {...common} group={group} slots={slots} restart={restart} />; break;
    case 'done-callback': body = <DoneCallback {...common} group={group} slots={slots} restart={restart} back={() => go('summary')} />; break;
    case 'pgoal': body = <PrivateGoal {...common} back={() => go('offer')} next={() => go('pcontact')} />; break;
    case 'pcontact': body = <PrivateContact {...common} back={() => go('pgoal')} submit={submitPrivate} />; break;
    case 'pdone': body = <PrivateDone {...common} restart={restart} />; break;
    default: body = null;
  }

  const showBar = path === 'group' && group && ['dates', 'contact'].includes(state.step);
  return (
    <div className={`eb ${embedded ? 'eb--embed' : 'eb--standalone'}`} ref={rootRef} lang="he" dir="rtl">
      {!embedded && (
        <header className="eb-brand">
          <img src={logoUrl} alt="" width="40" height="40" />
          <div>
            <p className="eb-brand__name">אלמנט · אומנויות לחימה ותנועה</p>
            <p className="eb-brand__line">הרשמה לשיעורי היכרות ולאימונים אישיים</p>
          </div>
        </header>
      )}
      {!embedded && (
        <section className="eb-standalone-location" aria-labelledby="eb-location-title">
          <h2 id="eb-location-title" className="eb-location-title">כתובת — כאן מתאמנים</h2>
          <Location compact />
          <a className="eb-link" href="https://element-m-a-m.co.il/contact.html#arrival" target="_blank" rel="noopener noreferrer">מפה ופרטי הגעה ↗</a>
        </section>
      )}
      <main className="eb-main">
        {!isDone && <Stepper steps={steps} names={STEP_NAMES} current={state.step} />}
        {showBar && (
          <div className="eb-bar">
            <span><T>{group.label}</T> · {OFFERS[state.offer].title}</span>
            <span className="eb-bar__end"><Price value={priceFor(state.offer, group.id)} />
              <button type="button" className="eb-link" onClick={() => go('offer')}>שינוי</button></span>
          </div>
        )}
        {exitOpen && embedded && <ExitIntent inline onClose={() => setExitOpen(false)} />}
        <div className="eb-transition" key={state.step}>{body}</div>
      </main>
      <p className="eb-sr" aria-live="polite" ref={liveRef} />
      {exitOpen && !embedded && <ExitIntent onClose={() => setExitOpen(false)} />}
      {idleOpen && !isDone && <IdleNudge groupLabel={group && group.label} onClose={() => setIdleOpen(false)} />}
    </div>
  );
}
