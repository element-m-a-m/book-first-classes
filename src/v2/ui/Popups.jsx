// Kept pressure devices (decision 8): exit-intent and the idle nudge. Standalone they float; embedded they render
// inline at the top of the step (an overlay inside an iframe can sit off-screen), and exit-intent comes from the
// parent page's `exitIntent` message because mouseleave inside an iframe misfires.
import { useEffect, useRef } from 'react';
import { waLink, EXIT_WA, idleWA } from '../lib/messages.js';
import { Icon } from './primitives.jsx';

export function ExitIntent({ inline, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!inline && ref.current) ref.current.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  const body = (
    <div className={`eb-pop ${inline ? 'eb-pop--inline' : 'eb-pop--modal'}`} role={inline ? 'region' : 'dialog'} aria-modal={inline ? undefined : 'true'}
      aria-labelledby="eb-exit-title" tabIndex={-1} ref={ref}>
      <p id="eb-exit-title" className="eb-pop__title">מתלבטים?</p>
      <p className="eb-pop__text">יש לכם שאלה לפני שמזמינים? דברו ישירות עם ליאור המאמן בוואטסאפ ונעזור לכם למצוא את המסגרת המתאימה ביותר.</p>
      <a className="eb-btn eb-btn--wa" href={waLink(EXIT_WA)} target="_blank" rel="noopener noreferrer" onClick={onClose}><Icon name="wa" size={18} /> שיחה בוואטסאפ</a>
      <button type="button" className="eb-link" onClick={onClose}>לא תודה, אחזור להזמנה</button>
    </div>
  );
  return inline ? body : <div className="eb-scrim">{body}</div>;
}

export function IdleNudge({ inline, groupLabel, onClose }) {
  return (
    <div className={`eb-pop ${inline ? 'eb-pop--inline' : 'eb-pop--sheet'}`} role="region" aria-labelledby="eb-idle-title">
      <p id="eb-idle-title" className="eb-pop__title">צריכים עזרה? 😊</p>
      <p className="eb-pop__text">אנחנו כאן בשבילכם – שלחו הודעה ונעזור לסיים את ההרשמה</p>
      <div className="eb-pop__row">
        <a className="eb-btn eb-btn--wa" href={waLink(idleWA(groupLabel))} target="_blank" rel="noopener noreferrer" onClick={onClose}><Icon name="wa" size={16} /> שלחו הודעה</a>
        <button type="button" className="eb-btn eb-btn--secondary" onClick={onClose}>ממשיך/ה</button>
      </div>
    </div>
  );
}
