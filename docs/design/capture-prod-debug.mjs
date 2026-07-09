import { chromium } from 'playwright';
console.log('start');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('requestfailed', (r) => console.log('FAILED:', r.url().slice(0, 140), '|', r.failure()?.errorText));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });
try {
  await page.goto('http://localhost:8090', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 'docs/design/08-prod-debug.png' });
  console.log('TEXT:', (await page.evaluate(() => document.body.innerText)).slice(0, 200));
} catch (e) { console.log('GOTO ERROR:', e.message.slice(0, 200)); }
await browser.close();
console.log('done');
