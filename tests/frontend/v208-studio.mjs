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
 await page.locator('.nav-item[data-route="creation"]').click();
 await page.locator('#v208Canvas').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-template]').count(),12,'12 editable editorial templates');
 await page.locator('[data-v208-tab="colors"]').click();
 assert.equal(await page.locator('[data-palette]').count(),14,'14 art direction palettes');
 await page.locator('[data-palette="3"]').click();
 const colors=await page.evaluate(()=>window.PLUGART_V208.snapshot().payload.colors);
 assert.equal(colors.primary,'#44beed');

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
