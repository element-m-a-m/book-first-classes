// Private path (decision 2): goal x format with prices -> name/phone/note -> private_inquiry ->
// confirmation with one optional WhatsApp button (never opened automatically).
import { GOALS, FORMATS, pricesFor, goalById, SERIES_NOTE, FIRST_NOTE } from '../config/private.js';
import { waLink, privateWA } from '../lib/messages.js';
import { toE164 } from '../lib/phone.js';
import { Button, LinkButton, BackButton, Choice, Field, Price, Icon, T } from '../ui/primitives.jsx';
import { NameField, PhoneField, Privacy, contactErrors } from './Contact.jsx';

export function PrivateGoal({ state, dispatch, next, back, Heading }) {
  const p = state.goal ? pricesFor(state.goal, state.format) : null;
  return (
    <section className="eb-step">
      <BackButton onClick={back} />
      <Heading>איזה אימון מתאים לכם?</Heading>
      <p className="eb-lead">מתחילים בהיכרות ובהערכה, ומגדירים יחד את הכיוון.</p>
      <fieldset className="eb-segment eb-private-formats">
        <legend className="eb-subhead">באיזה הרכב תרצו להתאמן?</legend>
        {FORMATS.map((f) => (
          <Choice key={f.id} name="format" value={f.id} checked={state.format === f.id} onChange={(format) => dispatch({ type: 'format', format })} className="eb-segment__item" title={f.label}>
            <span className="eb-segment__sub">{f.desc}</span>
          </Choice>
        ))}
      </fieldset>
      <fieldset className="eb-choices">
        <legend className="eb-subhead">מה תרצו לפתח?</legend>
        {GOALS.map((g) => {
          return (
            <Choice key={g.id} name="goal" value={g.id} checked={state.goal === g.id} onChange={(goal) => dispatch({ type: 'goal', goal })} className="eb-group" title={g.label}>
              <span className="eb-group__desc">{g.desc}</span>
            </Choice>
          );
        })}
      </fieldset>
      {p && (
        <div className="eb-card" aria-live="polite">
          <p className="eb-card__title">{goalById(state.goal).label} · {state.format === 'duo' ? 'זוגי' : 'אישי'}</p>
          <dl className="eb-rates">
            <div><dt>מפגש ראשון</dt><dd><Price value={p.first.price} /> · <T>{`${p.first.mins}`}</T> דקות</dd></div>
            <div><dt>סדרה של 10 מפגשים</dt><dd><Price value={p.series.price} /> למפגש · <T>{`${p.series.mins}`}</T> דקות</dd></div>
          </dl>
          <p className="eb-meta">{state.format === 'duo' ? 'המחיר הוא למפגש זוגי, לשני המתאמנים יחד. ' : ''}{FIRST_NOTE} {SERIES_NOTE}</p>
        </div>
      )}
      <Button onClick={next} disabled={!state.goal}>המשך</Button>
      {!state.goal && <p className="eb-hint">בחרו תחום כדי לראות את המחיר והמשך התיאום.</p>}
    </section>
  );
}

export function PrivateContact({ state, dispatch, submit, back, Heading }) {
  const err = contactErrors(state, { medical: false });
  // Errors appear only after a submit attempt, then update live: validating on blur inserted an error line above
  // the button on mousedown, the button moved, and the click was lost (found by the e2e suite).
  const show = (k) => state.touched.submit && err[k];
  return (
    <section className="eb-step">
      <BackButton onClick={back} />
      <Heading>פרטים ליצירת קשר</Heading>
      <p className="eb-lead">נחזור אליכם לתיאום המפגש הראשון.</p>
      <form className="eb-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <NameField state={state} dispatch={dispatch} error={show('name')} />
        <PhoneField state={state} dispatch={dispatch} error={show('phone')} />
        <Field id="eb-note" label="הערות (לא חובה)">
          {(a) => (
            <textarea id="eb-note" className="eb-input eb-textarea" value={state.note}
              placeholder="ספרו לנו על המטרה שלכם, וציינו אם יש מגבלות רפואיות שחשוב שנדע עליהן..."
              onChange={(e) => dispatch({ type: 'field', field: 'note', value: e.target.value })} {...a} />
          )}
        </Field>
        <Privacy />
        <Button type="submit">שליחת פנייה</Button>
      </form>
    </section>
  );
}

export function PrivateDone({ state, restart, Heading }) {
  const goal = goalById(state.goal);
  const fmt = FORMATS.find((f) => f.id === state.format);
  const text = privateWA({ name: state.name, e164: toE164(state.phone), goalLabel: goal ? goal.label : '', formatLabel: fmt ? fmt.label : '', note: state.note.trim() });
  return (
    <section className="eb-step eb-done">
      <span className="eb-done__icon" aria-hidden="true"><Icon name="check" size={26} /></span>
      <Heading>הפנייה נשלחה</Heading>
      <p className="eb-lead">נחזור אליכם לתיאום.</p>
      <p className="eb-meta">רוצים להתחיל כבר עכשיו? אפשר גם לכתוב לנו בוואטסאפ.</p>
      <div className="eb-footer">
        <LinkButton variant="wa" href={waLink(text)}><Icon name="wa" size={16} /> המשך בוואטסאפ</LinkButton>
        <Button variant="secondary" onClick={restart}>חזרה להתחלה</Button>
      </div>
    </section>
  );
}
