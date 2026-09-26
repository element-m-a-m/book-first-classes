import { waLink, QUESTION_WA } from '../lib/messages.js';
import { Button, LinkButton, Icon, BackButton } from '../ui/primitives.jsx';
import { CalendarButton } from '../ui/CalendarButton.jsx';
import { OrderCard, WhatToBring } from './Summary.jsx';

function Footer({ restart }) {
  return (
    <div className="eb-footer">
      <LinkButton variant="wa" href={waLink(QUESTION_WA)}><Icon name="wa" size={16} /> יש לי שאלה</LinkButton>
      <Button variant="secondary" onClick={restart}>הזמנת שיעור נוסף</Button>
    </div>
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
