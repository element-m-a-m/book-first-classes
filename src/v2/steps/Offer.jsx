import { OFFERS } from '../config/offers.js';
import { PRICES } from '../config/private.js';
import { Choice, Button, Price } from '../ui/primitives.jsx';

export function Offer({ state, dispatch, next, Heading }) {
  const choose = (offer) => dispatch({ type: 'offer', offer });
  const t = OFFERS.trial3, s = OFFERS.single;
  const averageDiscount = Math.round(((1 - t.price / t.compare.kids) + (1 - t.price / t.compare.other)) * 50);
  return (
    <section className="eb-step">
      <Heading>איך תרצו להתחיל?</Heading>
      <fieldset className="eb-choices">
        <legend className="eb-sr">מסלול היכרות</legend>
        <Choice name="offer" value="trial3" checked={state.offer === 'trial3'} onChange={choose} className="eb-offer"
          title={t.title} aside={<span className="eb-badge">{averageDiscount}% הנחה!</span>}>
          <span className="eb-offer__pricing">
            <span className="eb-offer__price"><Price value={t.price} /></span>
          </span>
          <span className="eb-offer__meta">{t.perk}</span>
        </Choice>
        <Choice name="offer" value="single" checked={state.offer === 'single'} onChange={choose} className="eb-offer" title={s.title}>
          <span className="eb-offer__rates">
            <span><span className="eb-offer__price"><Price value={s.price.kids} /></span><span className="eb-offer__meta">לקבוצות הילדים</span></span>
            <span><span className="eb-offer__price"><Price value={s.price.other} /></span><span className="eb-offer__meta">לנוער ובוגרים</span></span>
          </span>
        </Choice>
        <Choice name="offer" value="private" checked={state.offer === 'private'} onChange={choose} className="eb-offer" title={OFFERS.private.title}>
          <span className="eb-offer__meta">לחימה, כושר או שיקום. מפגש ראשון מ־<Price value={PRICES.individual.standard.first.price} /></span>
        </Choice>
      </fieldset>
      <Button onClick={next} disabled={!state.offer}>המשך</Button>

    </section>
  );
}
