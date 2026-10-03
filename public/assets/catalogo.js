// Catálogo: filtros por categoría, voltaje, protocolo y hub + selección para comparar (máx. 3)
(function () {
  const MAX = 3;
  const filtros = { cat: 'todos', volt: 'todos', proto: 'todos', sinhub: 'todos' };
  const cards = [...document.querySelectorAll('.card')];
  const blocks = [...document.querySelectorAll('.cat-block')];
  const count = document.getElementById('result-count');

  function cumple(card) {
    const d = card.dataset;
    return (filtros.cat === 'todos' || d.cat === filtros.cat)
      && (filtros.volt === 'todos' || d.volt.split(' ').includes(filtros.volt))
      && (filtros.proto === 'todos' || d.proto.split(' ').includes(filtros.proto))
      && (filtros.sinhub === 'todos' || d.sinhub === filtros.sinhub);
  }

  function aplicar() {
    let visibles = 0;
    cards.forEach((c) => { c.hidden = !cumple(c); if (!c.hidden) visibles++; });
    blocks.forEach((b) => { b.hidden = !b.querySelector('.card:not([hidden])'); });
    count.textContent = visibles === 1 ? 'Mostrando 1 producto' : `Mostrando ${visibles} productos`;
  }

  function elegir(chip) {
    const grupo = chip.dataset.group;
    filtros[grupo] = chip.dataset.value;
    document.querySelectorAll(`.chip[data-group="${grupo}"]`).forEach((c) => {
      c.setAttribute('aria-pressed', String(c === chip));
    });
  }

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => { elegir(chip); aplicar(); });
  });

  // Filtros iniciales desde la URL (los enlaces de la portada usan ?volt=220, ?cat=sensor, etc.)
  new URLSearchParams(location.search).forEach((valor, grupo) => {
    const chip = [...document.querySelectorAll('.chip')]
      .find((c) => c.dataset.group === grupo && c.dataset.value === valor);
    if (chip) elegir(chip);
  });

  // Tu país (public/assets/pais.js): si la URL no trae un voltaje, se filtra por el de tu red
  function voltajeDelPais(pais) {
    const valor = pais && (pais.grupo === '110' || pais.grupo === '220') ? pais.grupo : 'todos';
    const chip = document.querySelector(`.chip[data-group="volt"][data-value="${valor}"]`);
    if (chip) elegir(chip);
  }
  if (!new URLSearchParams(location.search).has('volt') && window.odPais && window.odPais()) voltajeDelPais(window.odPais());
  document.addEventListener('od:pais', (e) => { voltajeDelPais(e.detail); aplicar(); });
  aplicar();

  // ── Comparar ──
  const bar = document.getElementById('compare-bar');
  const barText = document.getElementById('compare-text');
  const go = document.getElementById('compare-go');
  const checks = [...document.querySelectorAll('.cmp-check')];

  function actualizarBarra() {
    const sel = checks.filter((c) => c.checked).map((c) => c.value);
    bar.hidden = sel.length === 0;
    barText.textContent = sel.length === 1
      ? '1 seleccionado: elige al menos otro'
      : `${sel.length} seleccionados (máximo ${MAX})`;
    go.href = `/comparar?p=${sel.map(encodeURIComponent).join(',')}`;
    go.setAttribute('aria-disabled', String(sel.length < 2));
    checks.forEach((c) => { c.disabled = !c.checked && sel.length >= MAX; });
  }

  checks.forEach((c) => c.addEventListener('change', actualizarBarra));
  document.getElementById('compare-clear').addEventListener('click', () => {
    checks.forEach((c) => { c.checked = false; });
    actualizarBarra();
  });
  actualizarBarra();
})();
