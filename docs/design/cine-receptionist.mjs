import { chromium } from 'playwright';

const EMAIL = 'fortimark.demo.desk@gmail.com';
const PASSWORD = 'DemoDesk!2026';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(7000);
await page.locator('input').first().fill(EMAIL);
await page.locator('input').nth(1).fill(PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(10000);

await page.screenshot({ path: 'docs/design/cine-receptionist.png' });
await page.evaluate(() => window.scrollBy(0, 400));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'docs/design/cine-receptionist-scroll.png' });

console.log('TEXT:', (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n/g, ' | '));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
