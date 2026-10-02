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

  function estilos(el, props) { Object.keys(props).forEach(function (k) { el.style[k] = props[k]; }); return el; }

  function boton(texto, principal, alPulsar) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    estilos(b, {
      font: '600 14px system-ui, sans-serif', padding: '9px 16px', borderRadius: '10px', cursor: 'pointer',
      border: principal ? '0' : '1px solid rgba(0,212,170,0.6)',
      background: principal ? '#00d4aa' : 'transparent', color: principal ? '#03130f' : '#00d4aa',
    });
    b.addEventListener('click', alPulsar);
    return b;
  }

  function mostrarAviso() {
    var previo = document.getElementById('od-cookies');
    if (previo) previo.remove();

    var caja = estilos(document.createElement('div'), {
      position: 'fixed', left: '12px', right: '12px', bottom: '12px', zIndex: '1000', margin: '0 auto', maxWidth: '760px',
      background: '#172035', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px',
      padding: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.45)', font: '14px/1.5 system-ui, sans-serif',
    });
    caja.id = 'od-cookies';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Preferencias de cookies');

    var texto = document.createElement('p');
    estilos(texto, { margin: '0 0 12px' });
    texto.append('Usamos Google Analytics para saber qué páginas te resultan útiles. Solo se activa si aceptas, y puedes cambiar de opinión cuando quieras. ');
    var enlace = document.createElement('a');
    enlace.href = '/privacidad#cookies';
    enlace.textContent = 'Más información';
    estilos(enlace, { color: '#00d4aa' });
    texto.append(enlace);

    var acciones = estilos(document.createElement('div'), { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' });
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
