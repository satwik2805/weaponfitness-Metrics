import { chromium } from 'playwright';
const ACCOUNTS = [
  { role: 'owner', email: 'newfortimark@gmail.com', pw: 'Wf!vbu5XwEHjqE1W' },
  { role: 'trainer', email: 'fortimark.demo.trainer@gmail.com', pw: 'DemoTrainer!2026' },
  { role: 'receptionist', email: 'fortimark.demo.desk@gmail.com', pw: 'DemoDesk!2026' },
  { role: 'admin', email: 'fortimark.demo.admin@gmail.com', pw: 'DemoAdmin!2026' },
];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let totalErrors = 0;
for (const a of ACCOUNTS) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(7000);
  await page.locator('input').first().fill(a.email);
  await page.locator('input').nth(1).fill(a.pw);
  await page.getByRole('button', { name: 'Sign in' }).last().click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `docs/design/final-${a.role}.png` });
  const txt = (await page.evaluate(() => document.body.innerText)).slice(0, 90).replace(/\n/g, ' ');
  console.log(`${a.role.padEnd(13)} | err:${errors.length} | ${txt}`);
  totalErrors += errors.length;
  await ctx.close();
}
console.log('TOTAL PAGE ERRORS:', totalErrors);
await browser.close();
