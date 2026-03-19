// OfertasDomoticas.com — app.js v2
// Súper oferta del día, modo claro/oscuro, filtros, ordenamiento, archivo

let allItems = [];
let archiveItems = [];
let dealFilter = 'all';
let ecosystemFilter = 'all';
let dealSort = 'discount';
let archiveFilter = 'all';

const platClass = p => {
  if (!p) return 'other';
  const l = p.toLowerCase();
  if (l.includes('amazon')) return 'amazon';
  if (l.includes('ebay')) return 'ebay';
  if (l.includes('alibaba')) return 'alibaba';
  return 'other';
};
const platIcon = p => {
  if (!p) return '🌐';
  const l = p.toLowerCase();
  if (l.includes('amazon')) return '🛒';
  if (l.includes('ebay')) return '🏪';
  if (l.includes('alibaba')) return '📦';
  return '🌐';
};
const parsePrice = s => parseFloat((s||'0').replace(/[^0-9.]/g,'')) || 0;
const parseDiscount = s => parseInt((s||'0').replace(/[^0-9]/g,'')) || 0;

// ── BANNER DE COOKIES ────────────────────────────────────────────────────────
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  // Show if no consent saved — use transform to avoid CLS
  if (!localStorage.getItem('cookies')) {
    // Small delay so page renders first, then banner slides in
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 1500);
  }

  const accept = document.getElementById('cookie-accept');
  const reject = document.getElementById('cookie-reject');

  if (accept) accept.addEventListener('click', () => {
    localStorage.setItem('cookies', 'accepted');
    banner.style.transform = 'translateY(100%)';
  });

  if (reject) reject.addEventListener('click', () => {
    localStorage.setItem('cookies', 'rejected');
    banner.style.transform = 'translateY(100%)';
  });
}


// ── SISTEMA DE IDIOMA ES/EN ───────────────────────────────────────────────────
const LANG_STRINGS = {
  es: {
    dealsCount: 'ofertas',
    newsCount: 'noticias',
    archiveCount: 'items',
    readMore: 'Leer más',
    viewDeal: 'Ver oferta',
    alertPrice: '🔔 Avísame si baja',
    noDeals: 'Sin ofertas en esta categoría',
    noNews: 'Sin noticias hoy',
    noArchive: 'Archivo vacío — se llena cada semana',
    loading: 'Cargando...',
    popupTitle: '¿Precio muy alto ahora?',
    popupDesc: 'Únete a nuestro canal de Telegram. Avisamos al instante cuando',
    popupDesc2: 'alcance su mínimo histórico.',
    popupBtn: '✈ Unirse al canal de Telegram',
    popupClose: 'Ahora no',
    superDealBadge: '⭐ Súper oferta del día',
    superDealLive: '🔥 de descuento',
    superDealBtn: '🛒 Comprar ahora',
    superDealUpdated: 'Actualizado hoy a las 7:00am',
    copyOk: '¡Copiado!',
    articleType: { news: '📡 Noticia', promo: '🏷️ Oferta', review: '⭐ Review', comparativa: '⚖️ Comparativa' }
  },
  en: {
    dealsCount: 'deals',
    newsCount: 'news',
    archiveCount: 'items',
    readMore: 'Read more',
    viewDeal: 'View deal',
    alertPrice: '🔔 Notify me if price drops',
    noDeals: 'No deals in this category',
    noNews: 'No news today',
    noArchive: 'Archive empty — fills up weekly',
    loading: 'Loading...',
    popupTitle: 'Price too high right now?',
    popupDesc: 'Join our Telegram channel. We notify you instantly when',
    popupDesc2: 'reaches its historical minimum price.',
    popupBtn: '✈ Join Telegram channel',
    popupClose: 'Not now',
    superDealBadge: '⭐ Deal of the day',
    superDealLive: '🔥 off today',
    superDealBtn: '🛒 Buy now',
    superDealUpdated: 'Updated today at 7:00am',
    copyOk: 'Copied!',
    articleType: { news: '📡 News', promo: '🏷️ Deal', review: '⭐ Review', comparativa: '⚖️ Comparison' }
  }
};

let currentLang = 'es';

function detectLang() {
  // 1. Check localStorage preference
  const saved = localStorage.getItem('lang');
  if (saved === 'en' || saved === 'es') return saved;
  // 2. Check URL param ?lang=en
  const urlParam = new URLSearchParams(window.location.search).get('lang');
  if (urlParam === 'en' || urlParam === 'es') return urlParam;
  // 3. Detect from browser
  const browserLang = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  return 'es';
}

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  // Update button
  const btn = document.getElementById('lang-btn');
  if (btn) {
    btn.textContent = lang === 'es' ? 'EN' : 'ES';
    btn.title = lang === 'es' ? 'Switch to English' : 'Cambiar a Español';
  }

  // Update html lang attribute
  document.documentElement.lang = lang;

  // Update all elements with data-es/data-en
  document.querySelectorAll('[data-es][data-en]').forEach(el => {
    el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-es');
  });

  // Update sort select options
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    const opts = lang === 'en'
      ? ['Highest discount', 'Price: low to high', 'Price: high to low']
      : ['Mayor descuento', 'Precio: menor a mayor', 'Precio: mayor a menor'];
    Array.from(sortSelect.options).forEach((opt, i) => {
      if (opts[i]) opt.text = opts[i];
    });
  }

  // Re-render dynamic content with new language
  if (allItems.length > 0) {
    renderDeals(allItems);
    renderNewsFiltered(allItems);
  }
  if (archiveItems.length > 0) {
    renderArchive(archiveItems);
  }
}

function initLang() {
  const lang = detectLang();
  applyLang(lang);

  const btn = document.getElementById('lang-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      applyLang(currentLang === 'es' ? 'en' : 'es');
    });
  }
}

function t(key) {
  return LANG_STRINGS[currentLang][key] || LANG_STRINGS.es[key] || key;
}

// ── TEMA CLARO/OSCURO ─────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme');
  const btn = document.getElementById('theme-btn');
  if (saved === 'light') {
    document.body.classList.add('light');
    if (btn) btn.textContent = '☀️';
  }
  if (btn) {
    btn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light');
      btn.textContent = isLight ? '☀️' : '🌙';
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }
}

// ── SÚPER OFERTA DEL DÍA ─────────────────────────────────────────────────────
function renderSuperDeal(items) {
  const sdBadge = document.querySelector('#super-deal .sd-badge');
  if (sdBadge) sdBadge.setAttribute('data-es','⭐ Súper oferta del día');
  if (sdBadge) sdBadge.setAttribute('data-en','⭐ Deal of the day');
  const sdInner = document.getElementById('sd-inner');
  const sdEmpty = document.getElementById('sd-empty');
  if (!sdInner) return;

  const featured = items
    .filter(i => i.type === 'promo' && i.featured && i.price)
    .sort((a,b) => parseDiscount(b.discount) - parseDiscount(a.discount));

  if (featured.length === 0) {
    if (sdEmpty) { sdEmpty.style.display = 'block'; sdEmpty.textContent = 'Sin ofertas destacadas hoy.'; }
    sdInner.style.display = 'none';
    return;
  }

  const deal = featured[0];
  if (sdEmpty) sdEmpty.style.display = 'none';
  sdInner.style.display = 'grid';

  const set = (id, val, show=true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (!show) el.style.display = 'none';
    else el.style.display = '';
  };

  set('sd-title', deal.title);
  set('sd-desc', deal.body);
  set('sd-price', deal.price);
  set('sd-old', deal.originalPrice || '', !!deal.originalPrice);
  set('sd-disc', deal.discount ? deal.discount + ' HOY' : '', !!deal.discount);
  set('sd-plat', `${platIcon(deal.platform)} ${deal.platform || ''} · Envío disponible`);
  set('sd-tag', parseDiscount(deal.discount) > 0 ? `🔥 ${deal.discount} de descuento` : 'Precio mínimo histórico');

  const proto = document.getElementById('sd-proto');
  if (proto) {
    if (deal.protocol) { proto.textContent = `⬡ ${deal.protocol}`; proto.style.display = 'inline-flex'; }
    else proto.style.display = 'none';
  }

  const btn = document.getElementById('sd-btn');
  if (btn) btn.href = deal.url || '#';
  // Update alert button with real title
  const alertBtn = document.getElementById('sd-alert-btn');
  if (alertBtn) alertBtn.setAttribute('data-title', deal.title || 'esta oferta');
}



// ── COPIAR ENLACE ─────────────────────────────────────────────────────────────
function copyLink(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = `<span style="font-size:12px;font-weight:700;color:var(--accent,#00d4aa);">${t('copyOk')}</span>`;
    setTimeout(() => { btn.innerHTML = original; }, 2000);
  }).catch(err => console.error('Error al copiar:', err));
}

// ── POPUP ALERTA DE PRECIO ────────────────────────────────────────────────────
function showPriceAlert(e, productTitle) {
  e.preventDefault();
  e.stopPropagation();

  // Remove existing popup if any
  const existing = document.getElementById('price-alert-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'price-alert-popup';

  const overlay = document.createElement('div');
  overlay.id = 'price-alert-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;backdrop-filter:blur(4px);';
  overlay.addEventListener('click', closePriceAlert);

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:var(--card,#141c2e);border:1px solid rgba(0,212,170,0.3);border-radius:16px;padding:28px 28px 24px;max-width:360px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);';

  const shortTitle = productTitle.length > 50 ? productTitle.slice(0,50) + '...' : productTitle;

  box.innerHTML = `
    <div style="font-size:36px;margin-bottom:12px;">🔔</div>
    <div style="font-size:17px;font-weight:700;color:var(--text,#e2e8f0);margin-bottom:8px;line-height:1.3;">${t('popupTitle')}</div>
    <div style="font-size:13px;color:var(--muted,#94a3b8);line-height:1.6;margin-bottom:20px;">${t('popupDesc')} <strong style="color:var(--text,#e2e8f0);">${shortTitle}</strong> ${t('popupDesc2')}</div>
  `;

  const tgLink = document.createElement('a');
  tgLink.href = 'https://t.me/ofertas_domoticas';
  tgLink.target = '_blank';
  tgLink.rel = 'noopener';
  tgLink.textContent = t('popupBtn');
  tgLink.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border-radius:10px;background:#0088cc;color:#fff;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:10px;box-sizing:border-box;';
  tgLink.addEventListener('click', closePriceAlert);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = t('popupClose');
  closeBtn.style.cssText = 'width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--muted,#94a3b8);font-size:13px;cursor:pointer;font-family:var(--font,sans-serif);';
  closeBtn.addEventListener('click', closePriceAlert);

  box.appendChild(tgLink);
  box.appendChild(closeBtn);
  popup.appendChild(overlay);
  popup.appendChild(box);
  document.body.appendChild(popup);
}

function closePriceAlert() {
  const popup = document.getElementById('price-alert-popup');
  if (popup) popup.remove();
}

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePriceAlert();
});

// ── DELEGACIÓN DE EVENTOS PARA CARDS ─────────────────────────────────────────
// Usando delegación para evitar problemas con CSP y onclick inline
document.addEventListener('click', function(e) {

  // Botón copiar enlace
  const copyBtn = e.target.closest('.copy-link-btn');
  if (copyBtn) {
    e.preventDefault();
    e.stopPropagation();
    copyLink(copyBtn, copyBtn.getAttribute('data-url'));
    return;
  }
  // Botón WhatsApp compartir
  const waBtn = e.target.closest('.wa-share-btn');
  if (waBtn) {
    e.preventDefault();
    e.stopPropagation();
    window.open('https://api.whatsapp.com/send?text=' + waBtn.getAttribute('data-wa'), '_blank', 'noopener');
    return;
  }
  // Botón "Avísame si baja"
  const alertBtn = e.target.closest('.price-alert-btn');
  if (alertBtn) {
    e.preventDefault();
    e.stopPropagation();
    showPriceAlert(e, alertBtn.getAttribute('data-title') || '');
    return;
  }

});

// ── RENDERIZAR OFERTAS ────────────────────────────────────────────────────────
function renderDeals(items) {
  const grid = document.getElementById('deals-grid');
  const count = document.getElementById('deals-count');
  if (!grid) return;

  // Excluir la súper oferta del día del grid
  const featured = items.filter(i => i.type==='promo' && i.featured && i.price)
    .sort((a,b) => parseDiscount(b.discount)-parseDiscount(a.discount));
  const superSlug = featured.length > 0 ? featured[0].slug : null;

  let promos = items.filter(i => i.type === 'promo' && i.slug !== superSlug);

  if (dealFilter !== 'all') {
    promos = promos.filter(i => platClass(i.platform) === dealFilter);
  }

  if (dealSort === 'discount') promos.sort((a,b) => parseDiscount(b.discount)-parseDiscount(a.discount));
  else if (dealSort === 'price-asc') promos.sort((a,b) => parsePrice(a.price)-parsePrice(b.price));
  else if (dealSort === 'price-desc') promos.sort((a,b) => parsePrice(b.price)-parsePrice(a.price));

  if (count) count.textContent = `(${promos.length} ofertas)`;

  if (promos.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🏷️</div><div class="empty-title">${t('noDeals')}</div></div>`;
    return;
  }

  grid.innerHTML = promos.map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url||'#');
    const fullUrl = item.slug ? `https://ofertasdomoticas.com/articulos/${item.slug}.html` : (item.url||'https://ofertasdomoticas.com');
    const pc = platClass(item.platform);
    const pi = platIcon(item.platform);
    const compat = (item.compatibility||[]).slice(0,3).map(c=>`<span class="dc-tag">${c}</span>`).join('');
    const safeTitle = item.title.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const waText = encodeURIComponent(`¡Mira esta oferta de domótica! 🤖\n\n${item.title}\n💸 Precio: ${item.price}\n\n👉 Ver aquí: ${fullUrl}`);
    return `<a class="deal-card" style="animation-delay:${(i*0.04).toFixed(2)}s;" href="${href}" target="_blank" rel="sponsored noopener">
      <div class="dc-head">
        <span class="dc-plat ${pc}">${pi} ${item.platform||''}</span>
        ${item.discount?`<span class="dc-disc">${item.discount}</span>`:''}
      </div>
      ${item.protocol?`<span class="dc-proto">⬡ ${item.protocol}</span>`:''}
      <div class="dc-title">${item.title}</div>
      ${compat?`<div class="dc-compat">${compat}</div>`:''}
      <div class="dc-footer">
        <div><div class="dc-price">${item.price}</div>${item.originalPrice?`<div class="dc-old">${item.originalPrice}</div>`:''}</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="wa-share-btn" data-wa="${waText}" style="color:#25d366;cursor:pointer;display:flex;align-items:center;flex-shrink:0;" title="Compartir en WhatsApp">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </span>
          <button class="price-alert-btn" data-title="${safeTitle}" style="font-size:20px;color:var(--muted);background:transparent;border:none;cursor:pointer;padding:2px;font-family:var(--font);" title="Avísame si baja de precio">🔔</button>
          <span class="dc-btn" style="pointer-events:none;">${t('viewDeal')}</span>
        </div>
      </div>
    </a>`;
  }).join('');
}

// ── RENDERIZAR NOTICIAS ───────────────────────────────────────────────────────
function renderNews(items) {
  const grid = document.getElementById('news-grid');
  const count = document.getElementById('news-count');
  if (!grid) return;

  const news = items.filter(i => i.type === 'news');
  if (count) count.textContent = `(${news.length} noticias)`;

  if (news.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-title">${t('noNews')}</div></div>`;
    return;
  }

  grid.innerHTML = news.map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url||'#');
    const target = item.slug ? '_self' : '_blank';
    const tags = (item.tags||[]).slice(0,2).map(t=>`<span class="nc-platform">${t}</span>`).join('');
    return `<a class="news-card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="${target}" rel="noopener" aria-label="${item.title}">
      <div class="nc-head">
        <div class="nc-tags"><span class="nc-tag">📡 Noticia</span>${tags}</div>
        <span class="nc-date">${item.date||''}</span>
      </div>
      <div class="nc-title">${item.title}</div>
      <div class="nc-body">${item.body}</div>
      <div class="nc-footer">
        <span class="nc-source">${item.source||''}</span>
        <span class="nc-more">${t('readMore')}</span>
      </div>
    </a>`;
  }).join('');
}

// ── RENDERIZAR ARCHIVO ────────────────────────────────────────────────────────
function renderArchive(items) {
  const grid = document.getElementById('archive-grid');
  const count = document.getElementById('archive-count');
  if (!grid) return;

  const filtered = archiveFilter === 'all' ? items : items.filter(i => i.type === archiveFilter);
  if (count) count.textContent = `(${filtered.length} items)`;

  if (!filtered || filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">${t('noArchive')}</div></div>`;
    return;
  }

  const labels = { review:'⭐ Review', comparativa:'⚖️ Comparativa', news:'📡 Noticia', promo:'🏷️ Oferta' };
  grid.innerHTML = filtered.slice(0,30).map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : '#';
    const label = labels[item.type] || item.type;
    return `<a class="arc-card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="_self" rel="noopener">
      <div><span class="arc-badge ${item.type}">${label}</span></div>
      <div class="arc-title">${item.title}</div>
      <div class="arc-body">${(item.body||'').slice(0,160)}...</div>
      ${item.rating?`<div class="arc-rating">⭐ ${item.rating}/10</div>`:''}
      ${item.winner?`<div class="arc-winner">🏆 ${item.winner}</div>`:''}
      <div class="arc-more">${t('readMore')} →</div>
    </a>`;
  }).join('');
}


// ── RESUMEN DE LA SEMANA ──────────────────────────────────────────────────────
function renderWeeklySummary(items) {
  const news = items.filter(i => i.type === 'news');
  if (news.length === 0) return;

  const section = document.getElementById('resumen');
  const grid = document.getElementById('resumen-grid');
  const fecha = document.getElementById('resumen-fecha');
  if (!section || !grid) return;

  section.style.display = 'block';
  if (fecha) {
    const d = new Date();
    fecha.textContent = `Semana del ${d.toLocaleDateString('es-ES', {day:'numeric',month:'long'})}`;
  }

  grid.innerHTML = news.slice(0,6).map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url||'#');
    const target = item.slug ? '_self' : '_blank';
    const tags = (item.tags||[]).slice(0,2).map(t =>
      `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px;background:rgba(59,130,246,0.12);color:var(--accent2);">${t}</span>`
    ).join('');
    return `<a href="${href}" target="${target}" rel="noopener" style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-decoration:none;color:var(--text);display:flex;flex-direction:column;gap:7px;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(59,130,246,0.3)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;gap:5px;flex-wrap:wrap;">${tags}</div>
      <div style="font-size:13px;font-weight:600;line-height:1.4;">${item.title}</div>
      <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">${item.source||''}</div>
    </a>`;
  }).join('');
}

// ── ECOSYSTEM FILTER ──────────────────────────────────────────────────────────
function renderNewsFiltered(items) {
  const news = items.filter(i => i.type === 'news');
  const filtered = ecosystemFilter === 'all' ? news : news.filter(item => {
    const searchStr = [
      item.title, item.body,
      ...(item.tags||[])
    ].join(' ').toLowerCase();
    return searchStr.includes(ecosystemFilter.toLowerCase());
  });

  const grid = document.getElementById('news-grid');
  const count = document.getElementById('news-count');
  if (!grid) return;
  if (count) count.textContent = `(${filtered.length} noticias)`;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-title">Sin noticias sobre ' + ecosystemFilter + '</div></div>';
    return;
  }

  grid.innerHTML = filtered.map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url||'#');
    const target = item.slug ? '_self' : '_blank';
    const tags = (item.tags||[]).slice(0,2).map(t=>`<span class="nc-platform">${t}</span>`).join('');
    return `<a class="news-card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="${target}" rel="noopener" aria-label="${item.title}">
      <div class="nc-head">
        <div class="nc-tags"><span class="nc-tag">📡 Noticia</span>${tags}</div>
        <span class="nc-date">${item.date||''}</span>
      </div>
      <div class="nc-title">${item.title}</div>
      <div class="nc-body">${item.body}</div>
      <div class="nc-footer">
        <span class="nc-source">${item.source||''}</span>
        <span class="nc-more">${t('readMore')}</span>
      </div>
    </a>`;
  }).join('');
}

// ── FILTROS Y ORDENAMIENTO ────────────────────────────────────────────────────
function initControls() {
  // Deal filters
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      dealFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDeals(allItems);
    });
  });

  // Sort
  const sortSel = document.getElementById('sort-select');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      dealSort = sortSel.value;
      renderDeals(allItems);
    });
  }

  // Ecosystem filters for news
  document.querySelectorAll('[data-ecosystem]').forEach(btn => {
    btn.addEventListener('click', () => {
      ecosystemFilter = btn.getAttribute('data-ecosystem');
      document.querySelectorAll('[data-ecosystem]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNewsFiltered(allItems);
    });
  });

  // Archive filters
  document.querySelectorAll('[data-archive]').forEach(btn => {
    btn.addEventListener('click', () => {
      archiveFilter = btn.getAttribute('data-archive');
      document.querySelectorAll('[data-archive]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderArchive(archiveItems);
    });
  });
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats(items) {
  const sn = document.getElementById('stat-news');
  const sp = document.getElementById('stat-promos');
  if (sn) sn.textContent = items.filter(i=>i.type==='news').length;
  if (sp) sp.textContent = items.filter(i=>i.type==='promo').length;
}

// ── API FALLBACK ──────────────────────────────────────────────────────────────
function loadFromAPI() {
  return fetch('/api/content')
    .then(r => r.json())
    .then(data => {
      if (data && data.items && data.items.length > 0) {
        allItems = data.items;
        renderSuperDeal(allItems);
        renderDeals(allItems);
        renderNewsFiltered(allItems);
        renderWeeklySummary(allItems);
        updateStats(allItems);
      }
    })
    .catch(() => {});
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-J4MP94RSZL');
}


// ── BOTÓN VOLVER ARRIBA ───────────────────────────────────────────────────────
function initScrollTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 400);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initLang();
  initTheme();
  initControls();
  initAnalytics();
  initCookieBanner();
  initScrollTop();

  // Leer datos SSG
  const ssgEl = document.getElementById('ssg-data');
  if (ssgEl) {
    try {
      const data = JSON.parse(ssgEl.textContent || '[]');
      if (data && data.length > 0) {
        allItems = data;
        renderSuperDeal(allItems);
        renderDeals(allItems);
        renderNewsFiltered(allItems);
        renderWeeklySummary(allItems);
        updateStats(allItems);
      } else {
        loadFromAPI();
      }
    } catch(e) {
      // SSG parse error — silenced
      loadFromAPI();
    }
  } else {
    loadFromAPI();
  }

  // Cargar archivo histórico
  fetch('/api/archive')
    .then(r => r.json())
    .then(data => {
      if (data && data.items && data.items.length > 0) {
        archiveItems = data.items;
        const sa = document.getElementById('stat-archive');
        if (sa) sa.textContent = archiveItems.length;
        // Contador de artículos publicados (archive + items actuales)
        const totalArticles = archiveItems.filter(i => i.slug).length + allItems.filter(i => i.slug).length;
        const statArt = document.getElementById('stat-articles');
        if (statArt) statArt.textContent = totalArticles;
        renderArchive(archiveItems);
      }
    })
    .catch(() => {});
});
