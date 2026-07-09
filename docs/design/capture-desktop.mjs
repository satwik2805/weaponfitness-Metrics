// Owner dashboard at desktop width — the web-portal story.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const [, pw] = readFileSync('backend/owner_creds.tmp', 'utf8').split('\n');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(8000);
await page.locator('input').first().fill('newfortimark@gmail.com');
await page.locator('input').nth(1).fill(pw.trim());
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(9000);
await page.screenshot({ path: 'docs/design/14-owner-desktop.png' });
// light theme
const toggle = page.getByLabel('Toggle theme').first();
if (await toggle.count()) { await toggle.click(); await page.waitForTimeout(1200); }
await page.screenshot({ path: 'docs/design/15-owner-desktop-light.png' });
console.log('done');
await browser.close();
