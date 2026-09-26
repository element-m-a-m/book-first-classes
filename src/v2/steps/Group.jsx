import { GROUPS, accentOf } from '../config/groups.js';
import { slotsOf } from '../config/timetable.js';
import { OFFERS, priceFor, comparePriceFor } from '../config/offers.js';
import { ADDRESS_ROWS } from '../config/site.js';
import { HDAYS } from '../lib/civil-date.js';
import { Choice, Button, BackButton, Price, Time, T, Icon, Notice } from '../ui/primitives.jsx';

/** "ראשון ורביעי · 17:00-17:45", or one line per day when the times differ. */
export function scheduleLines(groupId) {
  const byTime = new Map();
  for (const s of slotsOf(groupId)) {
    const k = `${s.start}-${s.end}`;
    if (!byTime.has(k)) byTime.set(k, { start: s.start, end: s.end, days: [] });
    byTime.get(k).days.push(HDAYS[s.dow]);
  }
  return [...byTime.values()].map((x) => ({ ...x, days: x.days.length > 1 ? x.days.slice(0, -1).join(', ') + ' ו' + x.days.at(-1) : x.days[0] }));
}

export function PriceLine({ offer, groupId }) {
  if (offer === 'trial3') {
    return <span className="eb-price"><Price value={OFFERS.trial3.price} /> <span className="eb-price__was">במקום <del><Price value={comparePriceFor('trial3', groupId)} /></del></span></span>;
  }
  return <span className="eb-price"><Price value={priceFor(offer, groupId)} /></span>;
}

export function Location() {
  return (
    <div className="eb-location">
      <Icon name="pin" size={18} />
      <address>{ADDRESS_ROWS.map((r) => <span key={r}>{r}</span>)}</address>
    </div>
  );
}

export function Group({ state, dispatch, next, back, Heading }) {
  const list = GROUPS.filter((g) => !state.audience || g.audience === state.audience);
  return (
    <section className="eb-step">
      <BackButton onClick={back} />
      <Heading>עבור מי השיעור?</Heading>
      <fieldset className="eb-segment">
        <legend className="eb-sr">עבור מי השיעור?</legend>
        {[['self', 'עבורי', 'בוגרים ומבוגרים'], ['child', 'עבור הילד/ה שלי', 'ילדים ונוער']].map(([v, l, sub]) => (
          <Choice key={v} name="audience" value={v} checked={state.audience === v} title={l}
            onChange={(audience) => dispatch({ type: 'audience', audience })} className="eb-segment__item">
            <span className="eb-segment__sub">{sub}</span>
          </Choice>
        ))}
      </fieldset>
      <Notice onDismiss={() => dispatch({ type: 'field', field: 'notice', value: null })}>{state.notice}</Notice>
      {state.audience && (
        <fieldset className="eb-choices">
          <legend className="eb-subhead">בחרו את השיעור הרצוי:</legend>
          {list.map((g) => (
            <Choice key={g.id} name="group" value={g.id} checked={state.groupId === g.id} accent={accentOf(g)}
              onChange={(groupId) => dispatch({ type: 'group', groupId })} className="eb-group"
              title={<T>{g.label}</T>} aside={g.tag && <span className="eb-tag">{g.tag}</span>}>
              <span className="eb-group__desc">{g.desc}</span>
              <span className="eb-group__when">
                {scheduleLines(g.id).map((l) => (
                  <span key={l.start}><Icon name="clock" size={14} /> {l.days} · <Time start={l.start} end={l.end} /></span>
                ))}
              </span>
              <span className="eb-group__foot">
                {!g.desc.includes('בהנחיית') && <span className="eb-group__coach">בהנחיית {g.coach}</span>}
                <PriceLine offer={state.offer} groupId={g.id} />
              </span>
            </Choice>
          ))}
        </fieldset>
      )}
      <Location />
      <Button onClick={next} disabled={!state.groupId}>המשך לבחירת מועדים</Button>
    </section>
  );
}
