// Small shared UI pieces. Native controls first: radios for choices, buttons for actions, links for navigation.
import { useId } from 'react';

/** Text with every run of digits/prices/times isolated LTR inside the RTL flow (e.g. "₪99", "17:00-17:45", "6-8"). */
export function T({ children }) {
  if (typeof children !== 'string') return children;
  const parts = children.split(/(₪?\d[\d:.,\-+]*\d\+?|₪?\d\+?)/g);
  return parts.map((p, i) => (i % 2 ? <bdi key={i} dir="ltr">{p}</bdi> : p));
}

export const Price = ({ value }) => <bdi dir="ltr">₪{value}</bdi>;
export const Time = ({ start, end }) => <bdi dir="ltr">{end ? `${start}-${end}` : start}</bdi>;

const ICONS = {
  check: 'M5 10.5L8.5 14L15 7',
  back: 'M7 4l6 6-6 6',
  pin: 'M10 18s6-5.2 6-9.5A6 6 0 0 0 4 8.5C4 12.8 10 18 10 18Zm0-7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  clock: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-10v3.5l2.5 1.5',
  lock: 'M6 9V7a4 4 0 1 1 8 0v2M5 9h10v8H5z',
  calendar: 'M4 6h12v11H4zM4 9.5h12M7.5 3.5v4M12.5 3.5v4',
  chevronPrev: 'M8 5l5 5-5 5',
  chevronNext: 'M12 5l-5 5 5 5',
  info: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-4v-3.5M10 7h.01',
};
export function Icon({ name, size = 18 }) {
  if (name === 'wa') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Button({ variant = 'primary', children, className = '', ...rest }) {
  return <button type="button" className={`eb-btn eb-btn--${variant} ${className}`} {...rest}>{children}</button>;
}
export function LinkButton({ variant = 'secondary', children, className = '', ...rest }) {
  return <a className={`eb-btn eb-btn--${variant} ${className}`} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
}

export function BackButton({ onClick }) {
  return (
    <button type="button" className="eb-back" onClick={onClick}>
      <Icon name="back" size={16} /> חזרה
    </button>
  );
}

/**
 * A radio rendered as a card. The radio is NAMED by `title` and DESCRIBED by the details (`children`), so a
 * screen reader announces "ילדים 6-8, radio" and then the description, not the whole card as one name.
 * `name` groups the radios; the fieldset/legend lives with the caller.
 */
export function Choice({ name, value, checked, onChange, title, aside, children, className = '', accent }) {
  const id = useId();
  const tid = `${id}t`, did = `${id}d`;
  return (
    <label htmlFor={id} className={`eb-choice ${checked ? 'is-checked' : ''} ${className}`} data-accent={accent}>
      <input id={id} type="radio" className="eb-choice__input" name={name} value={value} checked={checked}
        aria-labelledby={tid} aria-describedby={children ? did : undefined} onChange={() => onChange(value)} />
      <span className="eb-choice__mark" aria-hidden="true"><Icon name="check" size={14} /></span>
      <span className="eb-choice__body">
        <span className="eb-choice__head"><span id={tid} className="eb-choice__title">{title}</span>{aside}</span>
        {children && <span id={did} className="eb-choice__details">{children}</span>}
      </span>
    </label>
  );
}

export function Field({ label, error, hint, children, id }) {
  const errId = `${id}-err`, hintId = `${id}-hint`;
  const described = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="eb-field">
      <label className="eb-field__label" htmlFor={id}>{label}</label>
      {children({ 'aria-describedby': described, 'aria-invalid': error ? 'true' : undefined })}
      {hint && <p id={hintId} className="eb-field__hint">{hint}</p>}
      {error && <p id={errId} className="eb-field__error">{error}</p>}
    </div>
  );
}

export function Notice({ children, onDismiss }) {
  if (!children) return null;
  return (
    <div className="eb-notice" role="status">
      <Icon name="info" size={16} />
      <span>{children}</span>
      {onDismiss && <button type="button" className="eb-notice__close" onClick={onDismiss} aria-label="סגירת ההודעה">×</button>}
    </div>
  );
}

export function Stepper({ steps, names, current }) {
  const idx = Math.max(0, steps.indexOf(current));
  return (
    <div className="eb-stepper">
      <p className="eb-stepper__label">שלב <T>{`${idx + 1}`}</T> מתוך <T>{`${steps.length}`}</T> · {names[steps[idx]]}</p>
      <ol className="eb-stepper__bar" aria-hidden="true">
        {steps.map((s, i) => <li key={s} className={i < idx ? 'is-done' : i === idx ? 'is-current' : ''} />)}
      </ol>
    </div>
  );
}
