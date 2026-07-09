// M2 Admin dashboard capture.
//
// Full mode  : needs backend/admin_creds.tmp (line 1: email, line 2: password)
//              → signs in at /login, lands on AdminTabs, screenshots the console.
// Fallback   : no admin account exists yet → loads the app bundle and verifies
//              it compiles clean (a syntax error in AdminDashboard.js would
//              break the whole web bundle), screenshots whatever renders.
//
// Run: node docs/design/capture-m2-admin.mjs   (from the gymapp root)
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';

const CREDS = 'backend/admin_creds.tmp';
const hasCreds = existsSync(CREDS);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(7000);

if (hasCreds) {
  const [email, pw] = readFileSync(CREDS, 'utf8').split('\n');
  await page.locator('input').first().fill(email.trim());
  await page.locator('input').nth(1).fill(pw.trim());
  await page.getByRole('button', { name: 'Sign in' }).last().click();
  await page.waitForTimeout(9000);
} else {
  console.log('NOTE: no backend/admin_creds.tmp — layout-only bundle check (admin visual verification pending an admin account).');
}

await page.screenshot({ path: 'docs/design/m2-admin.png' });
console.log('TEXT:', (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | '));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
