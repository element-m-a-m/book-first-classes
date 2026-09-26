// Private training: goal x format (duo is a format, not a fourth category). Copy and prices follow the
// website's private-training page. categoryId values are ClickUp INTEREST_MAP keys.
export const GOALS = [
  { id: 'private-martial', label: 'אומנויות לחימה', desc: 'הגנה עצמית, טכניקה ועבודה עם שותף.', rate: 'standard' },
  { id: 'private-fitness', label: 'כושר ואימון גופני', desc: 'כוח, גמישות ושליטה בתנועה.', rate: 'standard' },
  { id: 'private-rehab', label: 'שיקום וחזרה לאימון', desc: 'ליווי בתנועה אחרי פציעה או הפסקה, עם הערכה והתאמת עומס.', rate: 'rehab' },
];

export const FORMATS = [
  { id: 'individual', label: 'אישי', desc: 'מפגש אחד על אחד' },
  { id: 'duo', label: 'זוגי', desc: 'אימון זוגי מתאים לחברים, לבני זוג או להורה וילד.' },
];

// Per meeting. Duo prices are per meeting for the pair.
export const PRICES = {
  individual: {
    standard: { first: { price: 250, mins: 75 }, series: { price: 200, mins: 60 } },
    rehab: { first: { price: 300, mins: 75 }, series: { price: 240, mins: 60 } },
  },
  duo: { first: { price: 360, mins: 60 }, series: { price: 300, mins: 60 } },
};
export const SERIES_NOTE = 'המחירים בסדרה הם למפגש במסגרת רכישה של 10 מפגשים.';
export const FIRST_NOTE = 'כולל היכרות, הערכה ובניית תוכנית להמשך.';

export const goalById = (id) => GOALS.find((g) => g.id === id) || null;
export function pricesFor(goalId, format) {
  if (format === 'duo') return PRICES.duo;
  const g = goalById(goalId);
  return PRICES.individual[g ? g.rate : 'standard'];
}
