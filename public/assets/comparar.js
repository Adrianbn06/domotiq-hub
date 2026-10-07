// Comparador: hasta 3 productos lado a lado, agrupados por secciones, con "Solo lo que cambia"
// y el veredicto para tu país (public/assets/pais.js). Los dibujos salen de los <template> de la página.
// Solo usa textContent / createElement: los datos nunca se interpretan como HTML.
(function () {
  const MAX = 3;
  const raiz = document.getElementById('cmp');
  if (!raiz) return;
  const NS = 'http://www.w3.org/2000/svg';
  const ICONO_ESTADO = { yes: 'check', no: 'x', info: 'info', partial: 'alerta', unknown: 'ayuda' };
  const ICONO_TONO = { si: 'check', no: 'x', depende: 'alerta', info: 'info' };
  let datos = null;
  let sel = [];
  let soloCambia = false;
  let hoja = null;
  let destino = null;
  let observador = null;

  // ── Utilidades ──────────────────────────────────────────────────────────
  const el = (tag, props = {}, ...hijos) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    hijos.flat().forEach((h) => { if (h != null) n.append(h); });
    return n;
  };
  const icono = (nombre) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'i');
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', `#i-${nombre}`);
    s.append(u);
    return s;
  };
  const dibujo = (cat) => {
    const n = el('span', { class: `stage k-${cat}` });
    const t = document.getElementById(`ill-${cat}`);
    if (t) n.append(t.content.cloneNode(true));
    return n;
  };
  const corto = (nombre) => nombre.replace(/\s*\(.*?\)/g, '');
  const porSlug = (s) => datos.productos.find((p) => p.slug === s);
  const paisElegido = () => (window.odPais ? window.odPais() : null);
  const veredicto = (p, c) => (window.odVeredicto ? window.odVeredicto(p, c) : null);

  // ── Filas ───────────────────────────────────────────────────────────────
  // Une las filas de varios productos por etiqueta, en el orden en que aparecen
  function unir(prods, campo) {
    const etiquetas = [];
    prods.forEach((p) => p[campo].forEach((f) => { if (!etiquetas.includes(f.label)) etiquetas.push(f.label); }));
    return etiquetas.map((label) => ({ label, valores: prods.map((p) => p[campo].find((f) => f.label === label) || null) }));
  }
  function celda(v) {
    if (!v) return el('div', { class: 'v vacio', text: '—' });
    if (v.sub) return el('div', { class: 'v' }, el('span', { class: 'precio', text: v.text }), el('small', { text: v.sub }));
    if (v.cls) return el('div', { class: 'v' }, el('span', { class: `estado ${v.cls}` }, icono(ICONO_ESTADO[v.cls] || 'info'), v.text));
    // Letra de datos solo para cifras cortas (120 V, 1800 W); el texto largo, en letra normal
    return el('div', { class: `v${/\d/.test(v.text) && v.text.length <= 16 ? ' n' : ''}`, text: v.text });
  }
  const fila = (label, celdas, cambia) => el('div', { class: `cmp-fila cols${cambia ? ' cambia' : ''}` }, el('div', { class: 'lab', text: label }), celdas);
  function seccion(titulo, filas) {
    let cambian = 0;
    const nodos = filas.map((f) => {
      const c = new Set(f.valores.map((v) => (v ? v.text : '—'))).size > 1;
      if (c) cambian++;
      return { c, nodo: fila(f.label, f.valores.map(celda), c) };
    });
    const visibles = nodos.filter((x) => !soloCambia || x.c).map((x) => x.nodo);
    return {
      nodo: visibles.length ? el('section', { class: 'cmp-seccion' }, el('h2', { text: titulo }), el('div', { class: 'cmp-grupo' }, visibles)) : null,
      cambian, total: filas.length,
    };
  }

  // ── Productos elegidos ──────────────────────────────────────────────────
  function tarjeta(p, i, n, pais) {
    const v = pais ? veredicto(p, pais) : null;
    return el('article', { class: 'slot' },
      dibujo(p.categoria),
      el('a', { class: 'slot-nombre', href: `/productos/${p.slug}`, text: corto(p.nombre) }),
      el('div', { class: 'slot-meta' }, el('b', { text: p.precio.corto }), datos.categorias[p.categoria].singular),
      v ? el('div', { class: `ver t-${v.tono}` }, icono(ICONO_TONO[v.tono]), v.corto) : null,
      el('div', { class: 'slot-acciones' }, el('button', { type: 'button', class: 'mini', 'data-cambiar': String(i) }, icono('cambiar'), 'Cambiar')),
      n > 2 ? el('button', { type: 'button', class: 'quitar', 'data-quitar': String(i), 'aria-label': `Quitar ${corto(p.nombre)}` }, icono('x')) : null);
  }

  // ── Pintar todo ─────────────────────────────────────────────────────────
  const fija = el('div', { class: 'cmp-fija', 'aria-hidden': 'true' });
  document.body.append(fija);

  function pintar() {
    const prods = sel.map(porSlug).filter(Boolean);
    const pais = paisElegido();
    const n = String(Math.max(prods.length, 1));
    raiz.style.setProperty('--n', n);
    fija.style.setProperty('--n', n);
    history.replaceState(null, '', prods.length ? `?p=${sel.join(',')}` : location.pathname);
    document.querySelectorAll('.preset[data-preset]').forEach((b) => {
      const s = b.getAttribute('data-preset').split(',');
      b.setAttribute('aria-pressed', String(s.length === sel.length && s.every((x) => sel.includes(x))));
    });

    const partes = [];
    const tarjetas = el('div', { class: 'cmp-slots cols' }, el('div', { class: 'hueco' }), prods.map((p, i) => tarjeta(p, i, prods.length, pais)));
    partes.push(tarjetas);

    const cuenta = el('small');
    partes.push(el('div', { class: 'cmp-barra' },
      el('label', { for: 'cmp-dif' },
        el('button', { type: 'button', class: 'tg', role: 'switch', id: 'cmp-dif', 'aria-checked': String(soloCambia) }),
        el('span', {}, 'Solo lo que cambia', cuenta)),
      el('button', { type: 'button', class: 'btn sm secondary', 'data-anadir': true, disabled: prods.length >= MAX }, icono('mas'), 'Añadir producto')));

    if (prods.length < 2) {
      partes.push(el('div', { class: 'callout info' }, icono('info'), el('p', { text: 'Añade otro producto para compararlos lado a lado.' })));
      raiz.replaceChildren(...partes);
      fija.replaceChildren();
      return;
    }

    const escrita = datos.comparativas.find((c) => sel.every((s) => c.productos.includes(s)));
    if (escrita) {
      partes.push(el('div', { class: 'cmp-aviso' }, icono('balanza'),
        el('span', {}, 'Hay una comparativa escrita: ', el('b', { text: escrita.titulo })),
        el('a', { href: `/comparativas/${escrita.slug}`, text: 'Leerla' })));
    }

    if (pais && window.odVeredicto) {
      partes.push(el('section', { class: 'cmp-seccion' }, el('h2', { text: `En ${pais.nombre} (${pais.v} V)` }),
        el('div', { class: 'cmp-grupo' }, fila('¿Te sirve?', prods.map((p) => {
          const v = veredicto(p, pais);
          return el('div', { class: 'v' }, el('div', { class: `ver-cmp t-${v.tono}` }, el('strong', {}, icono(ICONO_TONO[v.tono]), v.corto), el('span', { text: v.breve })));
        }), false))));
    } else if (window.odPais) {
      partes.push(el('div', { class: 'cmp-aviso' }, icono('ubicacion'),
        el('span', { text: 'Elige tu país y te decimos cuál funciona con tu red eléctrica.' }),
        el('button', { type: 'button', class: 'enlace', 'data-abrir-pais': true, text: 'Elegir país' })));
    }

    const precio = { label: 'Precio orientativo', valores: prods.map((p) => ({ text: p.precio.corto, sub: p.precio.texto })) };
    const s1 = seccion('Lo esencial', [precio, ...unir(prods, 'esencial')]);
    const s2 = seccion('Características', unir(prods, 'tecnicas'));
    const s3 = seccion('Compatibilidad', unir(prods, 'compat'));
    [s1, s2, s3].forEach((s) => { if (s.nodo) partes.push(s.nodo); });
    cuenta.textContent = ` · cambian ${s1.cambian + s2.cambian + s3.cambian} de ${s1.total + s2.total + s3.total} datos`;

    const lista = (items, clase, nombreIcono) => el('ul', { class: clase }, items.map((x) => el('li', {}, icono(nombreIcono), el('span', { text: x }))));
    partes.push(el('section', { class: 'cmp-seccion' }, el('h2', { text: 'A favor y en contra' }), el('div', { class: 'cmp-grupo' },
      fila('A favor', prods.map((p) => el('div', { class: 'v' }, lista(p.pros, 'pros', 'check'))), false),
      fila('En contra', prods.map((p) => el('div', { class: 'v' }, lista(p.contras, 'contras', 'x'))), false),
      fila('Ideal para', prods.map((p) => el('div', { class: 'v', text: p.idealPara })), false))));

    partes.push(el('section', { class: 'cmp-seccion' }, el('h2', { text: 'Dónde comprar' }), el('div', { class: 'cmp-grupo' },
      fila('Ver precio', prods.map((p) => el('div', { class: 'v compra' }, p.tiendas.map((t, i) =>
        el('a', { class: `btn sm${i ? ' secondary' : ''}`, href: t.url, target: '_blank', rel: 'sponsored nofollow noopener' }, t.tienda, icono('externo'))))), false))));

    raiz.replaceChildren(...partes);

    // Barra fija con los productos: aparece cuando las tarjetas de arriba salen de la pantalla
    fija.replaceChildren(el('div', { class: 'w' }, el('div', { class: 'cols' }, el('div', { class: 'hueco' }),
      prods.map((p) => el('div', { class: 'fija-p' }, dibujo(p.categoria), el('b', { text: corto(p.nombre) }))))));
    if (observador) observador.disconnect();
    if ('IntersectionObserver' in window) {
      observador = new IntersectionObserver((e) => { fija.classList.toggle('visible', !e[0].isIntersecting && e[0].boundingClientRect.top < 0); });
      observador.observe(tarjetas);
    }
  }

  // ── Hoja para elegir producto ───────────────────────────────────────────
  function abrirHoja(i) {
    destino = i;
    const titulo = i == null ? 'Añadir producto' : 'Cambiar producto';
    const busca = el('input', { type: 'search', placeholder: 'Busca por nombre o marca', autocomplete: 'off', 'aria-label': 'Buscar producto' });
    const lista = el('div', { class: 'hoja-lista' });
    hoja = el('div', { class: 'velo', 'data-velo': true },
      el('div', { class: 'hoja', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
        el('div', { class: 'hoja-cab' }, el('h3', { text: titulo }), el('button', { type: 'button', class: 'mini solo', 'data-cerrar-hoja': true, 'aria-label': 'Cerrar' }, icono('x'))),
        el('label', { class: 'buscar' }, icono('buscar'), busca),
        lista));
    const llenar = () => {
      const q = busca.value.trim().toLowerCase();
      const bloques = Object.entries(datos.categorias).map(([id, c]) => {
        const items = datos.productos.filter((p) => p.categoria === id && (!q || p.nombre.toLowerCase().includes(q)));
        if (!items.length) return null;
        return [el('h4', { text: c.nombre }), items.map((p) => {
          const ya = sel.includes(p.slug);
          return el('button', { type: 'button', class: 'opcion', 'data-elegir': p.slug, disabled: ya },
            dibujo(p.categoria), el('span', { text: ya ? `${p.nombre} · ya está` : p.nombre }), el('small', { text: p.precio.corto }));
        })];
      }).filter(Boolean);
      lista.replaceChildren(...(bloques.length ? bloques.flat(2) : [el('p', { class: 'muted', text: 'No hay productos con ese nombre.' })]));
    };
    busca.addEventListener('input', llenar);
    llenar();
    document.body.append(hoja);
    busca.focus();
  }
  function cerrarHoja() {
    if (!hoja) return;
    hoja.remove();
    hoja = null;
  }

  // ── Eventos ─────────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (!datos) return;
    const t = e.target;
    let b;
    if ((b = t.closest('.preset[data-preset]'))) { e.preventDefault(); sel = b.getAttribute('data-preset').split(','); pintar(); return; }
    if ((b = t.closest('[data-cambiar]'))) { abrirHoja(Number(b.getAttribute('data-cambiar'))); return; }
    if ((b = t.closest('[data-quitar]'))) { sel.splice(Number(b.getAttribute('data-quitar')), 1); pintar(); return; }
    if (t.closest('[data-anadir]')) { if (sel.length < MAX) abrirHoja(null); return; }
    if ((b = t.closest('[data-elegir]'))) {
      const s = b.getAttribute('data-elegir');
      if (destino == null) sel.push(s); else sel[destino] = s;
      cerrarHoja();
      pintar();
      return;
    }
    if (t.closest('[data-cerrar-hoja]') || t.hasAttribute('data-velo')) { cerrarHoja(); return; }
    if (t.closest('#cmp-dif')) { soloCambia = !soloCambia; pintar(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarHoja(); });
  document.addEventListener('od:pais', () => { if (datos) pintar(); });

  // La barra fija va debajo de la cabecera cuando la cabecera también queda fija (en PC)
  function colocarFija() {
    const cab = document.querySelector('.top');
    fija.style.top = cab && getComputedStyle(cab).position === 'sticky' ? `${cab.offsetHeight}px` : '0px';
  }
  window.addEventListener('resize', colocarFija);
  colocarFija();

  fetch('/data/productos.json')
    .then((r) => r.json())
    .then((d) => {
      datos = d;
      sel = (new URLSearchParams(location.search).get('p') || '').split(',')
        .filter((s, i, a) => s && a.indexOf(s) === i && porSlug(s)).slice(0, MAX);
      if (!sel.length) {
        const primero = document.querySelector('.preset[data-preset]');
        if (primero) sel = primero.getAttribute('data-preset').split(',');
      }
      pintar();
    })
    .catch(() => { raiz.textContent = 'No se pudieron cargar los productos. Recarga la página.'; });
})();
