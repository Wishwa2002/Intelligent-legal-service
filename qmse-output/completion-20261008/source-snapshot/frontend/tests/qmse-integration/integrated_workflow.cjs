const fs=require('fs'),path=require('path'),cp=require('child_process');const {chromium}=require('playwright');
const R=process.cwd(),O=path.join(R,'qmse-output/completion-20261008'),E=path.join(O,'evidence'),cfg=JSON.parse(fs.readFileSync('/private/tmp/qmse-completion-control/settings.json'));const BASE='http://127.0.0.1:55443';
const records=[],steps=[];let browser;
function clean(v){if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,/token|password|secret|key|hash/i.test(k)?'[REDACTED]':clean(v)]));return v;}
async function api(method,url,body,token){const response=await fetch(BASE+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}records.push({at:new Date().toISOString(),method,url,status:response.status,input:clean(body),output:clean(data)});if(!response.ok)throw Error(method+' '+url+' '+response.status+' '+text);return data;}
async function capture(page,name){await page.waitForTimeout(900);fs.writeFileSync(path.join(E,name+'.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(E,name+'.png'),fullPage:false});console.log(name,await page.locator('body').innerText());steps.push({at:new Date().toISOString(),step:name,screenshot:'evidence/'+name+'.png'});}
function observe(page){page.on('response',async r=>{if(r.url().startsWith(BASE+'/api/')){let data;try{data=await r.json()}catch{return}records.push({at:new Date().toISOString(),method:r.request().method(),url:r.url().replace(BASE,''),status:r.status(),output:clean(data),via:'actual UI'});}});}
(async()=>{try{
 const email='workflow-'+Date.now()+'@example.test';await api('POST','/api/auth/signup',{fullName:'Synthetic QMSE Workflow Customer',email,password:cfg.password,role:'Customer'});
 browser=await chromium.launch({headless:true});const mobile=await browser.newPage({viewport:{width:1100,height:900}});observe(mobile);
 await mobile.goto('http://127.0.0.1:55448');await mobile.waitForTimeout(2500);await mobile.locator('flt-semantics-placeholder').evaluate(x=>x.click());await mobile.waitForTimeout(500);
 console.log('INPUTS',await mobile.locator('input').count(),await mobile.locator('input').evaluateAll(x=>x.map(y=>({type:y.type,aria:y.getAttribute('aria-label')}))));
 await mobile.locator('input').nth(0).fill(email);await mobile.locator('input').nth(1).fill(cfg.password);await mobile.getByRole('button',{name:'Sign In',exact:true}).click();await capture(mobile,'e2e-01-flutter-login');
 await mobile.getByText(/MEMBER 3.*DOCUMENT SERVICES/).click();await capture(mobile,'e2e-02-flutter-catalogue');
 await mobile.getByRole('button',{name:'Create Request',exact:true}).first().click();await capture(mobile,'e2e-03-flutter-form');
 await mobile.getByRole('textbox').fill('QMSE isolated document workflow');
 await mobile.getByRole('button',{name:'Create Request & Begin Review'}).click();await mobile.waitForTimeout(1800);await capture(mobile,'e2e-04-flutter-request');
 fs.writeFileSync('/private/tmp/qmse-completion-control/mobile-state.json',JSON.stringify(await mobile.context().storageState()));
 }catch(e){console.error(e.stack);steps.push({at:new Date().toISOString(),status:'BLOCKED',reason:e.message});}finally{await new Promise(r=>setTimeout(r,200));fs.writeFileSync(path.join(E,'integrated-http.json'),JSON.stringify(records,null,2));fs.writeFileSync(path.join(E,'integrated-steps.json'),JSON.stringify(steps,null,2));if(browser)await browser.close();}})();
