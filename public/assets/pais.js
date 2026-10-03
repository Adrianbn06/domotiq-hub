// "Tu país": eliges tu país una vez y la web lo recuerda (solo en tu navegador, sin cookies ni envíos).
// Con él se muestran: el título de la portada, tu red resaltada, el veredicto "funciona / no funciona"
// en tarjetas y fichas, y el foco de la portada en su versión de 120 V o de 220 V.
// La lista de países la pone la plantilla en #od-paises (scripts/catalogo.js, PAISES).
// Sin estilos ni scripts en línea: compatible con la CSP del sitio.
(function () {
  var CLAVE = 'od_pais';
  var bloque = document.getElementById('od-paises');
  if (!bloque) return;
  var PAISES;
  try { PAISES = JSON.parse(bloque.textContent); } catch (e) { return; }
  var porCodigo = {};
  PAISES.forEach(function (p) { porCodigo[p.codigo] = p; });

  function leer() { try { return porCodigo[localStorage.getItem(CLAVE)] || null; } catch (e) { return null; } }
  function guardar(p) {
    try { if (p) localStorage.setItem(CLAVE, p.codigo); else localStorage.removeItem(CLAVE); } catch (e) { /* modo privado: no se recuerda */ }
  }
  var pais = leer();

  function red(p) { return p.v + ' V'; }
  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function icono(nombre) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('class', 'i');
    s.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS(ns, 'use');
    u.setAttribute('href', '#i-' + nombre);
    s.appendChild(u);
    return s;
  }
  var ICONO = { si: 'check', no: 'x', depende: 'alerta', info: 'info' };

  // ── Veredicto de un producto para el país elegido ─────────────────────────
  // d: data-red ("110", "220", "110 220" o vacío), data-tipo y data-voltaje del producto
  function veredicto(d, p) {
    var redes = (d.red || '').split(' ').filter(Boolean);
    var volt = d.voltaje;
    var g = p.grupo;
    if (d.tipo === 'independiente') {
      return { tono: 'info', titulo: 'No depende del voltaje', texto: 'Funciona a pilas o se alimenta por USB, así que sirve en ' + p.nombre + '.' };
    }
    if (d.tipo === 'versiones') {
      return {
        tono: 'si', titulo: 'Hay versión para ' + p.nombre,
        texto: g === 'br'
          ? 'Elige la versión para la red de tu ciudad (127 o 220 V) con clavija ' + p.clavijas + '.'
          : 'Elige la versión de ' + red(p) + ' con clavija ' + p.clavijas + ': revisa el modelo en el anuncio antes de comprar.',
      };
    }
    if (d.tipo === 'universal') {
      return { tono: 'si', titulo: 'Funciona en ' + p.nombre, texto: 'Acepta ' + volt + ', así que sirve con la red de ' + red(p) + '.' };
    }
    if (g === 'br') {
      return { tono: 'depende', titulo: 'Depende de tu ciudad', texto: 'En Brasil hay ciudades de 127 V y de 220 V. Este producto es de ' + volt + '.' };
    }
    if (redes.indexOf(g) >= 0) {
      return { tono: 'si', titulo: 'Funciona en ' + p.nombre, texto: 'Tu red es de ' + red(p) + ' y este producto es de ' + volt + '.' };
    }
    return {
      tono: 'no', titulo: 'No es para tu red de ' + red(p),
      texto: 'Este producto es de ' + volt + '. Busca la versión para ' + (g === '220' ? '220–240 V' : '110–127 V') + '.',
    };
  }

  function pintarVeredictos() {
    document.querySelectorAll('[data-veredicto]').forEach(function (n) {
      var producto = n.closest('[data-tipo]');
      if (!pais || !producto) { n.hidden = true; return; }
      var v = veredicto(producto.dataset, pais);
      n.className = 'veredicto-mini t-' + v.tono;
      n.replaceChildren(icono(ICONO[v.tono]), document.createTextNode(v.titulo));
      n.hidden = false;
    });
    document.querySelectorAll('[data-veredicto-ficha]').forEach(function (n) {
      var ib = el('span', 'ib');
      var texto = el('div');
      var boton = el('button', pais ? 'cambiar' : 'btn sm secondary', pais ? 'Cambiar país' : 'Elegir mi país');
      boton.type = 'button';
      boton.setAttribute('data-abrir-pais', '');
      if (pais) {
        var v = veredicto(n.dataset, pais);
        n.className = 'veredicto t-' + v.tono;
        ib.appendChild(icono(ICONO[v.tono]));
        texto.append(el('strong', null, v.titulo), el('p', null, v.texto), boton);
      } else {
        n.className = 'veredicto t-pregunta';
        ib.appendChild(icono('ubicacion'));
        texto.append(el('strong', null, '¿Funciona en tu país?'), el('p', null, 'Elige tu país y te decimos si este producto sirve con tu red eléctrica.'), boton);
      }
      n.replaceChildren(ib, texto);
      n.hidden = false;
    });
  }

  // ── Cabecera ──────────────────────────────────────────────────────────────
  function pintarCabecera() {
    document.querySelectorAll('[data-chip-pais]').forEach(function (n) {
      n.textContent = pais ? pais.codigo + ' · ' + red(pais) : 'Tu país';
    });
    document.querySelectorAll('.chip-pais').forEach(function (b) {
      b.hidden = false;
      b.classList.toggle('elegido', !!pais);
    });
  }

  // ── Portada ───────────────────────────────────────────────────────────────
  var focoOriginal = null;
  function pintarPortada() {
    document.querySelectorAll('[data-pais-nombre]').forEach(function (n) { n.textContent = pais ? pais.nombre : 'tu país'; });

    var tarjeta = document.querySelector('.volt-card');
    if (tarjeta) {
      tarjeta.querySelectorAll('[data-grupo]').forEach(function (a) {
        var mia = !!pais && a.getAttribute('data-grupo') === pais.grupo;
        a.classList.toggle('es-tuya', mia);
        if (mia) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      var sirven = tarjeta.querySelector('[data-sirven]');
      if (sirven) {
        sirven.hidden = !pais;
        if (pais) {
          var br = pais.grupo === 'br';
          sirven.className = 'sirven ' + (br ? 't-depende' : 't-si');
          sirven.replaceChildren(icono(br ? 'alerta' : 'check'), document.createTextNode(br
            ? 'En Brasil depende de la red de tu ciudad (127 o 220 V)'
            : 'Te sirven ' + tarjeta.getAttribute('data-sirven-' + pais.grupo) + ' de ' + tarjeta.getAttribute('data-total') + ' productos del catálogo'));
        }
      }
    }

    document.querySelectorAll('[data-elegir-pais]').forEach(function (a) {
      if (pais && a.getAttribute('data-elegir-pais') === pais.codigo) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    // El foco del escenario: la versión de 220 V si tu país es de 220 V
    var fig = document.querySelector('.noche[data-foco-220-url]');
    if (fig) {
      var nombre = fig.querySelector('[data-foco-nombre]');
      var url = fig.querySelector('[data-foco-url]');
      var redFoco = fig.querySelector('[data-foco-red]');
      if (nombre && url && redFoco) {
        if (!focoOriginal) focoOriginal = { nombre: nombre.textContent, url: url.getAttribute('href'), red: redFoco.textContent };
        var de220 = !!pais && pais.grupo === '220';
        nombre.textContent = de220 ? fig.getAttribute('data-foco-220-nombre') : focoOriginal.nombre;
        url.setAttribute('href', de220 ? fig.getAttribute('data-foco-220-url') : focoOriginal.url);
        redFoco.textContent = de220 ? fig.getAttribute('data-foco-220-red') : focoOriginal.red;
      }
    }
  }

  // El foco que se enciende y cambia de luz cálida a fría (temperatura de color)
  function iniciarFoco() {
    var fig = document.querySelector('.noche');
    if (!fig) return;
    var controles = fig.querySelector('[data-foco-controles]');
    var sw = fig.querySelector('[data-foco-sw]');
    var k = fig.querySelector('[data-foco-k]');
    var salida = fig.querySelector('[data-kout]');
    if (!controles || !sw || !k || !salida) return;
    function rgb(kelvin) {
      var t = kelvin / 100, r, g, b;
      r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
      g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
      b = t >= 66 ? 255 : (t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307);
      function c(x) { return Math.round(Math.max(0, Math.min(255, x))); }
      return c(r) + ' ' + c(g) + ' ' + c(b);
    }
    function tipoDeLuz(kelvin) { return kelvin < 3300 ? 'luz cálida' : kelvin < 5000 ? 'luz neutra' : 'luz fría'; }
    function pintar() {
      var encendido = sw.getAttribute('aria-checked') === 'true';
      fig.classList.toggle('apagado', !encendido);
      fig.style.setProperty('--k', rgb(+k.value));
      salida.textContent = encendido ? k.value + ' K · ' + tipoDeLuz(+k.value) : 'Apagado';
    }
    k.addEventListener('input', function () { sw.setAttribute('aria-checked', 'true'); pintar(); });
    sw.addEventListener('click', function () { sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true')); pintar(); });
    controles.hidden = false;
    pintar();
  }

  // ── Panel para elegir el país ─────────────────────────────────────────────
  var panel = null, selector = null, infoRed = null, abridor = null;
  function crearPanel() {
    panel = el('div', 'panel-pais');
    panel.id = 'panel-pais';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Elige tu país');
    panel.hidden = true;
    selector = el('select');
    selector.id = 'od-pais-select';
    selector.setAttribute('aria-label', 'País');
    selector.append(new Option('Elige tu país…', ''));
    PAISES.forEach(function (p) { selector.append(new Option(p.nombre, p.codigo)); });
    infoRed = el('p', 'panel-red');
    var acciones = el('div', 'panel-acciones');
    var olvidar = el('button', 'btn sm secondary', 'Olvidar mi país');
    var listo = el('button', 'btn sm', 'Listo');
    olvidar.type = 'button';
    listo.type = 'button';
    acciones.append(olvidar, listo);
    panel.append(
      el('p', 'eyebrow', 'Tu país'), selector, infoRed,
      el('p', 'panel-nota', 'Lo usamos para decirte si cada producto funciona con tu red eléctrica. Se guarda solo en tu navegador.'),
      acciones
    );
    selector.addEventListener('change', function () { elegir(selector.value || null); });
    listo.addEventListener('click', function () { cerrar(true); });
    olvidar.addEventListener('click', function () { elegir(null); cerrar(true); });
    document.body.appendChild(panel);
  }
  function actualizarPanel() {
    if (!panel) return;
    selector.value = pais ? pais.codigo : '';
    infoRed.textContent = pais ? 'Red de ' + red(pais) + ' · clavija ' + pais.clavijas + (pais.grupo === 'br' ? ' · según la ciudad' : '') : '';
  }
  function marcarAbiertos(abierto) {
    document.querySelectorAll('.chip-pais').forEach(function (b) { b.setAttribute('aria-expanded', String(abierto)); });
  }
  function abrir(origen) {
    if (!panel) crearPanel();
    abridor = origen;
    actualizarPanel();
    panel.hidden = false;
    marcarAbiertos(true);
    selector.focus();
  }
  function cerrar(devolverFoco) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    marcarAbiertos(false);
    if (devolverFoco && abridor && document.body.contains(abridor)) abridor.focus();
  }

  function elegir(codigo) {
    pais = codigo ? porCodigo[codigo] || null : null;
    guardar(pais);
    pintar();
    actualizarPanel();
    document.dispatchEvent(new CustomEvent('od:pais', { detail: pais }));
  }

  function pintar() { pintarCabecera(); pintarPortada(); pintarVeredictos(); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var abre = t.closest && t.closest('[data-abrir-pais]');
    if (abre) {
      e.preventDefault();
      if (panel && !panel.hidden) cerrar(false); else abrir(abre);
      return;
    }
    var mapa = t.closest && t.closest('[data-elegir-pais]');
    if (mapa) { elegir(mapa.getAttribute('data-elegir-pais')); return; } // el enlace sigue a su página
    if (panel && !panel.hidden && !panel.contains(t)) cerrar(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(true); });

  // Para otros scripts del sitio (por ejemplo, el filtro de voltaje del catálogo)
  window.odPais = function () { return pais; };

  pintar();
  iniciarFoco();
})();
