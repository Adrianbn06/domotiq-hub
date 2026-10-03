// Consentimiento de cookies + Google Analytics 4.
// Google Analytics solo se carga si el visitante pulsa "Aceptar". La elección se guarda en el navegador
// (localStorage) y se puede cambiar con cualquier enlace o botón que tenga el atributo data-cookies.
// Sin estilos ni scripts en línea: compatible con la CSP estricta del sitio.
(function () {
  var GA_ID = 'G-J4MP94RSZL';
  var CLAVE = 'od_consentimiento_cookies';

  function leer() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(valor) { try { localStorage.setItem(CLAVE, valor); } catch (e) { /* modo privado: no se recuerda */ } }

  function cargarAnalytics() {
    if (window.__odAnalytics) return;
    window.__odAnalytics = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function desactivarAnalytics() {
    window['ga-disable-' + GA_ID] = true;
    document.cookie.split(';').forEach(function (c) {
      var nombre = c.split('=')[0].trim();
      if (/^_ga/.test(nombre)) {
        ['', '.ofertasdomoticas.com', '.www.ofertasdomoticas.com'].forEach(function (dominio) {
          document.cookie = nombre + '=; Max-Age=0; path=/' + (dominio ? '; domain=' + dominio : '');
        });
      }
    });
  }

  // El aspecto lo da la hoja de estilos del sitio (.cookies, .btn): aquí solo se crea el marcado
  function boton(texto, principal, alPulsar) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = principal ? 'btn sm' : 'btn sm secondary';
    b.textContent = texto;
    b.addEventListener('click', alPulsar);
    return b;
  }

  function mostrarAviso() {
    var previo = document.getElementById('od-cookies');
    if (previo) previo.remove();

    var caja = document.createElement('div');
    caja.id = 'od-cookies';
    caja.className = 'cookies';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Preferencias de cookies');

    var texto = document.createElement('p');
    texto.append('Usamos Google Analytics para saber qué páginas te resultan útiles. Solo se activa si aceptas, y puedes cambiar de opinión cuando quieras. ');
    var enlace = document.createElement('a');
    enlace.href = '/privacidad#cookies';
    enlace.textContent = 'Más información';
    texto.append(enlace);

    var acciones = document.createElement('div');
    acciones.className = 'acciones';
    acciones.append(
      boton('Rechazar', false, function () { guardar('rechazado'); desactivarAnalytics(); caja.remove(); }),
      boton('Aceptar', true, function () { guardar('aceptado'); cargarAnalytics(); caja.remove(); })
    );

    caja.append(texto, acciones);
    document.body.appendChild(caja);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-cookies]');
    if (t) { e.preventDefault(); mostrarAviso(); }
  });

  var eleccion = leer();
  if (eleccion === 'aceptado') {
    cargarAnalytics();
  } else if (eleccion !== 'rechazado') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarAviso);
    else mostrarAviso();
  }
})();
