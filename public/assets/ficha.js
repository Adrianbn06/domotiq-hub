// Ficha de producto: la barra de compra fija (solo en el celular) aparece cuando ya pasaste
// los botones de compra de arriba, para no mostrar dos veces el mismo botón.
(function () {
  var barra = document.querySelector('.buybar');
  var caja = document.querySelector('.buy');
  if (!barra || !caja || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (entradas) {
    var e = entradas[0];
    barra.hidden = e.isIntersecting || e.boundingClientRect.top > 0;
  }).observe(caja);
})();
