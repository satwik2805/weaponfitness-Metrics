// Demo member books a class through the real UI — the M3 flagship flow.
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(8000);
await page.locator('input').first().fill('fortimark.demo.member@gmail.com');
await page.locator('input').nth(1).fill('DemoMember!2026');
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(9000);
await page.screenshot({ path: 'docs/design/10-member-home.png' });

// go to the Classes tab
await page.getByRole('tab', { name: 'Classes' }).click();
await page.waitForTimeout(3500);
await page.screenshot({ path: 'docs/design/11-member-classes.png' });

// open the first available (non-full) class
const first = page.locator('text=/left$/').first();
if (await first.count()) {
  await first.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/design/12-class-detail.png' });
  const bookBtn = page.getByRole('button', { name: /Book for/ }).first();
  if (await bookBtn.count()) {
    await bookBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'docs/design/13-after-booking.png' });
  }
}
console.log('TEXT:', (await page.evaluate(() => document.body.innerText)).slice(0, 240).replace(/\n/g, ' | '));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
