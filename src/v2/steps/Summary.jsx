import { useState } from 'react';
import { OFFERS } from '../config/offers.js';
import { WHAT_TO_BRING } from '../config/site.js';
import { HDAYS, dowOf, fmtDots } from '../lib/civil-date.js';
import { waLink, QUESTION_WA } from '../lib/messages.js';
import { Button, BackButton, Time, T, Icon, Notice } from '../ui/primitives.jsx';
import { PriceLine, Location } from './Group.jsx';

export function SlotList({ slots }) {
  if (!slots.length) return <p className="eb-muted">מועדים יתואמו טלפונית בהמשך</p>;
  return (
    <ul className="eb-slots">
      {slots.map((s) => (
        <li key={s.date}>יום {HDAYS[dowOf(s.date)]}, <T>{fmtDots(s.date)}</T> · <Time start={s.start} end={s.end} /></li>
      ))}
    </ul>
  );
}

export function OrderCard({ group, offer, slots }) {
  return (
    <div className="eb-card">
      <div className="eb-card__row">
        <div>
          <p className="eb-card__title"><T>{group.label}</T></p>
          <p className="eb-muted">{OFFERS[offer].title}</p>
        </div>
        <PriceLine offer={offer} groupId={group.id} />
      </div>
      <SlotList slots={slots} />
    </div>
  );
}

export function WhatToBring() {
  const [open, setOpen] = useState(false);
  return (
    <div className="eb-disclosure">
      <button type="button" className="eb-disclosure__btn" aria-expanded={open} aria-controls="eb-wtb" onClick={() => setOpen(!open)}>
        🎒 מה להביא לשיעור הראשון?
        <span className="eb-disclosure__chev" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <ul id="eb-wtb" className="eb-disclosure__panel" hidden={!open}>
        {WHAT_TO_BRING.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  );
}

export function Summary({ state, group, slots, back, pay, callback, Heading, failed, retry }) {
  return (
    <section className="eb-step">
      <BackButton onClick={back} />
      <Heading>סיכום והרשמה</Heading>
      <p className="eb-lead">בדקו את הפרטים והבטיחו מקום</p>
      {failed > 0 && (
        <Notice>
          לא הצלחנו לשמור את הפרטים אצלנו. <button type="button" className="eb-link" onClick={retry}>ניסיון נוסף</button>
          {' '}או <a className="eb-link" href={waLink(QUESTION_WA)} target="_blank" rel="noopener noreferrer">כתבו לנו בוואטסאפ</a>
        </Notice>
      )}
      <OrderCard group={group} offer={state.offer} slots={slots} />
      <Location />
      <h3 className="eb-subhead">איך תרצו להמשיך?</h3>
      <div className="eb-option">
        <p className="eb-option__title">הרשמה מהירה (תשלום אונליין)</p>
        <p className="eb-meta"><Icon name="lock" size={14} /> תשלום מאובטח ומוצפן · השיבוץ יאושר סופית ע"י הצוות</p>
        <Button onClick={pay}>מעבר למערכת ההזמנה</Button>
      </div>
      <div className="eb-option">
        <p className="eb-option__title">נציג יחזור אליי (לתיאום והרשמה)</p>
        <p className="eb-meta">נפתח שיחת וואטסאפ עם הפרטים שמילאתם.</p>
        <Button variant="wa" onClick={callback}><Icon name="wa" size={18} /> בקשת שיחה חוזרת בוואטסאפ</Button>
      </div>
      <WhatToBring />
    </section>
  );
}
