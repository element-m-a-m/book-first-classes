import { waLink, QUESTION_WA } from '../lib/messages.js';
import { Button, LinkButton, Icon, BackButton } from '../ui/primitives.jsx';
import { CalendarButton } from '../ui/CalendarButton.jsx';
import { OrderCard, WhatToBring } from './Summary.jsx';

// Honest screens (2.2): a done screen says "sent" only once the backend answered ok: true. Until then it says it is
// sending; a failure is said plainly, with the WhatsApp way in.
export const SENDING = 'שולחים את הפרטים...';
export const RETRYING = 'הפרטים עוד לא הגיעו אלינו. ממשיכים לנסות לשלוח.';
export const REFUSED = 'לא הצלחנו לקבל את הפנייה כרגע.';

/** The heading for a done screen whose event is in `delivery` (sending | retrying | sent | failed). */
export const deliveryHeading = (delivery, sentText) => (delivery === 'sent' ? sentText : delivery === 'failed' ? REFUSED : SENDING);

export function DeliveryNote({ delivery, retry }) {
  if (delivery === 'retrying') return <p className="eb-meta" role="status">{RETRYING}</p>;
  if (delivery !== 'failed') return null;
  return (
    <p className="eb-meta" role="status">
      <button type="button" className="eb-link" onClick={retry}>ניסיון נוסף</button>
      {' '}או <a className="eb-link" href={waLink(QUESTION_WA)} target="_blank" rel="noopener noreferrer">כתבו לנו בוואטסאפ</a>
    </p>
  );
}

function Footer({ restart }) {
  return (
    <div className="eb-footer">
      <LinkButton variant="wa" href={waLink(QUESTION_WA)}><Icon name="wa" size={16} /> יש לי שאלה</LinkButton>
      <Button variant="secondary" onClick={restart}>הזמנת שיעור נוסף</Button>
    </div>
  );
}

export function DoneCallback({ group, state, slots, restart, back, Heading, delivery, retry }) {
  const sent = delivery === 'sent';
  return (
    <section className="eb-step eb-done">
      <BackButton onClick={back} />
      {sent && <span className="eb-done__icon" aria-hidden="true"><Icon name="check" size={26} /></span>}
      <Heading>{deliveryHeading(delivery, 'הפנייה נשלחה בהצלחה!')}</Heading>
      <DeliveryNote delivery={delivery} retry={retry} />
      {sent && <p className="eb-lead">נציג שלנו יחזור אליך בהקדם לתיאום והשלמת ההרשמה.</p>}
      <p className="eb-meta">(השיחה נפתחה בחלון וואטסאפ חדש)</p>
      <OrderCard group={group} offer={state.offer} slots={slots} />
      <CalendarButton slots={slots} label={group.label} />
      <WhatToBring />
      <Footer restart={restart} />
    </section>
  );
}
