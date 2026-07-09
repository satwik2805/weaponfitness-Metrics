import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:8090', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'docs/design/06-prod-build-welcome.png' });
// client-side nav to login
const cta = page.locator('text="Sign in"').first();
if (await cta.count()) { await cta.click(); await page.waitForTimeout(1500); }
await page.screenshot({ path: 'docs/design/07-prod-build-login.png' });
console.log('URL after nav:', page.url());
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
