// Baseline screenshot driver — Phase 0 ground truth.
// Usage: node docs/baseline/capture.mjs
import { chromium } from 'playwright';

const URL = 'http://localhost:8081';
const OUT = 'docs/baseline';
const errors = [];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000); // metro web first paint
await page.screenshot({ path: `${OUT}/01-welcome.png` });
console.log('--- VISIBLE TEXT (welcome) ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1500));

// try to reach the Login screen
const candidates = ['Get Started', 'Login', 'Log In', 'Sign In', 'LOGIN', 'Continue', 'Start'];
for (const label of candidates) {
  const el = page.locator(`text="${label}"`).first();
  if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
    console.log(`clicking: ${label}`);
    await el.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/02-after-${label.replace(/\s+/g, '_').toLowerCase()}.png` });
    console.log('--- VISIBLE TEXT (after click) ---');
    console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1500));
    break;
  }
}

console.log('--- CONSOLE ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
