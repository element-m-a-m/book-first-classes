// Old booking pages retire, never go dark (plan section 3, item 8): each retired release's page lands on the current
// page with its query kept, and sends nothing on the way. Retired by `node scripts/release.mjs --retire <version>`.
import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';

const RETIRED = ['1.0.0-legacy', '2.0.0', '2.0.1', '2.1.0'];

for (const v of RETIRED) {
  test(`v${v}: the old page lands on the current page, query kept, nothing sent`, async ({ page }) => {
    const rec = await openWidget(page, `/releases/v${v}/index.html?utm_source=old-ad`, { host: true });
    await page.waitForURL((u) => !u.pathname.includes('/releases/'), { timeout: 5000 });
    expect(new URL(page.url()).pathname).toBe('/');
    expect(new URL(page.url()).searchParams.get('utm_source')).toBe('old-ad');
    await page.locator('#element-booking-widget-container *').first().waitFor();
    await page.waitForTimeout(300);
    expect(rec.events).toEqual([]);
    expect(rec.blocked).toEqual([]);
  });
}
