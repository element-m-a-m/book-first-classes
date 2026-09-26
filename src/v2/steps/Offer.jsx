import { OFFERS } from '../config/offers.js';
import { PRICES } from '../config/private.js';
import { Choice, Button, Price } from '../ui/primitives.jsx';

export function Offer({ state, dispatch, next, Heading }) {
  const choose = (offer) => dispatch({ type: 'offer', offer });
  const t = OFFERS.trial3, s = OFFERS.single;
  return (
    <section className="eb-step">
      <Heading>איך תרצו להתחיל?</Heading>
      <p className="eb-lead">בוחרים מסלול, ובשלב הבא את הקבוצה והמועדים.</p>
      <fieldset className="eb-choices">
        <legend className="eb-sr">מסלול היכרות</legend>
        <Choice name="offer" value="trial3" checked={state.offer === 'trial3'} onChange={choose} className="eb-offer"
          title={t.title} aside={<span className="eb-badge">{t.saleLabel}</span>}>
          <span className="eb-offer__price"><Price value={t.price} /></span>
          <span className="eb-offer__compare">
            במקום <del><Price value={t.compare.kids} /></del> לילדים · <del><Price value={t.compare.other} /></del> לנוער ולבוגרים
          </span>
          <span className="eb-offer__meta">{t.perk} · {t.validity} · בשיעורי הקבוצות</span>
        </Choice>
        <Choice name="offer" value="single" checked={state.offer === 'single'} onChange={choose} className="eb-offer" title={s.title}>
          <span className="eb-offer__rates">
            <span><Price value={s.price.kids} /> לקבוצות הילדים</span>
            <span><Price value={s.price.other} /> לנוער ובוגרים</span>
          </span>
        </Choice>
        <Choice name="offer" value="private" checked={state.offer === 'private'} onChange={choose} className="eb-offer" title={OFFERS.private.title}>
          <span className="eb-offer__meta">לחימה, כושר או שיקום. מפגש ראשון מ־<Price value={PRICES.individual.standard.first.price} /></span>
        </Choice>
      </fieldset>
      <Button onClick={next} disabled={!state.offer}>המשך</Button>
      {!state.offer && <p className="eb-hint">בחירת מסלול פותחת את השלב הבא.</p>}
    </section>
  );
}
