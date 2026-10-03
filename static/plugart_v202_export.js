/* On-demand export: compose the visible layout, then package every PNG. */
(function(){
'use strict';
function image(url){return new Promise(function(resolve,reject){var img=new Image(),timer=setTimeout(function(){img.src='';reject(new Error('Une image n’est pas disponible. Réessaie après son chargement.'))},15000);img.crossOrigin='anonymous';img.onload=function(){clearTimeout(timer);resolve(img)};img.onerror=function(){clearTimeout(timer);reject(new Error('Une image n’est pas disponible. Remplace-la avant l’export.'))};img.src=url})}
function cover(ctx,img,x,y,w,h){var s=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*s,ih=img.naturalHeight*s;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore()}
function lines(ctx,text,width){
 var out=[];String(text||'').split('\n').forEach(function(paragraph){var line='';paragraph.split(/\s+/).filter(Boolean).forEach(function(word){if(ctx.measureText(word).width>width){if(line){out.push(line);line=''}for(var char of word){if(line&&ctx.measureText(line+char).width>width){out.push(line);line=''}line+=char}return}if(line&&ctx.measureText(line+' '+word).width>width){out.push(line);line=word}else line+=(line?' ':'')+word});out.push(line)});return out;
}
function text(ctx,el,article,scale){
 var style=getComputedStyle(el),rect=el.getBoundingClientRect(),base=article.getBoundingClientRect(),size=parseFloat(style.fontSize)*scale,lineHeight=(parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.2)*scale;
 ctx.font=style.fontStyle+' '+style.fontWeight+' '+size+'px '+style.fontFamily;ctx.fillStyle=style.color;ctx.textBaseline='top';
 if('letterSpacing' in ctx)ctx.letterSpacing=(parseFloat(style.letterSpacing)||0)*scale+'px';
 var value=el.textContent;if(style.textTransform==='uppercase')value=value.toUpperCase();
 lines(ctx,value,rect.width*scale).forEach(function(line,i){ctx.fillText(line,(rect.left-base.left)*scale,(rect.top-base.top)*scale+i*lineHeight)});
}
async function png(article,url,snapshot){
 var rect=article.getBoundingClientRect();if(rect.width<1)throw new Error('Ouvre le Labo Création avant l’export.');
 var ratio=snapshot.payload.format||'4:5',parts=ratio.split(':').map(Number),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=Math.round(1080*parts[1]/parts[0]);
 var ctx=canvas.getContext('2d');if(!ctx)throw new Error('Export image non disponible dans ce navigateur');var scale=canvas.width/rect.width,w=canvas.width,h=canvas.height;
 ctx.fillStyle=snapshot.payload.da==='museum'?'#efece4':'#111214';ctx.fillRect(0,0,w,h);
 var img=await image(url),ir=article.querySelector('.c200-slide-bg').getBoundingClientRect();cover(ctx,img,(ir.left-rect.left)*scale,(ir.top-rect.top)*scale,ir.width*scale,ir.height*scale);
 if(snapshot.payload.da==='chromatic'){
  [[.8,.2,'rgba(98,84,255,.55)',.34],[.1,.9,'rgba(0,224,255,.28)',.35]].forEach(function(v){var g=ctx.createRadialGradient(w*v[0],h*v[1],0,w*v[0],h*v[1],w*v[3]);g.addColorStop(0,v[2]);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
 }
 var layout=snapshot.payload.layout,g=ctx.createLinearGradient(0,0,layout==='split'?w:0,layout==='split'?0:h);
 if(snapshot.payload.da==='museum'){g.addColorStop(0,'rgba(250,248,241,.05)');g.addColorStop(1,'rgba(239,236,228,.96)')}
 else if(layout==='split'){g.addColorStop(0,'rgba(0,0,0,.82)');g.addColorStop(.48,'rgba(0,0,0,.82)');g.addColorStop(.73,'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,.08)')}
 else if(layout==='grid'){g.addColorStop(.4,'rgba(0,0,0,0)');g.addColorStop(.68,'rgba(0,0,0,.92)')}
 else{g.addColorStop(0,layout==='poster'?'rgba(0,0,0,.05)':'rgba(0,0,0,.03)');g.addColorStop(1,layout==='poster'?'rgba(0,0,0,.4)':'rgba(0,0,0,.75)')}
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);article.querySelectorAll('[data-edit]').forEach(function(el){text(ctx,el,article,scale)});
 return new Promise(function(resolve,reject){canvas.toBlob(function(blob){if(blob)blob.arrayBuffer().then(function(b){resolve(new Uint8Array(b))});else reject(new Error('Composition image impossible'))},'image/png')});
}
var CRC=Array.from({length:256},function(_,n){for(var k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc(raw){var n=0xffffffff;for(var i=0;i<raw.length;i++)n=CRC[(n^raw[i])&255]^(n>>>8);return (n^0xffffffff)>>>0}
function zip(files){
 var encoder=new TextEncoder(),chunks=[],central=[],offset=0,centralSize=0;
 files.forEach(function(file){
  var name=encoder.encode(file.name),raw=file.raw,checksum=crc(raw),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,checksum,true);v.setUint32(18,raw.length,true);v.setUint32(22,raw.length,true);v.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,raw);
  var entry=new Uint8Array(46+name.length),e=new DataView(entry.buffer);e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint32(16,checksum,true);e.setUint32(20,raw.length,true);e.setUint32(24,raw.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);central.push(entry);centralSize+=entry.length;offset+=local.length+raw.length;
 });
 var end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob(chunks.concat(central,[end]),{type:'application/zip'});
}
window.PLUGART_EXPORT_V202=async function(snapshot,urls){
 await document.fonts?.ready;var articles=Array.from(document.querySelectorAll('#c200Carousel .c200-slide')),files=[];
 if(articles.length!==snapshot.payload.slides.length)throw new Error('Aperçu incomplet. Recharge le brouillon avant l’export.');
 for(var i=0;i<articles.length;i++)files.push({name:'slide_'+String(i+1).padStart(2,'0')+'.png',raw:await png(articles[i],urls[i],snapshot)});
 var encoder=new TextEncoder();files.push({name:'legende.txt',raw:encoder.encode(snapshot.payload.instagram_caption||'')},{name:'campagne.json',raw:encoder.encode(JSON.stringify(snapshot,null,2))});
 var blob=zip(files),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PLUG_ART_'+String(snapshot.title||'carrousel').replace(/[^a-z0-9]+/gi,'_').slice(0,80)+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},30000);
};
})();
