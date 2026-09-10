(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  function addMessage(text, who='bot', pending=false){
    const nodes=[];
    ['#desktopMsgs','#floatMsgs'].forEach(sel=>{
      const box=$(sel);
      if(!box)return;
      const el=document.createElement('div');
      el.className=`msg ${who}${pending?' plugy-pending':''}`;
      el.textContent=String(text??'');
      if(pending){el.style.opacity='.65';el.dataset.pending='1'}
      box.appendChild(el);box.scrollTop=box.scrollHeight;nodes.push(el);
    });
    return nodes;
  }

  function settle(nodes,text,isError=false){
    nodes.forEach(el=>{
      el.textContent=String(text??'');el.style.opacity='1';delete el.dataset.pending;
      if(isError){el.style.border='1px solid rgba(220,60,80,.24)';el.style.background='rgba(255,245,247,.95)'}
      if(el.parentElement)el.parentElement.scrollTop=el.parentElement.scrollHeight;
    });
  }

  async function robustAsk(q){
    q=String(q||'').trim();if(!q)return;
    addMessage(q,'user');
    const waiting=addMessage('PLUGY réfléchit…','bot',true);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
    try{
      const response=await fetch('/api/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q}),signal:controller.signal,cache:'no-store'});
      let data={};try{data=await response.json()}catch{throw new Error('Réponse serveur illisible')}
      if(!response.ok)throw new Error(data.detail||`Erreur serveur ${response.status}`);
      const answer=String(data.answer||'').trim();if(!answer)throw new Error('PLUGY a reçu une réponse vide');
      settle(waiting,answer,false);console.info('[PLUGY]',{ai:data.ai,model:data.model,fallback:data.fallback||false});
    }catch(err){
      const message=err?.name==='AbortError'?'PLUGY met trop de temps à répondre. Réessaie dans quelques secondes.':`PLUGY n’a pas pu répondre : ${err?.message||'erreur inconnue'}`;
      settle(waiting,message,true);console.error('[PLUGY]',err);
    }finally{clearTimeout(timer)}
  }

  window.ask=robustAsk;
  $$('.plug-form').forEach(form=>{form.onsubmit=e=>{e.preventDefault();const input=form.querySelector('input');const q=(input?.value||'').trim();if(!q)return;input.value='';robustAsk(q)}});
  $$('.ask').forEach(button=>{button.onclick=()=>robustAsk(button.dataset.q||button.textContent.trim())});

  // V26: aucun ancien runtime PLUGY n'est rechargé dynamiquement ici.
  // Le compagnon 3D unique est géré par site_v25 + site_v26.
  console.info('[PLUGY] AI chat bridge stable — legacy experience loader disabled');
})();
