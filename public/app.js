// OfertasDomoticas.com — app.js
// Lógica principal del sitio: renderizado de tarjetas, filtros, archivo

let allItems = [];
let archiveItems = [];
let archiveFilter = 'all';
let currentDealFilter = 'all';

const icon = p => p === 'Amazon' ? '🛒' : p === 'eBay' ? '🏪' : p === 'Alibaba' ? '📦' : '🌐';

// ── RENDERIZAR NOTICIAS ────────────────────────────────────────────────────────
function renderItems(items) {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const news = items.filter(i => i.type === 'news');
  const badge = document.getElementById('news-count-badge');
  if (badge) badge.textContent = '(' + news.length + ' noticias)';
  if (news.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-title">Sin noticias hoy</div></div>';
    return;
  }
  grid.innerHTML = news.map((item, i) => {
    const tags = (item.tags||[]).slice(0,2).map(t => `<span class="tag platform">${t}</span>`).join('');
    const href = item.slug ? '/articulos/'+item.slug+'.html' : (item.url||'#');
    const target = item.slug ? '_self' : '_blank';
    return `<a class="card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="${target}" rel="noopener">
      <div class="card-header">
        <div class="card-tags"><span class="tag news">📡 Noticia</span>${tags}</div>
        <span class="card-date">${item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${item.body}</div>
      <div class="card-footer">
        ${item.source ? `<span class="card-source">${item.source}</span>` : '<span></span>'}
        <span class="read-more">Leer más</span>
      </div>
    </a>`;
  }).join('');
}

// ── RENDERIZAR OFERTAS ────────────────────────────────────────────────────────
function renderDeals(items, filter) {
  filter = filter || currentDealFilter;
  const grid = document.getElementById('deals-grid');
  if (!grid) return;
  let promos = items.filter(i => i.type === 'promo');
  if (filter !== 'all') {
    promos = promos.filter(i => i.platform && i.platform.trim().toLowerCase() === filter.trim().toLowerCase());
  }
  promos.sort((a,b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const da = parseInt((a.discount||'0').replace(/[^0-9]/g,''));
    const db = parseInt((b.discount||'0').replace(/[^0-9]/g,''));
    return db - da;
  });
  const badge = document.getElementById('deals-count-badge');
  if (badge) badge.textContent = '(' + promos.length + ' ofertas)';
  if (promos.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏷️</div><div class="empty-title">Sin ofertas en esta categoría</div></div>';
    return;
  }
  grid.innerHTML = promos.map((item, i) => {
    const href = item.slug ? '/articulos/'+item.slug+'.html' : (item.url||'#');
    return `<a class="card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="_blank" rel="sponsored noopener">
      <div class="card-header">
        <div class="card-tags">
          <span class="tag promo">🏷️ Oferta</span>
          ${item.featured ? '<span class="tag featured">🔥 Top</span>' : ''}
          <span class="tag platform">${icon(item.platform)} ${item.platform}</span>
        </div>
        <span class="card-date">${item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${item.body}</div>
      <div class="card-footer">
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="price-badge">${item.price}</span>
          ${item.discount ? `<span class="discount-badge">${item.discount}</span>` : ''}
        </div>
        <span class="read-more">Ver oferta</span>
      </div>
    </a>`;
  }).join('');
}

// ── FILTROS DE OFERTAS ────────────────────────────────────────────────────────
function setDealsFilter(platform) {
  currentDealFilter = platform;
  // Actualizar botones
  document.querySelectorAll('[id^="df-"]').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById('df-' + platform);
  if (btn) btn.classList.add('active');
  // Si allItems está vacío intentar cargar primero
  if (allItems.length === 0) {
    loadFromAPI().then(() => renderDeals(allItems, platform));
  } else {
    renderDeals(allItems, platform);
  }
}

// ── RENDERIZAR ARCHIVO ────────────────────────────────────────────────────────
function renderArchive(items) {
  const grid = document.getElementById('archive-grid');
  if (!grid) return;
  const filtered = archiveFilter === 'all' ? items : items.filter(i => i.type === archiveFilter);
  const badge = document.getElementById('archive-count-badge');
  if (badge) badge.textContent = '(' + filtered.length + ' items)';
  if (!filtered || filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">Archivo vacío — se llena cada semana</div></div>';
    return;
  }
  grid.innerHTML = filtered.slice(0, 30).map((item, i) => {
    const href = item.slug ? '/articulos/'+item.slug+'.html' : '#';
    const typeLabel = item.type==='review' ? '⭐ Review' : item.type==='comparativa' ? '⚖️ Comparativa' : item.type==='news' ? '📡 Noticia' : '🏷️ Oferta';
    return `<a class="card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="_self" rel="noopener">
      <div class="card-header">
        <div class="card-tags"><span class="tag ${item.type}">${typeLabel}</span></div>
        <span class="card-date">${item.archivedAt||item.date||''}</span>
      </div>
      <div class="card-title">${item.title}</div>
      <div class="card-body">${(item.body||'').slice(0,180)}...</div>
      ${item.rating ? `<div class="rating">⭐ ${item.rating}/10</div>` : ''}
      ${item.winner ? `<div class="verdict">🏆 ${item.winner}</div>` : ''}
      <div class="card-footer"><span></span><span class="read-more">Ver más</span></div>
    </a>`;
  }).join('');
}

// ── FILTROS DE ARCHIVO ────────────────────────────────────────────────────────
function setArchiveFilter(f) {
  archiveFilter = f;
  document.querySelectorAll('[id^="af-"]').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById('af-' + f);
  if (btn) btn.classList.add('active');
  renderArchive(archiveItems);
}

// ── INICIALIZACIÓN ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // 1. Leer datos SSG inyectados por cron.js
  const ssgEl = document.getElementById('ssg-data');
  if (ssgEl) {
    try {
      const data = JSON.parse(ssgEl.textContent || '[]');
      if (data && data.length > 0) {
        allItems = data;
        renderItems(allItems);
        renderDeals(allItems, 'all');
        // Stats
        const newsCount = allItems.filter(i=>i.type==='news').length;
        const promoCount = allItems.filter(i=>i.type==='promo').length;
        const sn = document.getElementById('stat-news');
        const sp = document.getElementById('stat-promos');
        if (sn) sn.textContent = newsCount;
        if (sp) sp.textContent = promoCount;
      } else {
        // SSG vacío — cargar desde API
        loadFromAPI();
      }
    } catch(e) {
      console.error('Error leyendo ssg-data:', e);
      loadFromAPI();
    }
  } else {
    loadFromAPI();
  }

  // 2. Cargar archivo histórico desde API
  fetch('/api/archive')
    .then(r => r.json())
    .then(data => {
      if (data && data.items && data.items.length > 0) {
        archiveItems = data.items;
        const sa = document.getElementById('stat-archive');
        if (sa) sa.textContent = archiveItems.length;
        renderArchive(archiveItems);
      }
    })
    .catch(e => console.error('Error archivo:', e));
});

function loadFromAPI() {
  return fetch('/api/content')
    .then(r => r.json())
    .then(data => {
      if (data && data.items && data.items.length > 0) {
        allItems = data.items;
        renderItems(allItems);
        renderDeals(allItems, 'all');
        const sn = document.getElementById('stat-news');
        const sp = document.getElementById('stat-promos');
        if (sn) sn.textContent = allItems.filter(i=>i.type==='news').length;
        if (sp) sp.textContent = allItems.filter(i=>i.type==='promo').length;
      }
    })
    .catch(e => console.error('Error API:', e));
}
