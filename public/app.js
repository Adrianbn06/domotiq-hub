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


// ── POPUP ALERTA DE PRECIO ────────────────────────────────────────────────────
function showPriceAlert(e, productTitle) {
  e.preventDefault();
  e.stopPropagation();

  // Remove existing popup if any
  const existing = document.getElementById('price-alert-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'price-alert-popup';
  popup.innerHTML = `
    <div id="price-alert-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;backdrop-filter:blur(4px);" onclick="closePriceAlert()"></div>
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:var(--card,#141c2e);border:1px solid rgba(0,212,170,0.3);border-radius:16px;padding:28px 28px 24px;max-width:360px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:36px;margin-bottom:12px;">🔔</div>
      <div style="font-size:17px;font-weight:700;color:var(--text,#e2e8f0);margin-bottom:8px;line-height:1.3;">¿Precio muy alto ahora?</div>
      <div style="font-size:13px;color:var(--muted,#94a3b8);line-height:1.6;margin-bottom:20px;">Únete a nuestro canal de Telegram. Avisamos al instante cuando <strong style="color:var(--text,#e2e8f0);">${productTitle.slice(0,50)}${productTitle.length>50?'...':''}</strong> alcance su mínimo histórico.</div>
      <a href="https://t.me/ofertas_domoticas" target="_blank" rel="noopener"
        onclick="closePriceAlert()"
        style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border-radius:10px;background:#0088cc;color:#fff;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:10px;transition:background 0.2s;">
        ✈ Unirse al canal de Telegram
      </a>
      <button onclick="closePriceAlert()" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.07));background:transparent;color:var(--muted,#94a3b8);font-size:13px;cursor:pointer;font-family:var(--font,'Space Grotesk',sans-serif);">
        Ahora no
      </button>
    </div>
  `;
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
  // Botón "Avísame si baja"
  const alertBtn = e.target.closest('.price-alert-btn');
  if (alertBtn) {
    e.preventDefault();
    e.stopPropagation();
    showPriceAlert(e, alertBtn.getAttribute('data-title') || '');
    return;
  }
  // Clic en card → abrir oferta
  const card = e.target.closest('.deal-card[data-href]');
  if (card && !e.target.closest('button')) {
    e.preventDefault();
    window.open(card.getAttribute('data-href'), '_blank', 'noopener');
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
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏷️</div><div class="empty-title">Sin ofertas en esta categoría</div></div>';
    return;
  }

  grid.innerHTML = promos.map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url||'#');
    const pc = platClass(item.platform);
    const pi = platIcon(item.platform);
    const compat = (item.compatibility||[]).slice(0,3).map(c=>`<span class="dc-tag">${c}</span>`).join('');
    const safeTitle = item.title.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<div class="deal-card" style="animation-delay:${(i*0.04).toFixed(2)}s;" data-href="${href}">
      <div class="dc-head">
        <span class="dc-plat ${pc}">${pi} ${item.platform||''}</span>
        ${item.discount?`<span class="dc-disc">${item.discount}</span>`:''}
      </div>
      ${item.protocol?`<span class="dc-proto">⬡ ${item.protocol}</span>`:''}
      <div class="dc-title">${item.title}</div>
      ${compat?`<div class="dc-compat">${compat}</div>`:''}
      <div class="dc-footer">
        <div><div class="dc-price">${item.price}</div>${item.originalPrice?`<div class="dc-old">${item.originalPrice}</div>`:''}</div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;">
          <span class="dc-btn">Ver oferta</span>
          <button class="price-alert-btn" data-title="${safeTitle}" style="font-size:11px;color:var(--muted);background:transparent;border:none;cursor:pointer;padding:2px 4px;font-family:var(--font);transition:color 0.2s;">🔔 Avísame si baja</button>
        </div>
      </div>
    </div>`;
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
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-title">Sin noticias hoy</div></div>';
    return;
  }

  grid.innerHTML = news.map((item, i) => {
    const href = item.slug ? `/articulos/${item.slug}.html` : (item.url||'#');
    const target = item.slug ? '_self' : '_blank';
    const tags = (item.tags||[]).slice(0,2).map(t=>`<span class="nc-platform">${t}</span>`).join('');
    return `<a class="news-card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="${target}" rel="noopener">
      <div class="nc-head">
        <div class="nc-tags"><span class="nc-tag">📡 Noticia</span>${tags}</div>
        <span class="nc-date">${item.date||''}</span>
      </div>
      <div class="nc-title">${item.title}</div>
      <div class="nc-body">${item.body}</div>
      <div class="nc-footer">
        <span class="nc-source">${item.source||''}</span>
        <span class="nc-more">Leer más</span>
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
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">Archivo vacío — se llena cada semana</div></div>';
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
      <div class="arc-more">Ver más →</div>
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
    return `<a class="news-card" style="animation-delay:${(i*0.04).toFixed(2)}s" href="${href}" target="${target}" rel="noopener">
      <div class="nc-head">
        <div class="nc-tags"><span class="nc-tag">📡 Noticia</span>${tags}</div>
        <span class="nc-date">${item.date||''}</span>
      </div>
      <div class="nc-title">${item.title}</div>
      <div class="nc-body">${item.body}</div>
      <div class="nc-footer">
        <span class="nc-source">${item.source||''}</span>
        <span class="nc-more">Leer más</span>
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
    .catch(e => console.error('Error API:', e));
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-J4MP94RSZL');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initControls();
  initAnalytics();

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
      console.error('SSG parse error:', e);
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
    .catch(e => console.error('Error archivo:', e));
});
