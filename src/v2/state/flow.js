// Flow state (plan §3.3). Group path: offer -> group -> dates -> contact -> summary (direct payment) | done-callback.
// Private path: offer -> pgoal -> pcontact -> pdone. Back keeps selections; changing an earlier choice clears only
// what depends on it and says so in `notice`.
import { groupById } from '../config/groups.js';
import { OFFERS } from '../config/offers.js';

export const GROUP_STEPS = ['offer', 'group', 'dates', 'contact', 'summary'];
export const PRIVATE_STEPS = ['offer', 'pgoal', 'pcontact'];
export const STEP_NAMES = { offer: 'הצעה', group: 'קבוצה', dates: 'מועדים', contact: 'פרטים', summary: 'סיכום', pgoal: 'תחום', pcontact: 'פרטים' };
export const DONE_STEPS = ['done-callback', 'pdone'];

export const initialState = {
  step: 'offer', offer: null, audience: null, groupId: null, dates: [], datesSkipped: false,
  name: '', phone: '', medHas: null, medText: '', goal: null, format: 'individual', note: '',
  notice: null, interacted: false, touched: {}, outcome: null,
};

export const pathOf = (s) => (s.offer === 'private' ? 'private' : 'group');
export const stepsOf = (s) => (pathOf(s) === 'private' ? PRIVATE_STEPS : GROUP_STEPS);
export const maxDatesOf = (s) => (s.offer === 'single' ? 1 : 3);

export function withContext(state, { offer, group }) {
  let s = { ...state };
  if (offer && OFFERS[offer]) s.offer = offer;
  if (group && s.offer !== 'private' && groupById(group)) {
    s.groupId = group;
    s.audience = groupById(group).audience;
  }
  // A valid preset offer starts the journey at the next step; the offer stays changeable.
  if (s.step === 'offer' && s.offer) s.step = s.offer === 'private' ? 'pgoal' : 'group';
  return s;
}

export function reducer(state, a) {
  const s = { ...state, interacted: state.interacted || a.user !== false };
  switch (a.type) {
    case 'context': return withContext({ ...state }, a);
    case 'offer': {
      if (a.offer === state.offer) return s;
      s.offer = a.offer;
      if (!a.offer) {
        s.audience = null; s.groupId = null; s.dates = []; s.datesSkipped = false;
        s.goal = null; s.format = null; s.notice = null; return s;
      }
      s.notice = null;
      const wasPrivate = state.offer === 'private', isPrivate = a.offer === 'private';
      if (!wasPrivate && !isPrivate && a.offer === 'single' && state.dates.length > 1) {
        s.dates = state.dates.slice(0, 1);
        s.notice = 'נשאר המועד הראשון שבחרתם, כי שיעור בודד כולל מועד אחד.';
      }
      if (wasPrivate !== isPrivate && state.offer) s.notice = null;
      return s;
    }
    case 'audience': {
      s.audience = a.audience;
      const g = groupById(state.groupId);
      if (g && g.audience !== a.audience) {
        s.groupId = null;
        if (state.dates.length) { s.dates = []; s.notice = 'הקבוצה והמועדים שבחרתם נוקו, כי השתנה עבור מי השיעור.'; } else s.notice = null;
        s.datesSkipped = false;
      }
      return s;
    }
    case 'group': {
      if (a.groupId === state.groupId) return s;
      s.groupId = a.groupId;
      if (a.groupId) s.audience = groupById(a.groupId).audience;
      s.notice = null;
      if (state.dates.length || state.datesSkipped) { s.dates = []; s.datesSkipped = false; s.notice = 'המועדים שבחרתם נוקו, כי הקבוצה השתנתה.'; }
      return s;
    }
    case 'toggleDate': {
      const has = state.dates.includes(a.date);
      if (has) s.dates = state.dates.filter((d) => d !== a.date);
      else if (state.dates.length < maxDatesOf(state)) s.dates = [...state.dates, a.date].sort();
      s.datesSkipped = false;
      s.notice = null;
      return s;
    }
    case 'skipDates': s.dates = []; s.datesSkipped = true; s.step = 'contact'; s.notice = null; return s;
    case 'upgrade': s.offer = 'trial3'; s.notice = null; return s;
    case 'field': s[a.field] = a.value; return s;
    case 'touch': s.touched = { ...state.touched, ...a.fields }; return s;
    case 'go': s.step = a.step; if (a.step !== state.step && !a.keepNotice) s.notice = null; if (a.outcome) s.outcome = a.outcome; return s;
    case 'goal': s.goal = a.goal; return s;
    case 'format': s.format = a.format; return s;
    case 'reset': return { ...initialState, interacted: true };
    default: return state;
  }
}
