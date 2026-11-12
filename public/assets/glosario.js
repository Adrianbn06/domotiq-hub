// Glosario: buscador que filtra los términos mientras se escribe.
// Va en un archivo aparte (no en la página) para cumplir la CSP estricta del sitio.
(function () {
  var campo = document.getElementById('glos-search');
  if (!campo) return;
  campo.addEventListener('input', function () {
    var q = campo.value.trim().toLowerCase();
    document.querySelectorAll('.term-card').forEach(function (tarjeta) {
      tarjeta.hidden = q !== '' && tarjeta.textContent.toLowerCase().indexOf(q) === -1;
    });
    document.querySelectorAll('.letter-section').forEach(function (seccion) {
      seccion.hidden = !seccion.querySelector('.term-card:not([hidden])');
    });
  });
})();
