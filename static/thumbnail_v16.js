/* PLUG ART V16 — robust thumbnail rendering */
(() => {
  const fallbackData = (label='PLUG ART', hue=224) => {
    const title = String(label || 'PLUG ART').replace(/[<>&"']/g,'').slice(0,70);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 56% 28%)"/><stop offset=".58" stop-color="hsl(${(hue+34)%360} 58% 22%)"/><stop offset="1" stop-color="#151b39"/></linearGradient></defs>
      <rect width="1200" height="720" fill="url(#g)"/>
      <circle cx="180" cy="120" r="250" fill="#6d8cff" opacity=".20"/>
      <circle cx="1030" cy="610" r="300" fill="#ef65bd" opacity=".16"/>
      <text x="72" y="105" fill="#f7f9ff" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="34">PLUG ART</text>
      <text x="72" y="560" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="48">${title}</text>
      <text x="72" y="620" fill="#bcc8e2" font-family="Arial,Helvetica,sans-serif" font-size="24">Aperçu visuel</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const safeLabel = value => String(value || 'Aperçu').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  try {
    resolveThumb = function(item, kind, index=0){
      if(kind === 'opportunity' && item?.id) return `/api/opportunities/${item.id}/thumbnail`;
      if(kind === 'event' && item?.id) return `/api/exhibitions/${item.id}/thumbnail`;
      if(item?.image_url || item?.thumbnail || item?.image) return item.image_url || item.thumbnail || item.image;
      return fallbackData(item?.title || item?.name || 'PLUG ART', (index * 47 + 218) % 360);
    };
  } catch (_) {}

  try {
    thumbHTML = function(src,label,badge=''){
      const cleanLabel = safeLabel(label);
      const cleanBadge = safeLabel(badge);
      const fallback = fallbackData(label, 226);
      return `<div class="thumb v16-thumb">
        <div class="thumb-placeholder-v16"><span>Chargement de la miniature</span><strong>${cleanLabel}</strong></div>
        <img class="thumb-image-v16" loading="lazy" decoding="async" src="${safeLabel(src)}" data-fallback-src="${safeLabel(fallback)}" alt="${cleanLabel}">
        ${badge ? `<div class="thumb-badge">${cleanBadge}</div>` : ''}
      </div>`;
    };
  } catch (_) {}

  const finishImage = img => {
    const holder = img.closest('.thumb');
    if(!holder) return;
    img.classList.add('is-loaded');
    holder.classList.remove('is-error');
    const ph = holder.querySelector('.thumb-placeholder-v16,.thumb-fallback-v16');
    if(ph) ph.style.opacity = '0';
  };

  const failImage = img => {
    if(img.dataset.v16FallbackApplied === '1'){
      const holder = img.closest('.thumb');
      if(holder) holder.classList.add('is-error');
      img.style.display = 'none';
      return;
    }
    img.dataset.v16FallbackApplied = '1';
    const fallback = img.dataset.fallbackSrc || fallbackData(img.alt || 'PLUG ART', 226);
    img.src = fallback;
  };

  document.addEventListener('load', e => {
    const img = e.target;
    if(img instanceof HTMLImageElement && img.closest('.thumb')) finishImage(img);
  }, true);

  document.addEventListener('error', e => {
    const img = e.target;
    if(!(img instanceof HTMLImageElement)) return;
    if(img.closest('.thumb') || img.id === 'modalImage' || img.id === 'detailImage' || img.closest('.map-item')) failImage(img);
  }, true);

  const repairRenderedImages = () => {
    document.querySelectorAll('.thumb img').forEach(img => {
      if(!img.dataset.fallbackSrc) img.dataset.fallbackSrc = fallbackData(img.alt || 'PLUG ART', 226);
      if(img.complete){
        if(img.naturalWidth > 0) finishImage(img); else failImage(img);
      }
    });
    document.querySelectorAll('#mapList img,#modalImage,#detailImage').forEach(img => {
      if(!img.dataset.fallbackSrc) img.dataset.fallbackSrc = fallbackData(img.alt || 'PLUG ART', 238);
      if(img.complete && !img.naturalWidth) failImage(img);
    });
  };

  const rerender = () => {
    try { if(typeof S !== 'undefined' && S.opps?.length && typeof renderOpps === 'function') renderOpps(); } catch(_) {}
    try { if(typeof S !== 'undefined' && S.events?.length && typeof renderEvents === 'function') renderEvents(); } catch(_) {}
    try { if(typeof S !== 'undefined' && S.map?.length && typeof renderMap === 'function') renderMap(); } catch(_) {}
    setTimeout(repairRenderedImages, 80);
  };

  const observer = new MutationObserver(() => repairRenderedImages());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(rerender, 180);
  setTimeout(rerender, 900);
  setTimeout(repairRenderedImages, 1800);
})();
