const fs=require('fs'),path=require('path');const {chromium}=require('../../../frontend/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'qmse-output/completion-20261008/evidence'),control=JSON.parse(fs.readFileSync('/private/tmp/qmse-completion-control/settings.json'));
(async()=>{
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1100,height:850}});
page.on('console',m=>console.log('BROWSER',m.text()));page.on('pageerror',e=>console.log('ERROR',e.message));
await page.goto('http://127.0.0.1:55448');await page.waitForTimeout(5000);
const activate=page.locator('flt-semantics-placeholder');if(await activate.count())await activate.evaluate(x=>x.click());
await page.waitForTimeout(2500);fs.writeFileSync(path.join(out,'flutter-initial-dom.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(out,'flutter-initial.png')});
console.log('FLUTTER TEXT',await page.locator('body').innerText());
await page.goto('http://127.0.0.1:55447/login');await page.waitForTimeout(1000);console.log('REACT TEXT',await page.locator('body').innerText());await b.close();
})();
