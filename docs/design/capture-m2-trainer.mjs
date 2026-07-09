// M2 verification: sign in as the demo Trainer, screenshot the redesigned dashboard.
// Run from the repo root: node docs/design/capture-m2-trainer.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(7000);
await page.locator('input').first().fill('fortimark.demo.trainer@gmail.com');
await page.locator('input').nth(1).fill('DemoTrainer!2026');
await page.getByRole('button', { name: 'Sign in' }).last().click();
await page.waitForTimeout(9000);

await page.screenshot({ path: 'docs/design/m2-trainer.png' });

// second frame: scroll to the members + groups sections
await page.mouse.wheel(0, 1200);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'docs/design/m2-trainer-scroll.png' });

// third frame: light theme, back at the top
await page.mouse.wheel(0, -2400);
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Toggle theme' }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'docs/design/m2-trainer-light.png' });

console.log('TEXT:', (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | '));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
