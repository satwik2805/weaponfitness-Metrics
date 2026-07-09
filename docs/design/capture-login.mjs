import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const [w,h,tag] of [[420,900,'tall'],[420,740,'short']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:8081/login', { waitUntil:'domcontentloaded', timeout:90000 });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `docs/design/login-${tag}.png` });
  // light theme variant for tall
  if (tag==='tall') {
    // error state too
    await page.locator('input').first().fill('test@gym.com');
    await page.locator('input').nth(1).fill('wrongpass');
    await page.getByRole('button',{name:'Sign in'}).last().click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: 'docs/design/login-error.png' });
  }
  console.log(tag, errs.length?('ERR '+errs.join('|')):'ok');
  await page.close();
}
await browser.close();
