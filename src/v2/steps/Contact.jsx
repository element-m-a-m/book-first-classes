import { PRIVACY_LINE, PRIVACY_URL } from '../config/site.js';
import { isValidName, isValidPhone } from '../lib/phone.js';
import { Button, Choice, Field, Icon } from '../ui/primitives.jsx';

export const ERR_NAME = '* נא להזין שם מלא';
export const ERR_PHONE = '* נא להזין מספר טלפון תקין';
export const ERR_MED = '* נא לבחור תשובה';

export function contactErrors(state, { medical = true } = {}) {
  return {
    name: isValidName(state.name) ? null : ERR_NAME,
    phone: isValidPhone(state.phone) ? null : ERR_PHONE,
    med: medical && state.medHas === null ? ERR_MED : null,
  };
}

export function NameField({ state, dispatch, error }) {
  return (
    <Field id="eb-name" label="שם מלא" error={error}>
      {(a) => (
        <input id="eb-name" className="eb-input" value={state.name} autoComplete="name" enterKeyHint="next"
          onChange={(e) => dispatch({ type: 'field', field: 'name', value: e.target.value })} {...a} />
      )}
    </Field>
  );
}

export function PhoneField({ state, dispatch, error }) {
  return (
    <Field id="eb-phone" label="טלפון נייד" error={error}>
      {(a) => (
        <div className="eb-phone" dir="ltr">
          <span className="eb-phone__prefix" aria-hidden="true">+972</span>
          <input id="eb-phone" className="eb-input eb-input--phone" type="tel" inputMode="tel" autoComplete="tel-national"
            placeholder="50-1234567" value={state.phone}
            onChange={(e) => dispatch({ type: 'field', field: 'phone', value: e.target.value })} {...a} />
        </div>
      )}
    </Field>
  );
}

export function Privacy() {
  return (
    <p className="eb-privacy">
      <Icon name="lock" size={14} /> {PRIVACY_LINE}{' '}
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">מדיניות הפרטיות</a>
    </p>
  );
}

export function Contact({ state, dispatch, submit, back, Heading }) {
  const err = contactErrors(state);
  // Errors appear only after a submit attempt, then update live: validating on blur inserted an error line above
  // the button on mousedown, the button moved, and the click was lost (found by the e2e suite).
  const show = (k) => state.touched.submit && err[k];
  return (
    <section className="eb-step">
      <Heading>פרטי קשר לשמירת מקום</Heading>
      <form className="eb-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <NameField state={state} dispatch={dispatch} error={show('name')} />
        <PhoneField state={state} dispatch={dispatch} error={show('phone')} />
        <fieldset className="eb-health" aria-describedby={show('med') ? 'eb-med-err' : undefined}>
          <legend className="eb-subhead">איך נוכל לשמור עליך הכי טוב באימון?</legend>
          <p className="eb-meta">נשמח לדעת על מגבלות רפואיות או פציעות חשובות כדי להתאים לך את הפעילות.</p>
          <div className="eb-segment eb-segment--tight">
            <Choice name="med" value="no" checked={state.medHas === false} className="eb-segment__item" title="הכל תקין"
              onChange={(value) => dispatch({ type: 'field', field: 'medHas', value: value === null ? null : false })} />
            <Choice name="med" value="yes" checked={state.medHas === true} className="eb-segment__item" title="יש מה לדעת"
              onChange={(value) => dispatch({ type: 'field', field: 'medHas', value: value === null ? null : true })} />
          </div>
          {show('med') && <p id="eb-med-err" className="eb-field__error">{err.med}</p>}
          {state.medHas === true && (
            <Field id="eb-med" label="פרטים">
              {(a) => (
                <textarea id="eb-med" className="eb-input eb-textarea" value={state.medText} placeholder="פרטו בקצרה: פציעות עבר, מגבלות..."
                  onChange={(e) => dispatch({ type: 'field', field: 'medText', value: e.target.value })} {...a} />
              )}
            </Field>
          )}
        </fieldset>
        <Privacy />
        <Button type="submit" onClick={undefined}>המשך לסיכום</Button>
      </form>
    </section>
  );
}
