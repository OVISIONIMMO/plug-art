import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.PLUGART_TEST_URL||'http://127.0.0.1:8765';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:850}});
page.setDefaultTimeout(14000);
const crashes=[];
page.on('pageerror',e=>crashes.push(e.message));
let bootRequests=0,secondaries=0,failedNextBootstrap=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await page.route('**/api/v124/dashboard-bootstrap',async route=>{
 bootRequests++;
 await wait(110);
 if(failedNextBootstrap){failedNextBootstrap=false;return route.fulfill({status:503,body:'{"detail":"offline"}',contentType:'application/json'})}
 const n=bootRequests>1?8:7;
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  stats:{opportunities:n,events:3,drafts:2,contacts:1,urgent:1},
  opportunities:[{id:1,title:'Appel collectif',city:'Paris',country:'France',radar_score:91}],
  bureau:[{id:1,title:'Portfolio'}],leads:[]
 })});
});
await page.route('**/api/v167/events?**',async route=>{
 secondaries++;await wait(850);
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([
   {id:42,title:'Vernissage contemporain',starts_at:'2026-11-01T18:00',venue_name:'Galerie témoin',city:'Paris'}
 ])});
});
await page.route('**/api/artists',async route=>{secondaries++;await wait(850);await route.fulfill({status:200,contentType:'application/json',body:'[{"id":1,"name":"Artiste témoin"}]'})});
await page.route('**/api/v208/studio/projects',async route=>{secondaries++;await wait(850);await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"items":[{"id":4,"title":"Affiche témoin"}]}'})});
await page.route('**/api/v201/events/42/media',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'}));
try{
 console.log('[V210 performance] progressive first paint');
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#v209Dashboard').waitFor({state:'visible'});
 const t0=Date.now();
 await page.waitForFunction(()=>document.querySelector('[data-n9-stat="opportunities"]')?.textContent==='7');
 const tFirst=Date.now()-t0;
 const early=await page.evaluate(()=>window.PLUGART_V209.getSyncState());
 assert.equal(early.loading,true,'main dashboard should paint before 850 ms secondary API completes');
 assert.ok(tFirst<2400,'fast primary hydration, measured '+tFirst+'ms');
 await page.waitForFunction(()=>window.PLUGART_V209.isReady()&&!window.PLUGART_V209.getSyncState().loading);
 assert.equal((await page.locator('[data-n9-stat="projects"]').first().textContent()).trim(),'1');
 assert.equal(bootRequests,1,'bootstrap shared by V200 and V209');
 assert.equal(secondaries,3,'secondary panels load once, in parallel');
 console.log('[V210 performance] main refresh updates current visible UI');
 await page.locator('#refreshData').click();
 await page.waitForFunction(()=>document.querySelector('[data-n9-stat="opportunities"]')?.textContent==='8'&&!document.querySelector('#refreshData')?.disabled);
 assert.equal(bootRequests,2,'global refresh makes exactly one new bootstrap request');
 assert.equal((await page.locator('#n9Sync').textContent()).includes('Données à jour'),true,'refresh status visible');
 console.log('[V210 performance] failing refresh preserves displayed results');
 failedNextBootstrap=true;
 const response=await page.evaluate(()=>window.PLUGART_V209.refresh());
 assert.equal(response.partial,true);
 assert.ok(response.issues.includes('Dashboard'));
 assert.equal((await page.locator('[data-n9-stat="opportunities"]').textContent()).trim(),'8','old values must survive transient errors');
 assert.ok((await page.locator('#n9Sync').textContent()).includes('partielle'),'partial status visible');
 console.log('[V210 performance] cached navigation avoids needless secondary calls');
 const old=secondaries;
 await page.locator('.nav-item[data-route="creation"]').click();
 await page.locator('#v208Studio').waitFor({state:'visible'});
 await page.locator('.nav-item[data-route="dashboard"]').click();
 await page.locator('#v209Dashboard').waitFor({state:'visible'});
 await wait(120);
 assert.equal(secondaries,old,'quick return to Dashboard should reuse recently loaded data');
 assert.deepEqual(crashes,[],'no uncaught client errors');
 const report={firstPrimaryPaintMs:tFirst,bootRequests,secondaryRequests:secondaries,tests:['fast-primary','refresh-visible-ui','error-preserves-state','no-duplicate-boot','cached-return'],crashes};
 await writeFile('test-results/v210-performance.json',JSON.stringify(report,null,2));
 console.log('V210 performance and refresh passed',report);
}catch(e){
 await page.screenshot({path:'test-results/v210-performance-failure.png',fullPage:true});
 await writeFile('test-results/v210-performance-error.json',JSON.stringify({error:e.message,crashes,bootRequests,secondaries},null,2));
 throw e;
}finally{await browser.close();}
