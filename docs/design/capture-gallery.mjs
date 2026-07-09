// Design-system gallery capture — dark + light, full page + sheet demo.
// Usage: node docs/design/capture-gallery.mjs
import { chromium } from 'playwright';

const URL = 'http://localhost:8081/gallery';
const OUT = 'docs/design';
const errors = [];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 2400 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(9000); // metro bundle + fonts

await page.screenshot({ path: `${OUT}/gallery-dark.png`, fullPage: true });

// open the sheet
const sheetBtn = page.locator('text="Open sheet"').first();
if ((await sheetBtn.count()) > 0) {
  await sheetBtn.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/gallery-sheet.png` });
  // close it
  const closeBtn = page.getByLabel('Close').first();
  if ((await closeBtn.count()) > 0) await closeBtn.click();
  await page.waitForTimeout(600);
}

// toggle to light theme (header icon button)
const toggle = page.getByLabel('Toggle theme').first();
if ((await toggle.count()) > 0) {
  await toggle.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/gallery-light.png`, fullPage: true });
}

console.log('--- CONSOLE ERRORS ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
