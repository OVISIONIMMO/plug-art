import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';

const base=process.env.PLUGART_TEST_URL||'http://127.0.0.1:8765';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1450,height:980},acceptDownloads:true});
page.setDefaultTimeout(16000);
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const mark=s=>console.log('[V208 E2E] '+s);
try{
 mark('open studio');
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#paThemeToggle').waitFor({state:'visible'});
 await page.locator('#paThemeToggle').click();
 await page.locator('[data-pa-theme-option="glacier"]').click();
 assert.equal(await page.locator('body').getAttribute('data-pa-theme'),'glacier','global theme selection');
 await page.locator('#paThemeToggle').click();
 await page.locator('[data-pa-theme-option="warm"]').click();
 assert.equal(await page.locator('body').getAttribute('data-pa-theme'),'warm','warm UI theme');
 await page.locator('.nav-item[data-route="creation"]').click();
 await page.locator('#v208Canvas').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-template]').count(),12,'12 editable editorial templates');
 await page.locator('[data-v208-tab="colors"]').click();
 assert.equal(await page.locator('[data-palette]').count(),14,'14 art direction palettes');
 await page.locator('[data-palette="3"]').click();
 const colors=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.colors);
 assert.equal(colors.primary,'#44beed');
 mark('twelve distinct background styles');
 await page.locator('[data-v208-tab="backgrounds"]').click();
 assert.equal(await page.locator('[data-background]').count(),12,'12 background treatments');
 const beforeBg=await page.locator('#v208Canvas').evaluate(c=>c.toDataURL('image/png'));
 await page.locator('[data-background="grid"]').click();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const gridBg=await page.locator('#v208Canvas').evaluate(c=>c.toDataURL('image/png'));
 assert.ok(beforeBg!==gridBg,'Swiss grid must actually redraw the canvas');
 await page.locator('[data-background="stripes"]').click();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const stripesBg=await page.locator('#v208Canvas').evaluate(c=>c.toDataURL('image/png'));
 assert.ok(gridBg!==stripesBg,'kinetic stripes distinct from Swiss grid');
 await page.locator('#v208Texture').evaluate(el=>{el.value='68';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal((await page.evaluate(()=>window.PLUGART_V208.snapshot().payload)).texture,68);
 await page.locator('[data-action="background-all"]').click();
 assert.ok((await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.slides)).every(d=>d.background==='stripes'));


 mark('write brief');
 await page.locator('[data-v208-tab="brief"]').click();
 await page.locator('#v208ProjectName').fill('V208 QA Publication');
 await page.locator('[data-v208-fact="title"]').fill('PARIS EMERGING ARTISTS');
 await page.locator('[data-v208-fact="city"]').fill('PARIS');
 await page.locator('[data-v208-fact="venue"]').fill('Galerie Test');
 await page.locator('[data-v208-fact="deadline"]').fill('22 OCT 2026');
 await page.locator('[data-action="regenerate"]').first().click();
 assert.equal(await page.locator('[data-v208-thumb]').count(),5);

 mark('upload official artwork');
 await page.locator('[data-v208-tab="sources"]').click();
 const base64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=280;c.height=360;
  const ctx=c.getContext('2d');ctx.fillStyle='#1761ff';ctx.fillRect(0,0,280,360);
  ctx.fillStyle='#fff';ctx.font='bold 34px sans-serif';ctx.fillText('OFFICIAL',35,170);
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#v208Upload').setInputFiles({name:'official-test.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});
 await page.locator('[data-asset="0"]').waitFor();
 const assets=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.assets);
 assert.equal(assets.length,1);
 assert.ok(assets[0].url.startsWith('/api/v179/generated/'));

 mark('templates, editing and variants');
 await page.locator('[data-v208-tab="styles"]').click();
 await page.locator('[data-template="split"]').click();
 const before=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.slides[0].template);
 assert.equal(before,'split');
 await page.locator('[data-action="add-text"]').click();
 await page.locator('#v208Inspector textarea[data-property="text"]').fill('DEADLINE CONFIRMÉE');
 const text=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.slides[0].blocks.at(-1).text);
 assert.equal(text,'DEADLINE CONFIRMÉE');
 mark('AI generation preserves official artwork and custom layers');
 const projectBefore=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload);
 await page.route('**/api/v208/studio/copy',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({
   ok:true,slides:[{kicker:'SOURCE OFFICIELLE',title:'PARIS EXPO COLLECTIVE',body:'Informations vérifiées'}],caption:'Texte IA à relire',requires_review:true
 })}));
 await page.locator('#v208AICopy').click();
 await page.waitForFunction(()=>!document.querySelector('#v208AICopy').disabled &&
   window.PLUGART_V208.snapshot().payload.slides[0].blocks.some(b=>b.role==='title'&&b.text==='PARIS EXPO COLLECTIVE'));
 const projectAfter=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload);
 assert.equal(projectAfter.slides[0].background,projectBefore.slides[0].background,'AI must preserve background');
 assert.ok(projectAfter.slides[0].blocks.some(b=>b.type==='image'&&b.url===assets[0].url),'AI must preserve official flyer');
 assert.ok(projectAfter.slides[0].blocks.some(b=>b.text==='DEADLINE CONFIRMÉE'),'AI must preserve extra text layer');
 await page.unroute('**/api/v208/studio/copy');
 mark('AI error is not destructive');
 await page.route('**/api/v208/studio/copy',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Service IA temporairement indisponible'})}));
 const savedBeforeFailure=JSON.stringify((await page.evaluate(()=>window.PLUGART_V208.snapshot())).payload.slides);
 await page.locator('#v208AICopy').click();
 await page.waitForFunction(()=>!document.querySelector('#v208AICopy').disabled && document.querySelector('#v208Status').textContent.includes('conservées'));
 assert.equal(JSON.stringify((await page.evaluate(()=>window.PLUGART_V208.snapshot())).payload.slides),savedBeforeFailure,'error must not reset edits');
 await page.unroute('**/api/v208/studio/copy');
 await page.locator('.v208-stage-toolbar [data-action="variants"]').click();
 await page.locator('[data-variant="1"]').waitFor({state:'visible'});
 await page.locator('[data-variant="1"]').click();
 assert.equal(await page.locator('#v208VariantModal').isVisible(),false);

 mark('persist and reopen');
 await page.locator('[data-action="save"]').click();
 await page.waitForFunction(()=>window.PLUGART_V208.snapshot().title==='V208 QA Publication');
 const select=page.locator('#v208Projects');
 await page.waitForFunction(()=>document.querySelector('#v208Projects option[value]:not([value=""])')!==null);
 const id=await select.locator('option[value]:not([value=""])').last().getAttribute('value');
 assert.ok(Number(id)>0);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.nav-item[data-route="creation"]').click();
 await page.locator('#v208Canvas').waitFor();
 await page.locator('#v208Projects option[value="'+id+'"]').waitFor({state:'attached'});
 await page.locator('#v208Projects').selectOption(id);
 await page.waitForFunction(()=>document.querySelector('#v208ProjectName')?.value==='V208 QA Publication');
 assert.equal(await page.locator('#v208ProjectName').inputValue(),'V208 QA Publication');
 assert.equal((await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.assets)).length,1);
 assert.ok((await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.slides)).every(d=>d.background),'saved background information');
 assert.equal(await page.locator('body').getAttribute('data-pa-theme'),'warm','theme persists across reload');

 mark('PNG, ZIP, PDF exports');
 for(const [action,name] of [['png','single'],['zip','carrousel'],['pdf','pdf']]){
  const p=page.waitForEvent('download',{timeout:40000});
  await page.locator('[data-action="'+action+'"]').first().click();
  const d=await p;assert.ok(d.suggestedFilename().length>3);
  const path='test-results/v208-'+name+'.'+(action==='zip'?'zip':action==='pdf'?'pdf':'png');
  await d.saveAs(path);
  const bytes=await readFile(path);
  assert.ok(bytes.length>1000);
  if(action==='pdf')assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  if(action==='zip')assert.equal(bytes.subarray(0,2).toString(),'PK');
 }
 mark('mobile display');
 await page.setViewportSize({width:390,height:844});
 await page.locator('#v208Canvas').waitFor({state:'visible'});
 assert.ok((await page.locator('#v208Canvas').boundingBox()).width>220);
 await page.screenshot({path:'test-results/v208-mobile.png',fullPage:true});
 assert.deepEqual(errors,[],'no uncaught frontend errors');
 console.log('V208 studio end-to-end passed');
}finally{await browser.close();}
