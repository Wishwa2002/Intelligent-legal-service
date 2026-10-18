// AI-assisted existing-contract boundary tests, with explicit UI HTTP fixtures.
import {test,expect} from '@playwright/test';
import {frontDeskFixture,selectIntakeClient} from './frontDeskFixture';
for(const n of [2,3,9,10,1000,1001,4000,4001]) {
 test(`existing recommendation length ${n}`,async({page})=>{
  let calls=0;
  await page.addInitScript(()=>{localStorage.setItem('legalease_staff_user',JSON.stringify({userId:1,name:'Synthetic',role:'Admin'}));localStorage.setItem('token','synthetic-ui-only-token');});
  await page.route(/^https?:\/\/[^/]+\/api\//,async route=>{if(route.request().method()==='POST'&&new URL(route.request().url()).pathname==='/api/lawyer-recommendations')calls++;if(route.request().method()==='POST')await route.fulfill({status:503,json:{message:'Synthetic provider unavailable'}});else await route.fulfill({json:[]});});
  await frontDeskFixture(page,()=>({}));await page.goto('/admin/lawyer-matching');await selectIntakeClient(page);
  const input=page.getByRole('textbox',{name:'Legal requirement',exact:true});await expect(input).toHaveAttribute('minlength','3');await expect(input).toHaveAttribute('maxlength','4000');
  await input.fill('x'.repeat(n));
  const entered=await input.inputValue();expect(entered.length).toBe(Math.min(n,4000));
  await page.getByRole('button',{name:'Analyse Requirement',exact:true}).click();
  if(n>=3)await expect.poll(()=>calls).toBe(1);else await expect(input).toHaveValue('xx');
  // Chromium enforces maxlength by truncating entered input, so 4001 becomes a valid 4000-character submission. The API's 4001 rejection is tested separately.
  expect(calls).toBe(n>=3?1:0);
 });
}
