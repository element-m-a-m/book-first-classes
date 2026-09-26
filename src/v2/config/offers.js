// Offers and prices (brief, 26-Sep-2026). Trial terms unchanged (decision 12): new joiners, valid 4 weeks,
// group classes only. The comparison price is per group: ₪180 kids, ₪210 everyone else - never a universal ₪210.
export const KIDS_GROUPS = ['kids-6-8', 'kids-9-11'];
export const isKidsGroup = (groupId) => KIDS_GROUPS.includes(groupId);

export const OFFERS = {
  trial3: {
    id: 'trial3', title: '3 שיעורי היכרות', packageLabel: '3 שיעורי היכרות', entries: 3, price: 99,
    compare: { kids: 180, other: 210 }, saleLabel: 'מחיר מבצע', perk: 'הטבה למצטרפים חדשים', validity: 'בתוקף 4 שבועות',
    payUrl: 'https://letts.co.il/payment/WXZycXZLa09XMlp3QzhJS2hhNHFkdz09',
  },
  single: {
    id: 'single', title: 'שיעור היכרות בודד', packageLabel: 'שיעור בודד', entries: 1,
    price: { kids: 60, other: 70 },
    payUrl: { kids: 'https://1pa.co/TvavILvPZj', other: 'https://1pa.co/6nz790XZmG' },
  },
  private: { id: 'private', title: 'אימון אישי / זוגי' },
};

export const OFFER_IDS = ['trial3', 'single', 'private'];

export function priceFor(offerId, groupId) {
  if (offerId === 'trial3') return OFFERS.trial3.price;
  if (offerId === 'single') return isKidsGroup(groupId) ? OFFERS.single.price.kids : OFFERS.single.price.other;
  return 0;
}
export function comparePriceFor(offerId, groupId) {
  if (offerId !== 'trial3' || !groupId) return null;
  return isKidsGroup(groupId) ? OFFERS.trial3.compare.kids : OFFERS.trial3.compare.other;
}
export function payUrlFor(offerId, groupId) {
  if (offerId === 'trial3') return OFFERS.trial3.payUrl;
  if (offerId === 'single') return isKidsGroup(groupId) ? OFFERS.single.payUrl.kids : OFFERS.single.payUrl.other;
  return null;
}
