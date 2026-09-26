import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openWidget} from './harness.js';
import {V2_URL} from './v2-driver.js';

for(const embedded of [false,true]){
 test(`help floats without changing layout or input, embedded=${embedded}`,async({page})=>{
  const url=embedded?'/test/e2e/pages/embed-v2.html?src='+encodeURIComponent(V2_URL+'?offer=private&embed=1'):V2_URL+'?offer=private';
  await openWidget(page,url,{host:embedded});
  const surface=embedded?page.frameLocator('#w'):page;
  await surface.locator('label:has(input[value="private-fitness"])').click();
  await surface.getByRole('button',{name:'המשך',exact:true}).click();
  await surface.getByLabel('שם מלא').fill('בדיקת שימור');
  await page.waitForTimeout(500);
  const measure=()=>surface.locator('.eb').evaluate(el=>({height:el.getBoundingClientRect().height, heading:el.querySelector('h2').getBoundingClientRect().top}));
  const before=await measure();
  await page.clock.fastForward(70000);
  await expect(surface.getByRole('region',{name:'צריכים עזרה? 😊'})).toBeVisible();
  await page.waitForTimeout(500);
  const after=await measure();
  expect(after.height).toBe(before.height); expect(after.heading).toBe(before.heading);
  await expect(surface.getByLabel('שם מלא')).toHaveValue('בדיקת שימור');
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(audit.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
  await surface.getByRole('button',{name:'סגירת העזרה'}).click();
  await expect(surface.locator('.eb-pop--help')).toHaveCount(0);
  await expect(surface.getByLabel('שם מלא')).toHaveValue('בדיקת שימור');
  expect((await measure()).height).toBe(before.height);
 });
}

test('floating help follows a scrolled host and Escape closes it',async({page})=>{
 await openWidget(page,'/test/e2e/pages/embed-v2.html?src='+encodeURIComponent(V2_URL+'?offer=trial3&group=adults'),{host:true});
 await page.evaluate(()=>{document.body.style.paddingTop='500px';document.body.style.paddingBottom='600px';window.scrollTo(0,650);});
 await page.clock.fastForward(70000);
 const f=page.frameLocator('#w');
 await expect(f.locator('.eb-pop--help')).toBeVisible();
 await page.waitForTimeout(500);
 const fits=()=>page.evaluate(()=>{const frame=document.querySelector('#w');const p=frame.contentDocument.querySelector('.eb-pop--help').getBoundingClientRect();const r=frame.getBoundingClientRect();return {top:p.top+r.top,bottom:p.bottom+r.top,height:innerHeight};});
 let bounds=await fits();expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
 await page.evaluate(()=>window.scrollBy(0,120));await page.waitForTimeout(100);
 bounds=await fits();expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
 await page.keyboard.press('Escape');await expect(f.locator('.eb-pop--help')).toHaveCount(0);
});

test('reduced motion disables step and selection animations',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await openWidget(page,V2_URL+'?offer=private');
 await expect(page.locator('.eb-transition')).toHaveCSS('animation-name','none');
 await expect(page.locator('.eb-choice.is-checked')).toHaveCSS('animation-name','none');
});
