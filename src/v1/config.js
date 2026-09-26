// v1 module, sliced verbatim from legacy/app.jsx (L4-54). Behaviour must match the legacy build;
// the parity harness (test/e2e/parity.spec.js) proves it. Superseded by the v2 tree in S4.
/* ═══════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════ */
export const CFG = {
  branches: [
    { id: "martial-arts", title: "אומנויות לחימה", subtitle: "הגנה עצמית, ביטחון ומשמעת", icon: "martial", color: "#C4342D", colorLight: "#FFF5F4", type: "group" },
    { id: "movement", title: "מובמנט ואימון גופני", subtitle: "תנועה, גמישות וכוח פונקציונלי", icon: "movement", color: "#1A7A6D", colorLight: "#F0FAF8", type: "group" },
    { id: "private", title: "אימונים אישיים / זוגיים", subtitle: "ליווי פרטי מותאם אישית", icon: "private", color: "#8B6914", colorLight: "#FDF9F0", type: "private" },
  ],
  categories: [
    { id: "kids-6-8", branchId: "martial-arts", label: "ילדים גילאי 6-8", icon: "kidsYoung", desc: "בניית ביטחון, משמעת עצמית ותנועה דרך משחק", forChild: true },
    { id: "kids-9-11", branchId: "martial-arts", label: "ילדים גילאי 9-11", icon: "kidsOlder", desc: "פיתוח טכניקה, כוח גופני וחוסן נפשי", forChild: true },
    { id: "youth-12-15", branchId: "martial-arts", label: "נוער צעיר 12-15", icon: "youth", desc: "אתגר, משמעת, ביטחון עצמי וכושר גופני", forChild: true },
    { id: "adults-16-37", branchId: "martial-arts", label: "בוגרים ונוער 16-37", icon: "adults", desc: "טכניקה, כוח, התמדה ומיינדסט לחימתי" },
    { id: "adults-38-58", branchId: "martial-arts", label: "מבוגרים צעירים 38-58", icon: "adultsPlus", desc: "שילוב ייחודי של כושר, בריאות ואומנויות לחימה", tag: "special" },
    { id: "movement-class", branchId: "movement", label: "מובמנט", icon: "flow", desc: "גמישות, שליטה וחופש בגוף. בהנחיית ליאור ורדי", tag: "popular" },
    { id: "strength", branchId: "movement", label: "כוח וגמישות", icon: "strength", desc: "חיזוק ושיפור טווחי תנועה" },
    { id: "private-martial", branchId: "private", label: "אומנויות לחימה והגנה עצמית", icon: "privateFight", desc: "אימון מותאם אישית" },
    { id: "private-rehab", branchId: "private", label: "כושר, פיזיותרפיה ושיקום", icon: "privateRehab", desc: "פיזיותרפיה ואימון מותאם" },
    { id: "private-duo", branchId: "private", label: "אימוני זוגות, ילדים ומשפחות", icon: "privateDuo", desc: "חוויה משותפת לשניים ומעלה" },
  ],
  classes: [
    { categoryId: "kids-6-8", day: "ראשון", time: "17:00", timeEnd: "17:45", mins: 45, dayNum: 0 },
    { categoryId: "kids-6-8", day: "רביעי", time: "17:00", timeEnd: "17:45", mins: 45, dayNum: 3 },
    { categoryId: "kids-9-11", day: "ראשון", time: "17:45", timeEnd: "18:45", mins: 60, dayNum: 0 },
    { categoryId: "kids-9-11", day: "רביעי", time: "17:45", timeEnd: "18:45", mins: 60, dayNum: 3 },
    { categoryId: "youth-12-15", day: "ראשון", time: "18:45", timeEnd: "20:00", mins: 75, dayNum: 0 },
    { categoryId: "youth-12-15", day: "רביעי", time: "18:45", timeEnd: "20:00", mins: 75, dayNum: 3 },
    { categoryId: "adults-16-37", day: "ראשון", time: "18:45", timeEnd: "20:00", mins: 75, dayNum: 0 },
    { categoryId: "adults-16-37", day: "רביעי", time: "18:45", timeEnd: "20:00", mins: 75, dayNum: 3 },
    { categoryId: "adults-38-58", day: "שני", time: "18:15", timeEnd: "19:30", mins: 75, dayNum: 1 },
    { categoryId: "adults-38-58", day: "חמישי", time: "18:15", timeEnd: "19:30", mins: 75, dayNum: 4 },
    { categoryId: "movement-class", day: "שלישי", time: "19:45", timeEnd: "21:00", mins: 75, dayNum: 2 },
    { categoryId: "movement-class", day: "שישי", time: "14:30", timeEnd: "15:45", mins: 75, dayNum: 5 },
    { categoryId: "strength", day: "שלישי", time: "18:30", timeEnd: "19:45", mins: 75, dayNum: 2 },
    { categoryId: "strength", day: "שישי", time: "15:45", timeEnd: "17:00", mins: 75, dayNum: 5 },
  ],
  packages: [
    { id: "single", label: "שיעור בודד", price: 70, entries: 1 },
    { id: "trial3", label: "3 שיעורי היכרות", price: 99, entries: 3, validity: "4 שבועות", fullPrice: 210 },
  ],
  studio: { name: "סניף חולון", address: 'רחוב "חזית חמש" 2, שכונת תל גיבורים, חולון' },
  bookingUrl: "https://app.boostapp.co.il/lessons.php?GetUrl=660cf18a7e302",
  waPhone: "972512826106",
  webhookUrl: "https://script.google.com/macros/s/AKfycbyJ0CjKQq8jM0i_Mg1qgCkwbLeY2Gb9f5iX2kF6CC-4PQz8keR9O7CWNW3os8ch2bt00A/exec",
  whatToBring: ["👕 בגדי ספורט נוחים (בשיעורי הלחימה - מכנס ארוך)", "💧 בקבוק מים", "⏰ להגיע 15 דקות לפני", "👟 נעלי ספורט"],
};

export const HDAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
export const HDAYS_S = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳"];
export const HMONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
