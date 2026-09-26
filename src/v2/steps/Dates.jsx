import { useMemo, useState } from 'react';
import { groupById } from '../config/groups.js';
import { slotOn, slotsOf, durationOf } from '../config/timetable.js';
import { OFFERS } from '../config/offers.js';
import { civilOf, addDays, dowOf, parts, weekStart, instantOf, HDAYS, HDAYS_S, HMONTHS, fmtLong } from '../lib/civil-date.js';
import { closureFor } from '../lib/closures.js';
import { waLink, daysWA } from '../lib/messages.js';
import { maxDatesOf } from '../state/flow.js';
import { Button, BackButton, Time, T, Icon, Notice, Price } from '../ui/primitives.jsx';

export const WEEKS_PER_PAGE = 4;
export const PAGES = 3;

/** Day cells for one group: status 'open' | 'closed' | 'started' | 'past' | 'none' (not a class day). */
export function buildWeeks(groupId, nowMs, pages = PAGES) {
  const today = civilOf(nowMs);
  const first = weekStart(today);
  const weeks = [];
  for (let w = 0; w < WEEKS_PER_PAGE * pages; w++) {
    const days = [];
    for (let d = 0; d < 6; d++) {
      const date = addDays(first, w * 7 + d);
      const slot = slotOn(groupId, dowOf(date));
      let status = 'none';
      if (slot) {
        if (date < today) status = 'past';
        else if (closureFor(date, groupId).closed) status = 'closed';
        else if (date === today && nowMs >= instantOf(date, slot.start)) status = 'started';
        else status = 'open';
      }
      days.push({ date, slot, status });
    }
    weeks.push(days);
  }
  return weeks;
}

export function Dates({ state, dispatch, next, back, Heading, nowMs }) {
  const group = groupById(state.groupId);
  const [page, setPage] = useState(0);
  const weeks = useMemo(() => buildWeeks(group.id, nowMs), [group.id, nowMs]);
  const max = maxDatesOf(state);
  const full = state.dates.length >= max;
  const shown = weeks.slice(page * WEEKS_PER_PAGE, (page + 1) * WEEKS_PER_PAGE);
  const months = [...new Set(shown.flat().filter((d) => d.slot).map((d) => parts(d.date).m))];
  const year = parts(shown[0][0].date).y;
  const days = slotsOf(group.id).map((s) => s.dow);
  const otherDow = state.offer === 'single' && state.dates.length === 1 ? days.find((d) => d !== dowOf(state.dates[0])) : undefined;
  const minutes = [...new Set(slotsOf(group.id).map(durationOf))];

  return (
    <section className="eb-step">
      <BackButton onClick={back} />
      <Heading>בחרו מועדים</Heading>
      <p className="eb-lead">{state.offer === 'single' ? 'בחרו תאריך לשיעור' : 'סמנו עד 3 תאריכים'}</p>
      <p className="eb-meta"><Icon name="clock" size={14} /> משך השיעור: <T>{minutes.join('/')}</T> דק׳</p>
      <Notice onDismiss={() => dispatch({ type: 'field', field: 'notice', value: null })}>{state.notice}</Notice>

      <div className="eb-cal" aria-labelledby="eb-cal-title">
        <div className="eb-cal__nav">
          <button type="button" className="eb-iconbtn" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="השבועות הקודמים">
            <Icon name="chevronPrev" />
          </button>
          <p id="eb-cal-title" className="eb-cal__title" aria-live="polite">{months.map((m) => HMONTHS[m - 1]).join(' - ')} <T>{String(year)}</T></p>
          <button type="button" className="eb-iconbtn" onClick={() => setPage(page + 1)} disabled={page === PAGES - 1} aria-label="השבועות הבאים">
            <Icon name="chevronNext" />
          </button>
        </div>
        <div className="eb-cal__grid" role="presentation">
          {HDAYS_S.map((d, i) => <span key={d} className={`eb-cal__dow ${days.includes(i) ? 'is-class' : ''}`} aria-hidden="true">{d}</span>)}
          {shown.flat().map((c) => {
            const selected = state.dates.includes(c.date);
            const { d } = parts(c.date);
            if (!c.slot) return <span key={c.date} className="eb-cal__day is-none" aria-hidden="true"><T>{String(d)}</T></span>;
            const blocked = c.status !== 'open' || (!selected && full);
            const reason = c.status === 'closed' ? 'אין שיעור' : c.status === 'started' ? 'נסגר' : c.status === 'past' ? '' : null;
            const spoken = c.status === 'past' ? 'המועד עבר' : reason || `${c.slot.start} עד ${c.slot.end}`;
            const label = `${fmtLong(c.date)}, ${spoken}${selected ? ', נבחר' : ''}`;
            return (
              <button key={c.date} type="button" className={`eb-cal__day is-${c.status} ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected} aria-label={label} disabled={c.status !== 'open'}
                aria-disabled={blocked && c.status === 'open' ? 'true' : undefined}
                onClick={() => { if (!blocked || selected) dispatch({ type: 'toggleDate', date: c.date }); }}>
                <span className="eb-cal__num"><T>{String(d)}</T></span>
                <span className="eb-cal__sub">{reason !== null ? reason : <Time start={c.slot.start} />}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="eb-meta" aria-live="polite">
        {state.dates.length === 0 ? `אפשר לבחור עד ${max === 1 ? 'מועד אחד' : '3 מועדים'}.` : full && max > 1 ? 'נבחרו 3 מועדים. אפשר לבטל בחירה כדי להחליף.' : `נבחרו ${state.dates.length} מתוך ${max}.`}
      </p>

      {otherDow !== undefined && (
        <div className="eb-upsell">
          <div>
            <p className="eb-upsell__title">רוצים גם יום {HDAYS[otherDow]}?</p>
            <p className="eb-upsell__text">שדרגו ל-3 שיעורי היכרות ב-<Price value={OFFERS.trial3.price} /> בלבד</p>
          </div>
          <Button variant="secondary" onClick={() => dispatch({ type: 'upgrade' })}>שדרוג ל-3 שיעורים</Button>
        </div>
      )}

      <Button onClick={next} disabled={state.dates.length < 1}>המשך</Button>
      <div className="eb-alt">
        <button type="button" className="eb-link" onClick={() => dispatch({ type: 'skipDates' })}>לא מצאתי תאריך מתאים, אדלג ואתאם בהמשך</button>
        <a className="eb-link eb-link--wa" href={waLink(daysWA(group.label))} target="_blank" rel="noopener noreferrer">
          <Icon name="wa" size={16} /> מתלבטים לגבי הימים? התייעצו איתנו בוואטסאפ
        </a>
      </div>
    </section>
  );
}
