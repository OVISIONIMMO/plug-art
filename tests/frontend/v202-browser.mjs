import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PLUGART_TEST_URL||'http://127.0.0.1:8765';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1363,height:936},acceptDownloads:true});
await context.tracing.start({screenshots:true,snapshots:true});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
async function visible(selector){await page.locator(selector).waitFor({state:'visible'})}
async function width(selector,min){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.width>=min,`${selector}: expected >= ${min}, got ${box?.width}`);return box.width}
try{
 await page.goto(base);await visible('#dashboardV200');await page.locator('#v200Opps .v200-opp').first().waitFor();
 assert.equal(requests.filter(u=>u.includes('/api/opportunities')).length,0,'hidden editor must not fetch sources');
 assert.equal(await page.locator('#searchOverlay').isVisible(),false);assert.equal(await page.locator('#newOverlay').isVisible(),false);assert.equal(await page.locator('#plugyDrawer').isVisible(),false);
 await page.locator('#globalSearch').click();await visible('#searchOverlay');await page.locator('#commandInput').fill('Bureau');await page.locator('#commandResults button').filter({hasText:'Bureau'}).waitFor();assert.equal(requests.some(u=>u.includes('/static/plugart_v162.js')),false);await page.keyboard.press('Escape');
 const bootBefore=requests.filter(u=>u.includes('dashboard-bootstrap')).length;await page.locator('#refreshData').click();await page.waitForFunction(()=>!document.querySelector('#refreshData').disabled);assert.ok(requests.filter(u=>u.includes('dashboard-bootstrap')).length>bootBefore);
 await page.locator('.nav-item[data-route="creation"]').click();await visible('#creationV200');await page.locator('#c200Source option').nth(2).waitFor({state:'attached'});const second=await page.locator('#c200Source option').nth(2).textContent();await page.locator('#c200Source').selectOption({index:2});await page.locator('#c200Source').selectOption('');assert.equal(await page.locator('#c200Name').inputValue(),second);
 const initialWidth=await width('#creationV200',900);
 await page.locator('.nav-item[data-route="radar"]').click();await visible('#radarEventsV167');await page.waitForFunction(()=>document.documentElement.dataset.legacyReady==='1');await width('.workspace',1000);await width('#eventGridV167',800);
 await page.locator('.nav-item[data-route="dashboard"]').click();await page.locator('.v202-overview-actions [data-v200-go="bureau"]').click();await visible('#bureauModeBar');assert.match(await page.locator('#plugyContext').textContent(),/Bureau/);
 await page.locator('.nav-item[data-route="creation"]').click();await width('#creationV200',900);assert.ok((await width('#creationV200',900))>=initialWidth-5);
 await page.locator('#topPlugy').click();await visible('#plugyDrawer');await page.locator('#plugyClose').click();assert.equal(await page.locator('#plugyDrawer').isVisible(),false);assert.equal(await page.locator('#plugyDrawer').getAttribute('aria-hidden'),'true');
 const idea=await (await context.request.post(base+'/api/v156/ideas',{data:{title:'Idée test V202',body:'Un angle culturel transmis'}})).json();
 await page.locator('.nav-item[data-route="ideas"]').click();await visible(`[data-idea-create-v167="${idea.id}"]`);await page.locator(`[data-idea-create-v167="${idea.id}"]`).click();await visible('#creationV200');assert.equal(await page.locator('#c200Name').inputValue(),'Idée test V202');assert.equal(await page.locator('#c200Brief').inputValue(),'Un angle culturel transmis');
 await page.locator('#c200New').click();await page.locator('#c200Name').fill('Exposition de vérification');
 const slides=Array.from({length:5},(_,i)=>({kicker:'EXPOSITION',title:'Slide '+(i+1),body:'Informations vérifiées '+(i+1)}));
 await page.route('**/api/v179/plugy/stream',route=>route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'delta',delta:JSON.stringify({slides,caption:'Légende vérifiée'})})+'\n'+JSON.stringify({type:'done',model:'test'})+'\n'}));
 await page.route('**/api/v179/content/image',async route=>{await new Promise(r=>setTimeout(r,700));await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,url:'/api/v201/visual-fallback?label=Verification&seed=V202',fallback:true})})});
 await page.locator('#c200Generate').click();await page.locator('.c200-slide').nth(4).waitFor();assert.equal(await page.locator('#c200Generate').isDisabled(),true,'copy should appear while images continue');await page.waitForFunction(()=>!document.querySelector('#c200Generate').disabled);assert.match(await page.locator('#c200Status').textContent(),/0 image\(s\) IA · 3 secours/);
 assert.equal(await page.locator('.c200-slide-bg').count(),5);await page.locator('[data-slide="0"] [data-edit="title"]').fill('Titre modifié');await page.locator('#c200Save').click();await page.locator('#c200Status').filter({hasText:'Brouillon enregistré'}).waitFor();const draftId=await page.locator('#c200DraftPicker').inputValue();assert.ok(Number(draftId)>0);
 await page.reload();await visible('#creationV200');await page.locator(`#c200DraftPicker option[value="${draftId}"]`).waitFor({state:'attached'});await page.locator('#c200DraftPicker').selectOption(draftId);assert.equal(await page.locator('[data-slide="0"] [data-edit="title"]').textContent(),'Titre modifié');assert.equal(await page.locator('#c200Legend').textContent(),'Légende vérifiée');
 const downloadPromise=page.waitForEvent('download');await page.locator('#c200Download').click();const download=await downloadPromise;await download.saveAs('test-results/carrousel.zip');
 await page.locator('.nav-item[data-route="map"]').click();await visible('#realMap');await width('#realMap',400);
 await page.locator('.nav-item[data-route="social"]').click();await visible('#igConnectionState');await page.locator('#igConnect').filter({hasText:'Configuration Meta requise'}).waitFor();assert.equal(await page.locator('#igPublish').isDisabled(),true);
 await page.setViewportSize({width:390,height:844});await page.locator('.nav-item[data-route="creation"]').click();await visible('#creationV200');await width('#creationV200',330);await page.screenshot({path:'test-results/mobile-creation.png',fullPage:true});
 // WebGL failures depend on the runner. Application JS errors must remain absent.
 const applicationErrors=errors.filter(e=>!/(WebGL|isPresenting|requestAnimationFrame|context)/i.test(e));assert.deepEqual(applicationErrors,[]);
 await writeFile('test-results/browser-checks.json',JSON.stringify({ok:true,initialWidth,requests:requests.length,errors},null,2));console.log('V202 browser journeys passed: light boot, refresh, widths, routes, drawer, imports, drafts, export, mobile.');
}catch(error){await page.screenshot({path:'test-results/failure.png',fullPage:true});await writeFile('test-results/errors.json',JSON.stringify({message:error.message,errors},null,2));throw error}
finally{await context.tracing.stop({path:'test-results/trace.zip'});await browser.close()}
