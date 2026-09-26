// Weekly timetable, Asia/Jerusalem wall-clock times (confirmed by Lior, 26-Sep-2026).
// Two halls: overlapping groups on the same day are intentional.
// dow: 0 = Sunday ... 5 = Friday.
export const TIMETABLE = {
  'kids-6-8': [{ dow: 0, start: '17:00', end: '17:45' }, { dow: 3, start: '17:00', end: '17:45' }],
  'kids-9-11': [{ dow: 0, start: '17:45', end: '18:45' }, { dow: 3, start: '17:45', end: '18:45' }],
  'youth-12-15': [{ dow: 0, start: '17:15', end: '18:45' }, { dow: 3, start: '17:15', end: '18:45' }],
  'adults-16-37': [{ dow: 0, start: '19:00', end: '21:00' }, { dow: 3, start: '19:00', end: '21:00' }],
  'adults-38-58': [{ dow: 1, start: '18:15', end: '19:45' }, { dow: 4, start: '18:15', end: '19:45' }],
  'movement-class': [{ dow: 2, start: '19:45', end: '21:00' }, { dow: 5, start: '14:30', end: '15:45' }],
  'strength': [{ dow: 2, start: '18:30', end: '19:45' }, { dow: 5, start: '15:45', end: '17:00' }],
};

export const toMinutes = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
export const durationOf = (slot) => toMinutes(slot.end) - toMinutes(slot.start);
export const slotsOf = (groupId) => TIMETABLE[groupId] || [];
export const slotOn = (groupId, dow) => slotsOf(groupId).find((s) => s.dow === dow) || null;
