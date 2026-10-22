import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.PLUGART_TEST_URL||'http://127.0.0.1:8765';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1480,height:920},deviceScaleFactor:1});
page.setDefaultTimeout(12500);
const exceptions=[];
page.on('pageerror',e=>exceptions.push(String(e.message)));
const t=s=>console.log('[V209.1 precision] '+s);
const style=async sel=>page.locator(sel).first().evaluate(el=>{
 const c=getComputedStyle(el),r=el.getBoundingClientRect();
 return {bg:c.backgroundColor,image:c.backgroundImage,color:c.color,
  height:Math.round(r.height),width:Math.round(r.width),radius:c.borderTopLeftRadius,
  filter:c.backdropFilter,display:c.display};
});
const route=async(name)=>{
 await page.locator('.main-nav .nav-item[data-route="'+name+'"]').first().click();
 await page.locator('#view-'+name+'.active').waitFor({state:'visible'});
};
try{
 t('load refined dashboard');
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#v209Dashboard').waitFor({state:'visible'});
 await page.waitForFunction(()=>window.PLUGART_V209&&window.PLUGART_V209.isReady());
 assert.equal(await page.locator('link[href*="plugart_v209_precision.css"]').count(),1,'precision layer loaded only once');
 assert.equal(await page.locator('#v209Dashboard .n9-card').count(),7);
 const kpi=await style('#v209Dashboard .n9-kpi');
 const nav=await style('.main-nav .nav-item.active');
 const top=await style('.topbar');
 const card=await style('#v209Dashboard .n9-card');
 assert.ok(kpi.height>=80&&kpi.height<=109,'KPI compact, actual '+kpi.height);
 assert.ok(nav.height>=33&&nav.height<=43,'sidebar button compact, actual '+nav.height);
 assert.ok(top.height<=67,'header must be elegant, actual '+top.height);
 assert.ok(parseInt(card.radius)>=12&&parseInt(card.radius)<=19,'glass card rounded subtly');
 assert.ok(card.image.includes('gradient'),'panel must retain translucent purple gradient');
 const palette=await page.evaluate(()=>({bg:getComputedStyle(document.body).backgroundImage,
   nav:getComputedStyle(document.querySelector('.nav-item.active')).color}));
 assert.ok(palette.bg.includes('gradient'),'site has deep violet multistop background');
 await page.screenshot({path:'test-results/v2091-desktop.png',fullPage:true});
 t('inspect all sections and functional routes');
 const sections=['radar','opencalls','creation','bureau','ideas','prospection','network','social','map'];
 const results=[];
 for(const id of sections){
  await route(id);
  const view=await style('#view-'+id);
  assert.ok(view.display!=='none',id+' must remain visible');
  assert.ok(!view.bg.includes('255, 255, 255'),id+' root must not regress to white');
  const actions=await page.locator('#view-'+id+' button:visible').count();
  assert.ok(actions>=1,id+' needs actionable controls');
  results.push({id,viewBg:view.bg,visibleControls:actions});
  if(id==='creation'){
   await page.locator('#v208Studio').waitFor({state:'visible'});
   const btn=await style('#v208Studio .v208-tabs button');
   const side=await style('#v208Studio .v208-side');
   assert.ok(btn.height<=35,'studio tabs must be slim');
   assert.ok(side.image.includes('gradient'),'studio panels must show rich glass depth');
   assert.equal(await page.locator('#v208Canvas').isVisible(),true,'real creation canvas');
   await page.screenshot({path:'test-results/v2091-studio.png',fullPage:true});
  }
  if(id==='bureau'){
   await page.locator('#bureauModeBar').waitFor({state:'visible'});
   const bar=await style('#bureauModeBar');
   assert.ok(!bar.bg.includes('255, 255, 255'),'Bureau mode ribbon must not show white background');
   await page.screenshot({path:'test-results/v2091-bureau.png',fullPage:true});
  }
  if(id==='radar')await page.screenshot({path:'test-results/v2091-radar.png',fullPage:true});
 }
 t('test compact dashboard navigation');
 await route('dashboard');
 await page.locator('#v209Dashboard .n9-kpi[data-n9-route="creation"]').first().click();
 await page.locator('#v208Studio').waitFor({state:'visible'});
 t('mobile: no horizontal dashboard overflow');
 await page.setViewportSize({width:390,height:844});
 await route('dashboard');
 const mobile=await page.evaluate(()=>({width:document.documentElement.clientWidth,
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  sidebar:document.querySelector('.sidebar').getBoundingClientRect().width}));
 assert.ok(mobile.overflow<=6,'mobile viewport should not overflow: '+JSON.stringify(mobile));
 assert.ok(mobile.sidebar>350&&mobile.sidebar<=390,'mobile floating dock must fit viewport');
 await page.screenshot({path:'test-results/v2091-mobile.png',fullPage:true});
 assert.deepEqual(exceptions,[],'zero JavaScript crashes across modules');
 await writeFile('test-results/v2091-audit.json',JSON.stringify({ok:true,kpi,nav,top,card,mobile,sections:results,exceptions},null,2));
 console.log('V209.1 visual precision, routes and mobile passed.');
}catch(e){
 await page.screenshot({path:'test-results/v2091-failure.png',fullPage:true});
 await writeFile('test-results/v2091-errors.json',JSON.stringify({error:e.message,exceptions},null,2));
 throw e;
}finally{await browser.close();}
