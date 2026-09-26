// WhatsApp message texts and the .ics export. Message wording is the legacy widget's.
import { WA_PHONE, ICS_LOCATION } from '../config/site.js';
import { HDAYS, dowOf, fmtDots } from './civil-date.js';

export const waLink = (text, phone = WA_PHONE) => 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);

export function groupWA({ name, e164, groupLabel, isChild, medical, slots, offerId }) {
  const ds = slots.map((s, i) => (i + 1) + '. יום ' + HDAYS[dowOf(s.date)] + ', ' + fmtDots(s.date) + ' – ' + s.start).join('\n');
  const datesStr = ds ? '\nמועדים:\n' + ds : '\nמועדים: יתואמו טלפונית בהמשך';
  const pl = offerId === 'single' ? 'שיעור בודד' : '3 שיעורי היכרות';
  const childLine = isChild ? '\n👶 רישום עבור ילד/ה' : '';
  const medLine = medical ? '\n⚠️ מגבלות רפואיות: ' + medical : '';
  return '🎯 בקשת חזרה - ' + pl + ' באלמנט\n\nשם: ' + name.trim() + '\nטלפון: ' + e164 + '\nקבוצה: ' + groupLabel + childLine + medLine + '\n' + datesStr;
}

export function privateWA({ name, e164, goalLabel, formatLabel, note }) {
  return '👋 פנייה לאימון אישי / זוגי - אלמנט\n\nשם: ' + name.trim() + '\nטלפון: ' + e164 + '\nתחום: ' + goalLabel +
    (formatLabel ? ' (' + formatLabel + ')' : '') + (note ? '\n\nהערות: ' + note : '');
}

export const QUESTION_WA = 'היי, יש לי שאלה לגבי שיעורי ההיכרות באלמנט 😊';
export const EXIT_WA = 'היי ליאור, הגעתי מהאתר ויש לי שאלה לגבי האימונים באלמנט...';
export const idleWA = (groupLabel) => 'היי, התחלתי הרשמה לשיעורי היכרות באפליקציית אלמנט' + (groupLabel ? ` (${groupLabel})` : '') + ' ואשמח לעזרה 😊';
export const daysWA = (groupLabel) => 'היי, אני מתעניין/ת ב' + (groupLabel || '') + ' אבל רציתי לשאול לגבי הגעה בימים אחרים / פעם בשבוע.';

/** .ics with Asia/Jerusalem wall-clock times (independent of the browser's zone). */
export function buildICS(slots, groupLabel) {
  const t = (civil, hm) => civil.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00';
  let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Element Studio//Booking//HE\n';
  for (const s of slots) {
    ics += `BEGIN:VEVENT\nSUMMARY:שיעור ניסיון - ${groupLabel}\nDTSTART;TZID=Asia/Jerusalem:${t(s.date, s.start)}\nDTEND;TZID=Asia/Jerusalem:${t(s.date, s.end)}\nLOCATION:${ICS_LOCATION}\nDESCRIPTION:שיעור באלמנט - אומנויות לחימה ותנועה\nEND:VEVENT\n`;
  }
  return ics + 'END:VCALENDAR';
}
