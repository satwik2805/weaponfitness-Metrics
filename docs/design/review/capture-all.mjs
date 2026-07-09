import { chromium } from 'playwright';
const B = 'http://localhost:8081';
const OUT = 'docs/design/review';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const log = [];

async function shot(page, name) { await page.screenshot({ path: `${OUT}/${name}.png` }); }
async function fresh(w=420,h=900){ const c=await browser.newContext({viewport:{width:w,height:h}}); const p=await c.newPage(); const e=[]; p.on('pageerror',x=>e.push(x.message)); return {c,p,e}; }
async function login(p, email, pw){ await p.goto(`${B}/login`,{waitUntil:'domcontentloaded',timeout:90000}); await p.waitForTimeout(7000); await p.locator('input').first().fill(email); await p.locator('input').nth(1).fill(pw); await p.getByRole('button',{name:'Sign in'}).last().click(); await p.waitForTimeout(9000); }

// public
{ const {c,p,e}=await fresh(); await p.goto(`${B}/welcome`,{waitUntil:'domcontentloaded',timeout:90000}); await p.waitForTimeout(9000); await shot(p,'welcome'); await p.goto(`${B}/gallery`,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(7000); await shot(p,'gallery'); log.push(['public',e.length]); await c.close(); }

// member
{ const {c,p,e}=await fresh(); await login(p,'fortimark.demo.member@gmail.com','DemoMember!2026'); await shot(p,'member-home'); await p.mouse.wheel(0,600); await p.waitForTimeout(1200); await shot(p,'member-home-scroll'); await p.getByRole('tab',{name:'Classes'}).click(); await p.waitForTimeout(3500); await shot(p,'member-classes'); await p.getByRole('tab',{name:'Profile'}).click(); await p.waitForTimeout(3000); await shot(p,'member-profile'); log.push(['member',e.length]); await c.close(); }

// owner (+scroll +light)
{ const {c,p,e}=await fresh(); await login(p,'newfortimark@gmail.com','Wf!vbu5XwEHjqE1W'); await shot(p,'owner'); await p.mouse.wheel(0,900); await p.waitForTimeout(1200); await shot(p,'owner-scroll'); const t=p.getByLabel('Toggle theme').first(); if(await t.count()){ await t.click(); await p.waitForTimeout(1200);} await shot(p,'owner-light'); log.push(['owner',e.length]); await c.close(); }

// trainer / receptionist / admin
for (const [role,email,pw] of [['trainer','fortimark.demo.trainer@gmail.com','DemoTrainer!2026'],['receptionist','fortimark.demo.desk@gmail.com','DemoDesk!2026'],['admin','fortimark.demo.admin@gmail.com','DemoAdmin!2026']]) {
  const {c,p,e}=await fresh(); await login(p,email,pw); await shot(p,role); await p.mouse.wheel(0,700); await p.waitForTimeout(1200); await shot(p,`${role}-scroll`); log.push([role,e.length]); await c.close();
}
console.log(log.map(([r,n])=>`${r}:err${n}`).join('  '));
await browser.close();
