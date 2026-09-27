// The seven trial groups (decision 16: only these are offered).
// ids are ClickUp INTEREST_MAP keys - never rename them. Descriptions are owner-approved display copy.
// Public labels follow the website's group names; adults-38-58 is shown as "כושר ולחימה לגילאי 40+".
export const TRACKS = {
  martial: { title: 'אומנויות לחימה', accent: 'ma' },
  movement: { title: 'מובמנט ואימון גופני', accent: 'mv' },
};

export const GROUPS = [
  { id: 'kids-6-8', label: 'ילדים 6-8', audience: 'child', track: 'martial', kids: true,
    desc: 'בניית ביטחון, משמעת עצמית ותנועה דרך משחק', coach: 'שי אלמסי' },
  { id: 'kids-9-11', label: 'ילדים 9-11', audience: 'child', track: 'martial', kids: true,
    desc: 'פיתוח טכניקה, כוח גופני וחוסן נפשי', coach: 'שי אלמסי' },
  { id: 'youth-12-15', label: 'נוער 12-15', audience: 'child', track: 'martial',
    desc: 'אתגר, משמעת, ביטחון עצמי וכושר גופני', coach: 'ליאור ורדי' },
  { id: 'adults-16-37', label: 'בוגרים 16-37', audience: 'self', track: 'martial',
    desc: 'טכניקה, כוח, התמדה ומיינדסט לחימתי', coach: 'ליאור ורדי' },
  { id: 'adults-38-58', label: 'כושר ולחימה לגילאי 40+', audience: 'self', track: 'martial', tag: 'ייחודי',
    desc: 'שילוב ייחודי של כושר, בריאות ואומנויות לחימה', coach: 'מנדי סטנדר' },
  { id: 'movement-class', label: 'מובמנט', audience: 'self', track: 'movement', tag: 'פופולרי',
    desc: 'חופש בגוף, אינטליגנציה תנועתית, מודעות ומשחק דרך תנועה', coach: 'ליאור ורדי' },
  { id: 'strength', label: 'כוח וגמישות', audience: 'self', track: 'movement', accent: 'sc',
    desc: 'אימון גופני, חיזוק, שיפור טווחי תנועה והגנה מפציעות', coach: 'ליאור ורדי' },
];

export const GROUP_ALIASES = {
  youth: 'youth-12-15', adults: 'adults-16-37', forty: 'adults-38-58', movement: 'movement-class',
  strength: 'strength', 'kids-6-8': 'kids-6-8', 'kids-9-11': 'kids-9-11',
};

export const groupById = (id) => GROUPS.find((g) => g.id === id) || null;
export const accentOf = (g) => (g && (g.accent || TRACKS[g.track].accent)) || 'gold';
export const branchTitleOf = (g) => (g ? TRACKS[g.track].title : '');
