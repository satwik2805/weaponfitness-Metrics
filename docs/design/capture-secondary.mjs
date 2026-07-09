import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// owner -> Payments via direct route after login
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(7000);
await page.locator('input').first().fill('newfortimark@gmail.com');
await page.locator('input').nth(1).fill('Wf!vbu5XwEHjqE1W');
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(9000);
// profile tab -> edit profile
await page.getByRole('tab', { name: 'Profile' }).click();
await page.waitForTimeout(3000);
const edit = page.getByRole('button', { name: 'Edit profile' }).first();
if (await edit.count()) { await edit.click(); await page.waitForTimeout(3500); }
await page.screenshot({ path: 'docs/design/final-editprofile.png' });
console.log('EDIT:', (await page.evaluate(() => document.body.innerText)).slice(0, 120).replace(/\n/g,' '));
console.log(errors.length ? 'ERR: ' + errors.join(' | ') : 'no page errors');
await browser.close();
