// Chapter pages: smooth-scroll the sidebar jump links and highlight the section in view.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.jump a'));
  links.forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { ev.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', a.getAttribute('href')); }
    });
  });
  var heads = Array.prototype.slice.call(document.querySelectorAll('h2[id]'));
  function update() {
    var best = null, bestTop = -Infinity;
    heads.forEach(function (h) { var t = h.getBoundingClientRect().top; if (t < 120 && t > bestTop) { bestTop = t; best = h.id; } });
    links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + best); });
  }
  window.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
  update();
})();
