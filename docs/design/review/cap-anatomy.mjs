import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1200 } })).newPage();
const errs = [];
p.on('pageerror', (x) => errs.push('PAGEERR ' + x.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await p.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(7000);
await p.locator('input').first().fill('fortimark.demo.member@gmail.com');
await p.locator('input').nth(1).fill('DemoMember!2026');
await p.getByRole('button', { name: 'Sign in' }).last().click();
await p.waitForTimeout(9000);

// open Anatomy tab — inactive tabs are icon-only, so target the aria-label
try {
  await p.getByRole('tab', { name: 'Anatomy' }).last().click({ timeout: 8000 });
} catch (e) {
  errs.push('NAV could not click Anatomy tab: ' + e.message);
}
await p.waitForTimeout(4000);
await p.screenshot({ path: 'docs/design/review/anatomy-rest.png', fullPage: true });

// select a muscle group via chip
try {
  await p.getByText('Chest', { exact: true }).last().click({ timeout: 6000 });
} catch (e) {
  errs.push('SELECT could not click Chest chip: ' + e.message);
}
await p.waitForTimeout(2500);
await p.screenshot({ path: 'docs/design/review/anatomy-chest.png', fullPage: true });

console.log('anatomy', errs.length ? errs.join('\n  ') : 'ok');
await b.close();
