// Redesigned auth flow capture — Welcome, Login, inline error states.
// Usage: node docs/design/capture-auth.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:8081';
const OUT = 'docs/design';
const errors = [];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// 1. Welcome
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}/01-welcome-after.png` });

// 2. Login (navigate via the CTA so the flow itself is exercised)
const cta = page.locator('text="Sign in"').first();
await cta.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/02-login-after.png` });

// 3. Validation errors (submit empty)
const submit = page.getByRole('button', { name: 'Sign in' }).last();
await submit.click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/03-login-validation.png` });

// 4. Auth failure (bad creds against the dead backend → visible error banner)
await page.locator('input').first().fill('test@gym.com');
await page.locator('input').nth(1).fill('wrongpassword');
await submit.click();
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/04-login-error.png` });

console.log('--- CONSOLE ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
