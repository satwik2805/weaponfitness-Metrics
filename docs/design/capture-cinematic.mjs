import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const [, ownerPw] = readFileSync('backend/owner_creds.tmp', 'utf8').split('\n');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// 1. cinematic welcome
await page.goto('http://localhost:8081/welcome', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(12000);
await page.screenshot({ path: 'docs/design/c1-welcome.png' });

// 2. login over photography
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'docs/design/c2-login.png' });

// 3. owner hero dashboard
await page.locator('input').first().fill('newfortimark@gmail.com');
await page.locator('input').nth(1).fill(ownerPw.trim());
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(10000);
await page.screenshot({ path: 'docs/design/c3-owner-hero.png' });

console.log(errors.length ? errors.join('\n') : 'NO PAGE ERRORS');
await browser.close();
