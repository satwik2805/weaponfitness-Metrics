import { chromium } from 'playwright';
const b=await chromium.launch({channel:'msedge',headless:true});
async function shot(email,pw,name){
  const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  const e=[];p.on('pageerror',x=>e.push(x.message));
  await p.goto('http://localhost:8081/login',{waitUntil:'domcontentloaded',timeout:90000});await p.waitForTimeout(7000);
  await p.locator('input').first().fill(email);await p.locator('input').nth(1).fill(pw);
  await p.getByRole('button',{name:'Sign in'}).last().click();await p.waitForTimeout(9000);
  await p.screenshot({path:`docs/design/review/desk-${name}.png`});
  console.log(name, e.length?('ERR '+e.join('|')):'ok');
}
await shot('fortimark.demo.member@gmail.com','DemoMember!2026','member');
await shot('newfortimark@gmail.com','Wf!vbu5XwEHjqE1W','owner');
await b.close();
