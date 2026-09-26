import { test, expect } from '@playwright/test';
import { openWidget } from './harness.js';
import { V2_URL, GROUPS_V2, groupJourney } from './v2-driver.js';

for (const width of [320, 383, 475, 1280]) {
  test(`summary columns and quiet help at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await openWidget(page, V2_URL + '?embed=1');
    await groupJourney(page, GROUPS_V2[4], { finish: 'review' });
    await page.waitForTimeout(500);
    const layout = await page.locator('.eb-slots li').evaluateAll(rows => rows.map(row => {
      const box = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom }; };
      return { row:box(row), day:box(row.children[0]), date:box(row.children[1]), time:box(row.children[2]) };
    }));
    for (const row of layout) {
      expect(Math.abs(row.time.x - row.row.x)).toBeLessThan(1);
      expect(row.day.right).toBeLessThanOrEqual(row.row.right + 1);
      if (width >= 383) expect(Math.abs(row.day.y - row.time.y)).toBeLessThan(2);
      expect(row.day.x).toBeCloseTo(layout[0].day.x, 0);
      expect(row.date.x).toBeCloseTo(layout[0].date.x, 0);
      expect(row.time.x).toBeCloseTo(layout[0].time.x, 0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expect(page.locator('.eb-step .eb-location address > span')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /בקשת שיחה חוזרת/ })).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.clock.fastForward(70000);
    await expect(page.locator('.eb-pop--help')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'מעבר למערכת ההזמנה', exact:true })).toBeVisible();
    await page.screenshot({ path:`.cache/summary-refined-${width}.png`, fullPage:true });
  });
}
