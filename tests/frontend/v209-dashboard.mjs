import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.PLUGART_TEST_URL||'http://127.0.0.1:8765';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1672,height:941},deviceScaleFactor:1});
page.setDefaultTimeout(15000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e.message)));
const note=t=>console.log('[V209 visual] '+t);
try{
 note('open reference-aligned dashboard');
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#v209Dashboard').waitFor({state:'visible'});
 await page.waitForFunction(()=>window.PLUGART_V209&&window.PLUGART_V209.isReady());
 await page.locator('#v209Dashboard .n9-kpi').first().waitFor({state:'visible'});
 assert.equal(await page.locator('#v209Dashboard .n9-kpi').count(),5,'five metric cards');
 assert.equal(await page.locator('#v209Dashboard .n9-card').count(),7,'seven real dashboard content panels');
 const computed=await page.evaluate(()=>{
  const root=document.getElementById('v209Dashboard');
  const app=getComputedStyle(document.body),sidebar=getComputedStyle(document.querySelector('.sidebar'));
  const panel=getComputedStyle(root.querySelector('.n9-card'));
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
  return {dark:app.backgroundColor,sidebarColor:sidebar.backgroundColor,panelColor:panel.backgroundColor,
   panelRadius:panel.borderTopLeftRadius,sidebar:rect(document.querySelector('.sidebar')),
   kpi:rect(root.querySelector('.n9-kpi')),radar:rect(root.querySelector('.n9-radar')),
   events:rect(root.querySelector('.n9-events')),plugy:rect(root.querySelector('.n9-plugy')),
   dashboard:rect(root),build:document.getElementById('buildPill').textContent,
   kpis:root.querySelectorAll('.n9-kpi').length};
 });
 assert.equal(computed.build,'V210','version should not be reset by legacy scripts');
 assert.ok(!computed.dark.includes('255, 255, 255'),'site body must not be white');
 assert.ok(parseInt(computed.panelRadius)>14,'panels rounded as in reference');
 assert.ok(computed.kpi.width>120&&computed.kpi.height>90,'metric cards substantial');
 assert.ok(computed.radar.x<computed.events.x && computed.events.x<computed.plugy.x,'reference three-column hierarchy on desktop');
 assert.ok(computed.dashboard.width>1050,'dashboard should use full width');
 note('capture desktop visual evidence');
 await page.screenshot({path:'test-results/v209-desktop-reference.png',fullPage:true});
 const data=await page.evaluate(()=>window.PLUGART_V209.getDashboard());
 assert.ok(data&&typeof data==='object','real dashboard bootstrap must be loaded');
 const stats=data.stats||data.data?.stats||{};
 if(Number.isFinite(Number(stats.opportunities))){
  assert.equal((await page.locator('[data-n9-stat="opportunities"]').textContent()).trim(),String(stats.opportunities),'display actual DB count');
 }
 note('functional cards and navigation');
 await page.locator('.n9-kpi[data-n9-route="creation"]').first().click();
 await page.locator('#v208Studio').waitFor({state:'visible'});
 await page.locator('[data-v208-tab="backgrounds"]').click();
 assert.equal(await page.locator('[data-background]').count(),12,'Studio remains functional in dark UI');
 const ui=await page.locator('#v208Studio .v208-side').first().evaluate(el=>({
  color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor
 }));
 assert.ok(!ui.background.includes('255, 255, 255'),'Studio panels use violet glass');
 await page.locator('#v208Canvas').waitFor({state:'visible'});
 await page.screenshot({path:'test-results/v209-studio-reference.png',fullPage:true});
 await page.locator('.nav-item[data-route="dashboard"]').click();
 await page.locator('#v209Dashboard').waitFor({state:'visible'});
 await page.locator('.n9-kpi[data-n9-route="bureau"]').first().click();
 await page.locator('#bureauModeBar').waitFor({state:'visible'});
 note('responsive layout mobile');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.nav-item[data-route="dashboard"]').click();
 await page.locator('#v209Dashboard').waitFor({state:'visible'});
 const vw=await page.locator('#v209Dashboard').boundingBox();
 assert.ok(vw&&vw.width<=390,'dashboard fits mobile viewport');
 await page.screenshot({path:'test-results/v209-mobile-reference.png',fullPage:true});
 assert.deepEqual(errors,[],'zero uncaught JavaScript errors');
 await writeFile('test-results/v209-layout.json',JSON.stringify(computed,null,2));
 console.log('V209 reference dashboard passed',computed.build);
}catch(e){
 await page.screenshot({path:'test-results/v209-failure.png',fullPage:true});
 await writeFile('test-results/v209-error.json',JSON.stringify({message:e.message,errors},null,2));
 throw e;
}finally{await browser.close()}
