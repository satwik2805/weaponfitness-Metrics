import { chromium } from 'playwright';
const B='http://localhost:8081', OUT='docs/design/review';
const browser=await chromium.launch({channel:'msedge',headless:true});
let totalErr=0; const log=[];
async function fresh(){const c=await browser.newContext({viewport:{width:420,height:900}});const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));return {c,p,e};}
async function login(p,email,pw){await p.goto(`${B}/login`,{waitUntil:'domcontentloaded',timeout:90000});await p.waitForTimeout(7000);await p.locator('input').first().fill(email);await p.locator('input').nth(1).fill(pw);await p.getByRole('button',{name:'Sign in'}).last().click();await p.waitForTimeout(9000);}

// OWNER + open migrated modals
{const {c,p,e}=await fresh();await login(p,'newfortimark@gmail.com','Wf!vbu5XwEHjqE1W');
 for(const [label,shot] of [['Plans','owner-plans'],['Renew','owner-renew'],['Trainer log','owner-trainerlog']]){
   const btn=p.getByRole('button',{name:label}).first();
   if(await btn.count()){await btn.click();await p.waitForTimeout(2500);await p.screenshot({path:`${OUT}/v-${shot}.png`});
     const close=p.getByLabel('Close').first(); if(await close.count())await close.click(); else await p.keyboard.press('Escape'); await p.waitForTimeout(800);}
 }
 log.push(['owner+modals',e.length]); totalErr+=e.length; await c.close();}

// RECEPTIONIST + Register member modal
{const {c,p,e}=await fresh();await login(p,'fortimark.demo.desk@gmail.com','DemoDesk!2026');
 const reg=p.getByRole('button',{name:/Register member/}).first();
 if(await reg.count()){await reg.click();await p.waitForTimeout(2500);await p.screenshot({path:`${OUT}/v-reception-register.png`});}
 log.push(['reception+register',e.length]); totalErr+=e.length; await c.close();}

// MEMBER check-in scanner (camera permission state on web)
{const {c,p,e}=await fresh();await login(p,'fortimark.demo.member@gmail.com','DemoMember!2026');
 const ci=p.getByRole('button',{name:'Check in'}).first();
 if(await ci.count()){await ci.click();await p.waitForTimeout(2500);await p.screenshot({path:`${OUT}/v-member-scan.png`});}
 log.push(['member+scan',e.length]); totalErr+=e.length; await c.close();}

console.log(log.map(([r,n])=>`${r}:err${n}`).join('  '), '| TOTAL', totalErr);
await browser.close();
