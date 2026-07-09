// Baseline part 3: TraineeTabs without a session (backend dead) — layout skeleton + failure behavior.
import { chromium } from 'playwright';

const URL = 'http://localhost:8081';
const OUT = 'docs/baseline';
const errors = [];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000); // allow bundle rebuild + first paint + fetch failures
await page.screenshot({ path: `${OUT}/04-trainee-home-no-session.png` });
console.log('--- TRAINEE HOME TEXT ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1800));
console.log('--- CONSOLE ERRORS (first 10) ---');
console.log(errors.slice(0, 10).join('\n') || '(none)');
await browser.close();
