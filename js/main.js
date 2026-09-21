/* ==========================================================================
   main.js — page behaviour
   --------------------------------------------------------------------------
   Theme, navigation, scroll spy, reveal-on-scroll, the era tabs, the myth
   cards and the annotated contract. Everything degrades gracefully: with
   JavaScript off the page is still complete, readable and navigable.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ----------------------------------------------------------------------
     1. Theme
     ---------------------------------------------------------------------- */

  var themeToggle = document.getElementById("themeToggle");

  function applyTheme(isDark) {
    if (isDark) root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");

    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  applyTheme(root.getAttribute("data-theme") === "dark");

  themeToggle.addEventListener("click", function () {
    var isDark = root.getAttribute("data-theme") !== "dark";
    applyTheme(isDark);
    try { localStorage.setItem("bxb-theme", isDark ? "dark" : "light"); } catch (e) { /* private mode */ }
  });

  /* ----------------------------------------------------------------------
     2. Navigation
     ---------------------------------------------------------------------- */

  var header = document.getElementById("siteHeader");
  var nav = document.getElementById("siteNav");
  var navToggle = document.getElementById("navToggle");

  function closeNav() {
    nav.dataset.open = "false";
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  navToggle.addEventListener("click", function () {
    var open = navToggle.getAttribute("aria-expanded") === "true";
    if (open) {
      closeNav();
    } else {
      nav.dataset.open = "true";
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close menu");
    }
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) closeNav();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeNav();
  });

  /* Hairline under the header only once the page has actually scrolled. */
  var onScroll = function () {
    header.dataset.stuck = String(window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ----------------------------------------------------------------------
     3. Scroll spy — highlights the nav link and the progress rail
     ---------------------------------------------------------------------- */

  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-section], #top"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav__link"));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll(".progress-rail__link"));

  function markCurrent(id) {
    navLinks.forEach(function (link) {
      link.setAttribute("aria-current", link.getAttribute("href") === "#" + id ? "true" : "false");
    });
    railLinks.forEach(function (link) {
      link.setAttribute("aria-current", link.dataset.rail === id ? "true" : "false");
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var visible = {};

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      var best = null;
      var bestRatio = 0;
      sections.forEach(function (section) {
        var ratio = visible[section.id] || 0;
        if (ratio > bestRatio) { bestRatio = ratio; best = section.id; }
      });

      if (best) markCurrent(best);
    }, { threshold: [0.05, 0.25, 0.5, 0.75], rootMargin: "-20% 0px -40% 0px" });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ----------------------------------------------------------------------
     4. Reveal on scroll
     ---------------------------------------------------------------------- */

  var revealables = document.querySelectorAll("[data-reveal]");

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealables.forEach(function (el) { revealer.observe(el); });
  }

  /* ----------------------------------------------------------------------
     5. Era tabs (Web1 / Web2 / Web3)
     ---------------------------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".era__tab"));

  function selectTab(tab, focus) {
    tabs.forEach(function (other) {
      var selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { selectTab(tab, false); });

    /* Arrow-key navigation is expected of a tablist. */
    tab.addEventListener("keydown", function (event) {
      var delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1
                : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1
                : 0;
      if (!delta) return;
      event.preventDefault();
      selectTab(tabs[(index + delta + tabs.length) % tabs.length], true);
    });
  });

  if (tabs.length) {
    var initial = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
    selectTab(initial || tabs[0], false);
  }

  /* ----------------------------------------------------------------------
     6. Myth cards
     ---------------------------------------------------------------------- */

  document.querySelectorAll(".myth").forEach(function (card) {
    function flip() {
      card.setAttribute("aria-pressed", card.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }

    card.addEventListener("click", flip);
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flip();
      }
    });
  });

  /* ----------------------------------------------------------------------
     7. Annotated contract
     ---------------------------------------------------------------------- */

  var codeLines = Array.prototype.slice.call(document.querySelectorAll(".code-line[data-note]"));
  var notes = Array.prototype.slice.call(document.querySelectorAll(".contract__note[id^='note-']"));

  function showNote(key) {
    notes.forEach(function (note) { note.hidden = note.id !== "note-" + key; });
    codeLines.forEach(function (line) {
      line.classList.toggle("is-active", line.dataset.note === key);
    });
  }

  codeLines.forEach(function (line) {
    line.setAttribute("aria-label", "Explain this line");
    line.addEventListener("click", function () { showNote(line.dataset.note); });
    line.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showNote(line.dataset.note);
      }
    });
  });

  /* ----------------------------------------------------------------------
     8. Motion preferences
     ---------------------------------------------------------------------- */

  /* The CSS media query cannot reach SVG's own SMIL animations, so the hero
     artwork is paused explicitly when the visitor asks for less motion. */
  function syncMotion() {
    var art = document.getElementById("heroArt");
    if (!art || typeof art.pauseAnimations !== "function") return;
    if (reduceMotion.matches) art.pauseAnimations();
    else art.unpauseAnimations();
  }

  syncMotion();
  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", syncMotion);
  }
})();
