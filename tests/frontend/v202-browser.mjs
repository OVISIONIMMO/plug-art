import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PLUGART_TEST_URL||'http://127.0.0.1:8765';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1363,height:936},acceptDownloads:true});
await context.tracing.start({screenshots:true,snapshots:true});
const page=await context.newPage(),errors=[],requests=[];
page.setDefaultTimeout(12000);
page.setDefaultNavigationTimeout(25000);
const mark=(stage)=>console.log('[V207 browser] '+stage);
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
async function visible(selector){await page.locator(selector).waitFor({state:'visible'})}
async function width(selector,min){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.width>=min,`${selector}: expected >= ${min}, got ${box?.width}`);return box.width}
async function fittedSlide(){const rail=await page.locator('#c200Carousel').boundingBox(),slide=await page.locator('.c200-slide').first().boundingBox();assert.ok(slide&&rail&&slide.width<=rail.width-7,`carousel slide must fit its panel: ${slide?.width} / ${rail?.width}`)}
try{
 mark('boot dashboard');await page.goto(base,{waitUntil:'domcontentloaded'});await visible('#v209Dashboard');
 const shell=await page.evaluate(()=>({body:document.body.classList.contains('plugart-v209'),sidebar:getComputedStyle(document.querySelector('.sidebar')).backgroundColor,topbar:getComputedStyle(document.querySelector('.topbar')).backgroundColor}));
 assert.equal(shell.body,true,'V209 violet shell must be active');
 assert.equal(await page.locator('link[href*="/plugart_v207_core.css"]').count(),1,'one consolidated stylesheet');
 assert.equal(await page.locator('script[src*="/plugart_v207_core.js"]').count(),1,'one consolidated UI runtime');
 await page.waitForFunction(()=>window.__PLUGART_V207_READY===true);
 assert.equal((await page.locator('#buildPill').textContent()).trim(),'V209','active build must be V209');
 const legacyOverlayRequests=requests.filter(u=>/plugart_v20(4_prod|5_ios|6_radar)\.(js|css)/.test(u));
 assert.equal(legacyOverlayRequests.length,0,'retired overlay assets must not be downloaded');
 assert.ok(!/255, 255, 255|247, 249, 252/.test(shell.sidebar),'V209 sidebar must be dark violet, not white');
 assert.ok(!/255, 255, 255|247, 249, 252/.test(shell.topbar),'V209 topbar must be translucent violet, not white');
 assert.equal(await page.locator('.nav-item[data-route="dashboard"]').isVisible(),true,'navigation buttons must remain visible');await page.locator('#v209Dashboard .n9-kpi').first().waitFor();
 assert.equal(requests.filter(u=>u.includes('/api/opportunities')).length,0,'hidden editor must not fetch sources');
 assert.equal(await page.locator('#searchOverlay').isVisible(),false);assert.equal(await page.locator('#newOverlay').isVisible(),false);assert.equal(await page.locator('#plugyDrawer').isVisible(),false);
 mark('search and navigation');await page.locator('#globalSearch').click();await visible('#searchOverlay');await page.locator('#commandInput').fill('Bureau');await page.locator('#commandResults button').filter({hasText:'Bureau'}).waitFor();assert.equal(requests.some(u=>u.includes('/static/plugart_v162.js')),false);await page.keyboard.press('Escape');
 const bootBefore=requests.filter(u=>u.includes('dashboard-bootstrap')).length;await page.locator('#refreshData').click();await page.waitForFunction(()=>!document.querySelector('#refreshData').disabled);assert.ok(requests.filter(u=>u.includes('dashboard-bootstrap')).length>bootBefore);
 await page.locator('.nav-item[data-route="creation"]').click();await visible('#v208Studio');await page.locator('#v208LegacyToggle').click();await visible('#creationV200');await page.locator('#c200Source option').nth(2).waitFor({state:'attached'});const second=await page.locator('#c200Source option').nth(2).textContent();await page.locator('#c200Source').selectOption({index:2});await page.locator('#c200Source').selectOption('');assert.equal(await page.locator('#c200Name').inputValue(),second);
 mark('creation and responsive layout');const initialWidth=await width('#creationV200',900);
 await page.locator('.nav-item[data-route="radar"]:not([data-radar-direct])').click();await visible('#radarEventsV167');await page.waitForFunction(()=>document.documentElement.dataset.legacyReady==='1');await width('.workspace',1000);await width('#eventGridV167',800);
 await page.locator('.nav-item[data-route="dashboard"]').click();await page.locator('#v209Dashboard .n9-kpi[data-n9-route="bureau"]').click();await visible('#bureauModeBar');assert.match(await page.locator('#plugyContext').textContent(),/Bureau/);
 await page.locator('.nav-item[data-route="creation"]').click();await width('#creationV200',900);assert.ok((await width('#creationV200',900))>=initialWidth-5);
 await visible('#v204PlugyMini,#v205PlugyMini');await page.locator('#v204PlugyMini,#v205PlugyMini').first().click();await visible('#plugyDrawer');await page.locator('#plugyClose').click();assert.equal(await page.locator('#plugyDrawer').isVisible(),false);assert.equal(await page.locator('#plugyDrawer').getAttribute('aria-hidden'),'true');
 const idea=await (await context.request.post(base+'/api/v156/ideas',{data:{title:'Idée test V202',body:'Un angle culturel transmis'}})).json();
 await page.locator('.nav-item[data-route="ideas"]').click();await visible(`[data-idea-create-v167="${idea.id}"]`);await page.locator(`[data-idea-create-v167="${idea.id}"]`).click();await visible('#creationV200');assert.equal(await page.locator('#c200Name').inputValue(),'Idée test V202');assert.equal(await page.locator('#c200Brief').inputValue(),'Un angle culturel transmis');
 await page.locator('#c200New').click();await page.locator('#c200Name').fill('Exposition de vérification');
 const slides=Array.from({length:5},(_,i)=>({kicker:'EXPOSITION',title:'Slide '+(i+1),body:'Informations vérifiées '+(i+1)}));
 await page.route('**/api/v179/plugy/stream',route=>route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'delta',delta:JSON.stringify({slides,caption:'Légende vérifiée'})})+'\n'+JSON.stringify({type:'done',model:'test'})+'\n'}));
 await page.route('**/api/v179/content/image',async route=>{await new Promise(r=>setTimeout(r,700));await route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,url:'/api/v201/visual-fallback?label=Verification&seed=V202',fallback:true})})});
 mark('generate five slides');await page.locator('#c200Generate').click();await page.locator('.c200-slide').nth(4).waitFor();assert.equal(await page.locator('#c200Generate').isDisabled(),true,'copy should appear while images continue');await page.waitForFunction(()=>!document.querySelector('#c200Generate').disabled);assert.match(await page.locator('#c200Status').textContent(),/0 image\(s\) IA · 3 secours/);
 assert.equal(await page.locator('.c200-slide-bg').count(),5);assert.equal(await page.locator('.c203-guides').count(),5);assert.ok(await page.locator('.c203-da-card').count()>=10,'design catalog should expose at least 10 visual directions');assert.equal(await page.locator('#creationV200').evaluate(el=>el.classList.contains('c203-guides-on')),true,'composition guides should be visible by default');const labelStyle=await page.locator('.c203-da-copy small').first().evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,overflow:getComputedStyle(el).overflow}));assert.equal(labelStyle.whiteSpace,'normal');assert.equal(labelStyle.overflow,'visible');await page.locator('#c203Guides').click();assert.equal(await page.locator('#creationV200').evaluate(el=>el.classList.contains('c203-guides-on')),false);await page.locator('#c203Guides').click();await fittedSlide();await page.setViewportSize({width:1080,height:936});await fittedSlide();await page.setViewportSize({width:1363,height:936});await page.locator('[data-slide="0"] [data-edit="title"]').fill('Titre modifié');await page.locator('#c200Save').click();await page.locator('#c200Status').filter({hasText:'Brouillon enregistré'}).waitFor();const draftId=await page.locator('#c200DraftPicker').inputValue();assert.ok(Number(draftId)>0);
 mark('reload drafts');await page.reload({waitUntil:'domcontentloaded'});await visible('#creationV200');await page.locator(`#c200DraftPicker option[value="${draftId}"]`).waitFor({state:'attached'});await page.locator('#c200DraftPicker').selectOption(draftId);assert.equal(await page.locator('[data-slide="0"] [data-edit="title"]').textContent(),'Titre modifié');assert.equal(await page.locator('#c200Legend').textContent(),'Légende vérifiée');
 mark('ZIP export');const downloadPromise=page.waitForEvent('download');await page.locator('#c200Download').click();const download=await downloadPromise;await download.saveAs('test-results/carrousel.zip');
 await page.locator('.nav-item[data-route="map"]').click();await visible('#realMap');await width('#realMap',400);
 await page.locator('.nav-item[data-route="social"]').click();await visible('#igConnectionState');await page.locator('#igConnect').filter({hasText:'Configuration Meta requise'}).waitFor();assert.equal(await page.locator('#igPublish').isDisabled(),true);
 mark('mobile layout');await page.setViewportSize({width:390,height:844});await page.locator('.nav-item[data-route="creation"]').click();await visible('#creationV200');await width('#creationV200',330);await fittedSlide();await page.screenshot({path:'test-results/mobile-creation.png',fullPage:true});
 assert.deepEqual(errors,[],'application JavaScript errors must remain absent');
 await writeFile('test-results/browser-checks.json',JSON.stringify({ok:true,initialWidth,requests:requests.length,errors},null,2));console.log('V207 browser journeys passed: ultraviolet boot, functional dashboard, widths, routes, mini Plugy drawer, imports, drafts, export, mobile.');
}catch(error){await page.screenshot({path:'test-results/failure.png',fullPage:true});await writeFile('test-results/errors.json',JSON.stringify({message:error.message,errors},null,2));throw error}
finally{await context.tracing.stop({path:'test-results/trace.zip'});await browser.close()}
