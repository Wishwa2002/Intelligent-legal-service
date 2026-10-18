const {chromium}=require('../../frontend/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'), out=path.join(root,'evidence/visual');
const items=[
 {id:'01-xunit-result',source:'test-results/backend-final.log',needle:'Failed!',height:310},
 {id:'02-spoofed-pdf-failure',source:'test-results/backend-final.log',needle:'[xUnit.net 00:00:00.49]',height:470,font:16},
 {id:'03-node-result',source:'test-results/frontend-node.log',needle:'# Subtest: pagination footer',height:700,font:19},
 {id:'04-flutter-result',source:'test-results/mobile-minimal.log',needle:'{"testID":67,"result"',height:560,font:15},
 {id:'05-playwright-report',source:'evidence/e2e/playwright-report/index.html',height:640,html:true,zoom:1.15},
 {id:'07-zap-summary',source:'evidence/security/zap-passive-report.html',height:720,html:true,zoom:1.15},
 {id:'08-zap-alert-details',source:'evidence/security/zap-passive-report.html',height:760,html:true,selector:'th.risk-1',zoom:1.1},
 {id:'09-k6-execution',source:'test-results/performance-final.log',needle:'running (08.0s)',height:340},
 {id:'10-k6-metrics',source:'evidence/performance/k6-summary.json',needle:'"http_req_failed"',height:660},
 {id:'11-coverage',source:'evidence/backend/coverage-html/index.html',height:720,html:true,zoom:1.15},
 {id:'12-ai-tests',source:'test-results/ai-final.log',needle:'-- Docs:',height:330,font:18},
 ];
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\//,''));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.png':'image/png','.js':'application/javascript','.css':'text/css'}[ext]||'text/plain')+'; charset=utf-8');res.end(fs.readFileSync(file));
 }); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});const manifest=[];
 try{
 for(const item of items){
  const ui=await browser.newPage({viewport:{width:620,height:810},deviceScaleFactor:2});
 await ui.goto(`http://127.0.0.1:${server.address().port}/evidence/e2e/schedule-1280.png`);
 await ui.evaluate(()=>{document.body.style.margin='0';const im=document.querySelector('img');im.style.cssText='display:block;width:1280px;height:900px;max-width:none;';window.scrollTo(330,43);});
 await ui.screenshot({path:path.join(out,'06-react-schedule.png')}); await ui.close();
 manifest.push({id:'06-react-schedule',source:'evidence/e2e/schedule-1280.png',screenshot:'evidence/visual/06-react-schedule.png',captured_utc:new Date().toISOString(),method:'Browser viewport of preserved original Playwright application screenshot at natural resolution; mocked API, not integrated E2E'});
 const page=await browser.newPage({viewport:{width:900,height:item.height},deviceScaleFactor:2});
  await page.goto(`http://127.0.0.1:${server.address().port}/${item.source}`,{waitUntil:'networkidle'});
  if(item.zoom) await page.evaluate(z=>document.body.style.zoom=z,item.zoom);
  if(item.selector) await page.locator(item.selector).first().scrollIntoViewIfNeeded();
  if(!item.html) await page.addStyleTag({content:`pre {font-family:monospace;font-size:${item.font||20}px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere;margin:16px;}`});
  if(item.needle) await page.evaluate(({needle,html})=>{
   if(html){const es=[...document.querySelectorAll('a,h1,h2,h3,td,th')].filter(e=>e.textContent.includes(needle));if(es.length) es[0].scrollIntoView({block:'start'});}
   else {const n=document.querySelector('pre').firstChild;const i=n.textContent.indexOf(needle);if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+needle.length);window.scrollTo(0,window.scrollY+r.getBoundingClientRect().top-20);}}
  },item);
  await page.screenshot({path:path.join(out,item.id+'.png')});
  manifest.push({...item,captured_utc:new Date().toISOString(),source_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,item.source))).digest('hex'),screenshot:'evidence/visual/'+item.id+'.png',method:'Playwright Chromium screenshot of original artifact served without content modification; browser font/wrapping adjusted for readability'});
  console.log(item.id,await page.title());await page.close();
 }
 const ui=await browser.newPage({viewport:{width:620,height:810},deviceScaleFactor:2});
 await ui.goto(`http://127.0.0.1:${server.address().port}/evidence/e2e/schedule-1280.png`);
 await ui.evaluate(()=>{document.body.style.margin='0';const im=document.querySelector('img');im.style.cssText='display:block;width:1280px;height:900px;max-width:none;';window.scrollTo(330,43);});
 await ui.screenshot({path:path.join(out,'06-react-schedule.png')}); await ui.close();
 manifest.push({id:'06-react-schedule',source:'evidence/e2e/schedule-1280.png',screenshot:'evidence/visual/06-react-schedule.png',captured_utc:new Date().toISOString(),method:'Browser viewport of preserved original Playwright application screenshot at natural resolution; mocked API, not integrated E2E'});
 const page=await browser.newPage({viewport:{width:1060,height:700},deviceScaleFactor:2});
 for(const [id,url] of [['13-github-mobile-ci','https://github.com/Jeyamdev/legalease-ai/actions/runs/37390618065']]){
  try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(1800);
   const text=await page.locator('body').innerText();fs.writeFileSync(path.join(out,id+'-page.txt'),text);
   if(!text.includes('satisfy Flutter analyzer')&&!text.includes('Mobile CI'))throw Error('Expected workflow content unavailable');
   const loc=page.getByText('fix(mobile): satisfy Flutter analyzer lint rules',{exact:false}).first();if(await loc.count())await loc.scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,id+'.png')});manifest.push({id,source:url,screenshot:'evidence/visual/'+id+'.png',captured_utc:new Date().toISOString(),method:'Actual GitHub Actions workflow page in Chromium; historical base commit run'});
  }catch(e){manifest.push({id,source:url,status:'SCREENSHOT_UNAVAILABLE',reason:e.message});}
 }
 }finally{await browser.close();server.close();fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify(manifest,null,2));}
})();
