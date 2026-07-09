import { chromium } from 'playwright';
const B='http://localhost:8081';
const ACC=[['owner','newfortimark@gmail.com','Wf!vbu5XwEHjqE1W'],['trainer','fortimark.demo.trainer@gmail.com','DemoTrainer!2026'],['receptionist','fortimark.demo.desk@gmail.com','DemoDesk!2026'],['admin','fortimark.demo.admin@gmail.com','DemoAdmin!2026'],['member','fortimark.demo.member@gmail.com','DemoMember!2026']];
const browser=await chromium.launch({channel:'msedge',headless:true}); let total=0; const out=[];
for(const [role,email,pw] of ACC){
  const c=await browser.newContext({viewport:{width:420,height:900}});const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
  await p.goto(`${B}/login`,{waitUntil:'domcontentloaded',timeout:120000});await p.waitForTimeout(7000);
  await p.locator('input').first().fill(email);await p.locator('input').nth(1).fill(pw);
  await p.getByRole('button',{name:'Sign in'}).last().click();await p.waitForTimeout(9000);
  const txt=(await p.evaluate(()=>document.body.innerText)).slice(0,55).replace(/\n/g,' ');
  out.push(`${role}:err${e.length} [${txt}]`); total+=e.length; await c.close();
}
console.log(out.join('\n')); console.log('TOTAL ERRORS:',total);
await browser.close();
