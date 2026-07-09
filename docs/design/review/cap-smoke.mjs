import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', (x) => errs.push('PAGEERR ' + x.message));
const t0 = Date.now();
await p.goto('http://localhost:8081/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(12000); // first web bundle compile
await p.screenshot({ path: 'docs/design/review/smoke-running.png' });
const bodyText = (await p.locator('body').innerText().catch(() => '')).slice(0, 80).replace(/\n/g, ' ');
console.log('smoke', 'compile+load=' + Math.round((Date.now() - t0) / 1000) + 's', '| firstText="' + bodyText + '"', '|', errs.length ? errs.join(' ; ') : 'no page errors');
await b.close();
