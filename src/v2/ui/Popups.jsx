// Exit intent retains its existing presentation. Idle help floats over the visible viewport
// without resizing the iframe, moving the form, or stealing keyboard focus.
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

export function IdleNudge({ groupLabel, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const panel = ref.current;
    const previous = document.activeElement;
    let parentWindow = null, frame = null, observed = null;
    try {
      frame = window.frameElement;
      if (frame) { void window.parent.document; parentWindow = window.parent; }
    } catch { /* Cross-origin hosts use the intersection fallback below. */ }
    const place = () => {
      let top = window.visualViewport?.offsetTop || 0;
      let bottom = top + (window.visualViewport?.height || window.innerHeight);
      if (parentWindow && frame) {
        const rect = frame.getBoundingClientRect();
        const viewport = parentWindow.visualViewport;
        const start = viewport?.offsetTop || 0;
        top = Math.max(0, start - rect.top);
        bottom = Math.min(window.innerHeight, start + (viewport?.height || parentWindow.innerHeight) - rect.top);
      } else if (window.parent !== window && observed) {
        top = observed.top; bottom = observed.bottom;
      }
      const available = bottom - top - 24;
      // Defer the nudge when only a sliver of the iframe is visible; never expand the frame.
      panel.style.visibility = available >= 200 ? 'visible' : 'hidden';
      panel.style.maxHeight = Math.max(0, available) + 'px';
      panel.style.top = Math.max(top + 12, bottom - panel.offsetHeight - 12) + 'px';
    };
    const escape = e => { if (e.key === 'Escape') closeRef.current(); };
    const observer = new ResizeObserver(place);
    observer.observe(panel);
    const intersection = new IntersectionObserver(entries => {
      observed = entries[0].intersectionRect;
      place();
    }, { threshold: Array.from({length:101}, (_, i) => i / 100) });
    intersection.observe(panel.closest('.eb'));
    const targets = [window, window.visualViewport, parentWindow, parentWindow?.visualViewport].filter(Boolean);
    for (const target of targets) {
      target.addEventListener('scroll', place, {passive:true, capture:true});
      target.addEventListener('resize', place);
    }
    document.addEventListener('keydown', escape);
    parentWindow?.document.addEventListener('keydown', escape);
    place();
    return () => {
      observer.disconnect(); intersection.disconnect();
      targets.forEach(target => { target.removeEventListener('scroll', place, true); target.removeEventListener('resize', place); });
      document.removeEventListener('keydown', escape);
      parentWindow?.document.removeEventListener('keydown', escape);
      if (panel.contains(document.activeElement) && previous?.isConnected) previous.focus({preventScroll:true});
    };
  }, []);
  return (
    <div ref={ref} className="eb-pop eb-pop--help" role="region" aria-labelledby="eb-idle-title">
      <button type="button" className="eb-pop__close" aria-label="סגירת העזרה" onClick={onClose}>×</button>
      <p id="eb-idle-title" className="eb-pop__title">צריכים עזרה? 😊</p>
      <p className="eb-pop__text">אנחנו כאן בשבילכם – שלחו הודעה ונעזור לסיים את ההרשמה</p>
      <div className="eb-pop__row">
        <a className="eb-btn eb-btn--wa" href={waLink(idleWA(groupLabel))} target="_blank" rel="noopener noreferrer" onClick={onClose}><Icon name="wa" size={16} /> שלחו הודעה</a>
        <button type="button" className="eb-btn eb-btn--secondary" onClick={onClose}>ממשיך/ה</button>
      </div>
    </div>
  );
}
