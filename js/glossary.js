/* ==========================================================================
   glossary.js - the Decoder: pick a term, see it explained with a diagram
   ========================================================================== */

(function () {
  "use strict";

  var tiles = Array.prototype.slice.call(document.querySelectorAll(".gtile"));
  var panes = Array.prototype.slice.call(document.querySelectorAll(".gpane"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".gdots span"));
  var card = document.getElementById("gCard");
  if (!tiles.length || !card) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var narrow = window.matchMedia("(max-width: 60rem)");
  var current = 0;

  function show(i, fromUser) {
    i = (i + tiles.length) % tiles.length;
    current = i;
    var key = tiles[i].dataset.term;
    tiles.forEach(function (t, n) {
      t.classList.toggle("is-active", n === i);
      t.setAttribute("aria-pressed", String(n === i));
    });
    panes.forEach(function (p) { p.hidden = p.dataset.term !== key; });
    dots.forEach(function (d, n) { d.classList.toggle("is-on", n === i); });
    card.dataset.danger = tiles[i].dataset.danger ? "true" : "false";

    /* keep the active tile visible in the phone scroller */
    if (narrow.matches) {
      var strip = tiles[i].parentElement;
      strip.scrollTo({ left: tiles[i].offsetLeft - 16, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
    if (fromUser && narrow.matches) {
      var r = card.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.6 || r.top < 60) {
        window.scrollBy({ top: r.top - 150, behavior: reduceMotion.matches ? "auto" : "smooth" });
      }
    }
  }

  tiles.forEach(function (tile, i) {
    tile.addEventListener("click", function () { show(i, true); });

    /* 3D tilt that follows the pointer */
    tile.addEventListener("pointermove", function (event) {
      if (reduceMotion.matches || event.pointerType === "touch") return;
      var r = tile.getBoundingClientRect();
      var x = (event.clientX - r.left) / r.width - 0.5;
      var y = (event.clientY - r.top) / r.height - 0.5;
      tile.style.setProperty("--rx", (-y * 14).toFixed(2) + "deg");
      tile.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      tile.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%");
      tile.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
    });
    tile.addEventListener("pointerleave", function () {
      tile.style.setProperty("--rx", "0deg");
      tile.style.setProperty("--ry", "0deg");
    });
  });

  document.getElementById("gPrev").addEventListener("click", function () { show(current - 1, false); });
  document.getElementById("gNext").addEventListener("click", function () { show(current + 1, false); });

  card.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") show(current + 1, false);
    if (event.key === "ArrowLeft") show(current - 1, false);
  });

  /* swipe between terms on touch screens */
  var startX = null;
  card.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1), false);
    startX = null;
  });

  show(0, false);
})();
