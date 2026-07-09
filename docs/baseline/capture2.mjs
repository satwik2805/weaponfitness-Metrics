// Baseline part 2: Welcome -> Login screen states.
import { chromium } from 'playwright';

const URL = 'http://localhost:8081';
const OUT = 'docs/baseline';
const errors = [];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

await page.locator('text="ENTER THE ARENA"').first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/02-login.png` });
console.log('--- LOGIN SCREEN TEXT ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 2000));

// exercise the error state: submit empty / bad credentials
const inputs = page.locator('input');
const n = await inputs.count();
console.log('input count:', n);
if (n >= 2) {
  await inputs.nth(0).fill('baseline@example.com');
  await inputs.nth(1).fill('wrongpassword');
  const submit = page.locator('text=/sign in|log ?in|enter/i').last();
  await submit.click().catch(e => console.log('submit click failed:', e.message));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/03-login-error-state.png` });
  console.log('--- AFTER BAD LOGIN ---');
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 2000));
}

console.log('--- CONSOLE ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
