import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await (await b.newContext({ viewport: { width: 420, height: 900 } })).newPage();
const e = [];
p.on('pageerror', (x) => e.push(x.message));
await p.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(7000);
await p.locator('input').first().fill('fortimark.demo.trainer@gmail.com');
await p.locator('input').nth(1).fill('DemoTrainer!2026');
await p.getByRole('button', { name: 'Sign in' }).last().click();
await p.waitForTimeout(10000);
await p.screenshot({ path: 'docs/design/review/rf-trainer.png', fullPage: true });
const t = p.getByLabel('Toggle theme').first();
if (await t.count()) { await t.click(); await p.waitForTimeout(1800); }
await p.screenshot({ path: 'docs/design/review/rf-trainer-light.png', fullPage: true });
const txt = (await p.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(0, 200);
console.log('INNERTEXT:', txt);
console.log(e.length ? 'PAGEERRORS: ' + e.join(' | ') : 'PAGEERRORS: none');
await b.close();
