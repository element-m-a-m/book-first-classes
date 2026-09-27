// Site-wide constants for the v2 widget.
export const VERSION = '2.0.1';
export const TZ = 'Asia/Jerusalem';
export const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyJ0CjKQq8jM0i_Mg1qgCkwbLeY2Gb9f5iX2kF6CC-4PQz8keR9O7CWNW3os8ch2bt00A/exec';
// Public channel key for the Apps Script request gate (Script Property WEBHOOK_KEY_WIDGET). It is public
// like the URL above: it labels the widget channel and allows rotation; it is NOT authentication.
export const WEBHOOK_KEY = 'ebw_44a128a7b4274164851f2a8e';
export const WA_PHONE = '972512826106';
export const PRIVACY_URL = 'https://element-m-a-m.co.il/legal/privacy-policy.html';
// Standalone directions: the same Google Maps place link as the website's contact page. It must not depend on the
// website (pre-launch it answers 401), so standalone never links to contact.html#arrival.
export const MAP_URL = 'https://maps.app.goo.gl/Ru3awL6neiGsfMky5';
// Same wording as the website booking section (src/chrome/booking.html).
export const PRIVACY_LINE = 'פרטי ההרשמה משמשים לתיאום ולניהול האימון באמצעות מערכות השירות שלנו.';

// Decision 9: four rows, byte-exact as Lior gave them.
export const ADDRESS_ROWS = ['אולם הספורט של בית הספר היסודי "המגינים"', 'רחוב "חזית חמש" 2', "שכונת 'תל גיבורים'", 'חולון'];
export const ICS_LOCATION = 'אולם הספורט של בית הספר היסודי "המגינים", רחוב "חזית חמש" 2, שכונת \'תל גיבורים\', חולון';

// Legacy strings, unchanged.
export const WHAT_TO_BRING = ['👕 בגדי ספורט נוחים (בשיעורי הלחימה - מכנס ארוך)', '💧 בקבוק מים', '⏰ להגיע 15 דקות לפני', '👟 נעלי ספורט'];

// Parent origins allowed to talk to an embedded widget (plus the widget's own origin).
export const EMBED_ORIGINS = [
  'https://element-m-a-m.co.il', 'https://www.element-m-a-m.co.il', 'https://element-website.pages.dev',
];
export const EMBED_ORIGIN_PATTERNS = [/^https:\/\/[a-z0-9-]+\.element-website\.pages\.dev$/];
