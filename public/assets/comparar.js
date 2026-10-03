// Comparador: hasta 3 productos lado a lado; resalta las filas en las que difieren.
// Solo usa textContent / createElement: los datos nunca se interpretan como HTML.
(function () {
  const MAX = 3;
  const pickers = [...document.querySelectorAll('.picker')];
  const out = document.getElementById('cmp-out');
  let datos = null;

  const el = (tag, props = {}, ...hijos) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') n.className = v; else n.setAttribute(k, v);
    });
    hijos.forEach((h) => n.append(h));
    return n;
  };

  function seleccion() {
    return pickers.map((s) => s.value).filter(Boolean);
  }

  function render() {
    const slugs = seleccion();
    const url = slugs.length ? `?p=${slugs.join(',')}` : location.pathname;
    history.replaceState(null, '', url);
    out.replaceChildren();

    const prods = slugs.map((s) => datos.productos.find((p) => p.slug === s)).filter(Boolean);
    if (prods.length < 2) {
      out.append(el('p', { class: 'muted' }, 'Elige al menos dos productos para ver la comparación.'));
      return;
    }

    // Unión de filas en orden de aparición
    const etiquetas = [];
    prods.forEach((p) => p.filas.forEach((f) => { if (!etiquetas.includes(f.label)) etiquetas.push(f.label); }));
    etiquetas.push('Precio orientativo');

    const thead = el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Característica'),
      ...prods.map((p) => el('th', { scope: 'col' }, el('a', { href: `/productos/${p.slug}` }, p.nombre)))));

    const tbody = el('tbody');
    etiquetas.forEach((label) => {
      const celdas = prods.map((p) => {
        if (label === 'Precio orientativo') return { text: p.precio };
        return p.filas.find((f) => f.label === label) || { text: '—' };
      });
      const distintas = new Set(celdas.map((c) => c.text)).size > 1;
      const tr = el('tr', distintas ? { class: 'diff' } : {}, el('th', { scope: 'row' }, label));
      celdas.forEach((c) => tr.append(el('td', c.cls ? { class: c.cls } : {}, c.text)));
      tbody.append(tr);
    });

    const comprar = el('tr', {}, el('th', { scope: 'row' }, 'Dónde comprar'));
    prods.forEach((p) => {
      const td = el('td');
      p.tiendas.forEach((t) => {
        td.append(el('a', { href: t.url, target: '_blank', rel: 'sponsored nofollow noopener' }, `Ver en ${t.tienda}`), el('br'));
      });
      comprar.append(td);
    });
    tbody.append(comprar);

    out.append(
      el('div', { class: 'table-wrap' }, el('table', { class: 'cmp' }, thead, tbody)),
      el('p', { class: 'legend' }, el('span'), 'Filas resaltadas: los productos se diferencian en esa característica.'),
    );
  }

  function llenarSelects() {
    pickers.forEach((sel, i) => {
      sel.append(el('option', { value: '' }, i < 2 ? '— Elige un producto —' : '— (Opcional) —'));
      Object.entries(datos.categorias).forEach(([id, c]) => {
        const grupo = el('optgroup', { label: c.nombre });
        datos.productos.filter((p) => p.categoria === id)
          .forEach((p) => grupo.append(el('option', { value: p.slug }, p.nombre)));
        sel.append(grupo);
      });
      sel.addEventListener('change', render);
    });

    const pedidos = (new URLSearchParams(location.search).get('p') || '').split(',')
      .filter((s) => datos.productos.some((p) => p.slug === s)).slice(0, MAX);
    pedidos.forEach((s, i) => { pickers[i].value = s; });
    render();
  }

  fetch('/data/productos.json')
    .then((r) => r.json())
    .then((d) => { datos = d; llenarSelects(); })
    .catch(() => { out.textContent = 'No se pudieron cargar los productos. Recarga la página.'; });
})();
