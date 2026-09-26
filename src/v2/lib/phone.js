// Israeli phone numbers. The field shows a fixed +972 prefix, so people type 050..., 50... or +972 50...
// Valid national numbers (after the leading 0): mobile 5XXXXXXXX, 07X 7XXXXXXXX, landline [2-489]XXXXXXX.
export function nationalDigits(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('972')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return d;
}
export function isValidPhone(raw) {
  const d = nationalDigits(raw);
  return /^5\d{8}$/.test(d) || /^7\d{8}$/.test(d) || /^[2-489]\d{7}$/.test(d);
}
export const toE164 = (raw) => (isValidPhone(raw) ? '+972' + nationalDigits(raw) : '');
export const isValidName = (s) => String(s || '').trim().length >= 2;
