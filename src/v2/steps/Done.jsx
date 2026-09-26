import { useEffect, useState } from 'react';
import { payUrlFor } from '../config/offers.js';
import { waLink, QUESTION_WA, buildICS } from '../lib/messages.js';
import { Button, LinkButton, Icon, BackButton } from '../ui/primitives.jsx';
import { OrderCard, WhatToBring } from './Summary.jsx';

const PAY_PROGRESS_MS = 12000;

function downloadICS(slots, label) {
  try {
    const blob = new Blob([buildICS(slots, label)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'element-classes.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { /* download blocked */ }
}

function Footer({ restart }) {
  return (
    <div className="eb-footer">
      <LinkButton variant="wa" href={waLink(QUESTION_WA)}><Icon name="wa" size={16} /> יש לי שאלה</LinkButton>
      <Button variant="secondary" onClick={restart}>הזמנת שיעור נוסף</Button>
    </div>
  );
}

function CalendarButton({ slots, label }) {
  if (!slots.length) return null;
  return (
    <div className="eb-center">
      <Button variant="secondary" onClick={() => downloadICS(slots, label)}><Icon name="calendar" size={16} /> הוספה ליומן</Button>
      <p className="eb-meta">* באנדרואיד: יש לפתוח את הקובץ לאחר ההורדה</p>
    </div>
  );
}

export function Done({ state, group, slots, restart, Heading }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / PAY_PROGRESS_MS) * 100);
      setPct(p);
      if (p >= 100) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);
  const url = payUrlFor(state.offer, group.id);
  const ready = pct >= 100;
  return (
    <section className="eb-step eb-done">
      <span className="eb-done__icon" aria-hidden="true"><Icon name="check" size={26} /></span>
      <Heading>ההזמנה שלכם מוכנה!</Heading>
      <p className="eb-lead">הפרטים נשמרו. כדי להבטיח את מקומכם, אנא השלימו את התשלום בעמוד שייפתח.</p>
      <p className="eb-meta">* השיבוץ יאושר סופית ע"י הצוות (במקרה של שינויים נעדכן).</p>
      <OrderCard group={group} offer={state.offer} slots={slots} />
      <div className="eb-progress">
        <p className="eb-progress__label">{ready ? '✅ עמוד התשלום מוכן!' : '⏳ מכינים את עמוד התשלום...'}</p>
        <div className="eb-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="הכנת עמוד התשלום">
          <span style={{ inlineSize: `${pct}%` }} />
        </div>
        <LinkButton variant={ready ? 'primary' : 'secondary'} href={url}>{ready ? 'לחצו כאן לתשלום מאובטח' : 'מעבר מיידי לתשלום'}</LinkButton>
      </div>
      <CalendarButton slots={slots} label={group.label} />
      <WhatToBring />
      <Footer restart={restart} />
    </section>
  );
}

export function DoneCallback({ group, state, slots, restart, back, Heading }) {
  return (
    <section className="eb-step eb-done">
      <BackButton onClick={back} />
      <span className="eb-done__icon" aria-hidden="true"><Icon name="check" size={26} /></span>
      <Heading>הפנייה נשלחה בהצלחה!</Heading>
      <p className="eb-lead">נציג שלנו יחזור אליך בהקדם לתיאום והשלמת ההרשמה.</p>
      <p className="eb-meta">(השיחה נפתחה בחלון וואטסאפ חדש)</p>
      <OrderCard group={group} offer={state.offer} slots={slots} />
      <CalendarButton slots={slots} label={group.label} />
      <WhatToBring />
      <Footer restart={restart} />
    </section>
  );
}
