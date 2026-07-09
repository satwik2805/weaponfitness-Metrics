import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.locator('input').first().waitFor({ state: 'visible', timeout: 120000 });
await page.waitForTimeout(1500);
await page.locator('input').first().fill('fortimark.demo.desk@gmail.com');
await page.locator('input').nth(1).fill('DemoDesk!2026');
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(9000);

// hero shot (dark)
await page.screenshot({ path: 'docs/design/m2-receptionist.png' });
const text = await page.evaluate(() => document.body.innerText);
console.log('TEXT:', text.slice(0, 400).replace(/\n/g, ' | '));

// prove the lower sections rendered
for (const probe of ["Today's check-ins", 'Members', 'Search members by name']) {
  console.log(`HAS "${probe}":`, text.includes(probe));
}

// member search exercises the directory filter
await page.getByLabel('Search members').fill('lakshmi');
await page.waitForTimeout(800);
console.log('SEARCH RESULT:', (await page.evaluate(() => document.body.innerText)).includes('Lakshmi Menon'));
await page.getByLabel('Search members').fill('');
await page.waitForTimeout(500);

// scroll to the member directory
await page.mouse.wheel(0, 4000);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'docs/design/m2-receptionist-members.png' });

// light theme
await page.getByLabel('Toggle theme').first().click();
await page.waitForTimeout(1200);
await page.mouse.wheel(0, -8000);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'docs/design/m2-receptionist-light.png' });

// flows: renew modal opens, scan hero navigates to the rotating-QR screen
await page.getByRole('button', { name: 'Renew membership' }).first().click();
await page.waitForTimeout(800);
console.log('RENEW MODAL:', (await page.evaluate(() => document.body.innerText)).includes('Renew Membership'));
await page.getByText('Cancel', { exact: true }).last().click();
await page.waitForTimeout(500);

await page.getByRole('button', { name: 'Scan check-in' }).first().click();
await page.waitForTimeout(2500);
console.log('QR SCREEN:', (await page.evaluate(() => document.body.innerText)).includes('Member check-in'));

console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
