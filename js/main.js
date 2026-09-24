/* ==========================================================================
   main.js - page behaviour
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
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  /* What the page is showing right now: an explicit choice if one was made,
     otherwise whatever the operating system asked for. */
  function isDarkNow() {
    var chosen = root.getAttribute("data-theme");
    if (chosen === "dark") return true;
    if (chosen === "light") return false;
    return prefersDark.matches;
  }

  function applyTheme(isDark) {
    /* Always explicit, so the toggle can override the system in either
       direction rather than only one way. */
    root.setAttribute("data-theme", isDark ? "dark" : "light");
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  themeToggle.setAttribute(
    "aria-label",
    isDarkNow() ? "Switch to light theme" : "Switch to dark theme"
  );

  themeToggle.addEventListener("click", function () {
    var isDark = !isDarkNow();
    applyTheme(isDark);
    try { localStorage.setItem("bxb-theme", isDark ? "dark" : "light"); } catch (e) { /* private mode */ }
  });

  /* Follow the system while the visitor has not expressed a preference. */
  if (typeof prefersDark.addEventListener === "function") {
    prefersDark.addEventListener("change", function () {
      if (root.hasAttribute("data-theme")) return;
      themeToggle.setAttribute(
        "aria-label",
        prefersDark.matches ? "Switch to light theme" : "Switch to dark theme"
      );
    });
  }

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
     3. Scroll spy - highlights the nav link and the progress rail
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
     4b. Hero numbers count up once they are on screen
     ---------------------------------------------------------------------- */

  var counters = Array.prototype.slice.call(document.querySelectorAll(".count[data-to]"));
  function runCount(el) {
    var to = +el.dataset.to, from = +(el.dataset.from || 0), start = null, dur = 1400;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    var counterSeen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        counterSeen.unobserve(e.target);
        setTimeout(function () { runCount(e.target); }, 900);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { counterSeen.observe(c); });
  }

  /* ----------------------------------------------------------------------
     5. Era tabs (Web1 / Web2 / Web3)
     ---------------------------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".era__tab"));
  var tabList = document.querySelector(".era__tabs");
  var eraBox = document.querySelector(".era");
  var bubbles = Array.prototype.slice.call(document.querySelectorAll(".bubble"));

  function selectTab(tab, focus) {
    tabs.forEach(function (other) {
      var selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
    });

    /* Fill the timeline rail up to the selected era, and light its bubble. */
    var index = tabs.indexOf(tab);
    if (tabList) tabList.style.setProperty("--progress", tabs.length > 1 ? index / (tabs.length - 1) : 1);
    bubbles.forEach(function (bubble) {
      bubble.classList.toggle("is-active", bubble.dataset.target === tab.id);
    });

    if (focus) tab.focus();
  }

  /* The header bubbles double as shortcuts to their era. */
  bubbles.forEach(function (bubble) {
    bubble.addEventListener("click", function () {
      var tab = document.getElementById(bubble.dataset.target);
      if (!tab) return;
      selectTab(tab, false);
      if (eraBox) {
        var rect = eraBox.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.7 || rect.bottom < 0) {
          eraBox.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
        }
      }
    });
  });

  /* A colour ripple from the point that was pressed. */
  function addRipple(el, event) {
    if (reduceMotion.matches) return;
    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2;
    var x = (event.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    var y = (event.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
    var ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    el.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 700);
  }

  tabs.concat(bubbles).forEach(function (el) {
    el.addEventListener("pointerdown", function (event) { addRipple(el, event); });
  });

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
     5b. The Big 6 - click a card to open its explanation; click again to close
     ---------------------------------------------------------------------- */

  var conceptCards = Array.prototype.slice.call(document.querySelectorAll(".concept[data-topic]"));
  var stage = document.getElementById("conceptStage");
  var stageClose = document.getElementById("stageClose");
  var conceptsGrid = document.getElementById("conceptsGrid");
  var narrow = window.matchMedia("(max-width: 60rem)");
  var activeCard = null;

  /* On phones the explainer opens directly under the tapped card;
     on wider screens it opens under the grid. */
  function placeStage() {
    if (!stage) return;
    if (narrow.matches && activeCard) activeCard.insertAdjacentElement("afterend", stage);
    else if (conceptsGrid && stage.previousElementSibling !== conceptsGrid) conceptsGrid.insertAdjacentElement("afterend", stage);
  }

  function markCards() {
    conceptCards.forEach(function (c) {
      var on = c === activeCard;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-expanded", String(on));
    });
  }

  function closeConcept() {
    activeCard = null;
    markCards();
    if (stage) stage.hidden = true;
  }

  function openConcept(card) {
    if (!stage) return;
    if (card === activeCard) { closeConcept(); return; }
    activeCard = card;
    markCards();
    Array.prototype.forEach.call(stage.querySelectorAll(".stage__pane"), function (pane) {
      pane.hidden = pane.dataset.topic !== card.dataset.topic;
    });
    var wasHidden = stage.hidden;
    stage.hidden = false;
    if (wasHidden) { stage.style.animation = "none"; void stage.offsetWidth; stage.style.animation = ""; }
    placeStage();

    /* Bring the whole explanation on screen without making the reader scroll. */
    requestAnimationFrame(function () {
      var headerH = 80;
      if (narrow.matches) {
        /* phones: keep the tapped card at the top, explanation right below it */
        var cardTop = card.getBoundingClientRect().top;
        window.scrollTo({ top: window.scrollY + cardTop - headerH, behavior: reduceMotion.matches ? "auto" : "smooth" });
        return;
      }
      var rect = stage.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < headerH) {
        var target = window.scrollY + rect.bottom - window.innerHeight + 16;
        if (rect.height > window.innerHeight - headerH) target = window.scrollY + rect.top - headerH;
        window.scrollTo({ top: target, behavior: reduceMotion.matches ? "auto" : "smooth" });
      }
    });
  }

  conceptCards.forEach(function (card) {
    card.addEventListener("click", function () { openConcept(card); });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openConcept(card); }
    });
    /* golden light follows the pointer inside the card */
    card.addEventListener("pointermove", function (event) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", (event.clientX - rect.left) + "px");
      card.style.setProperty("--my", (event.clientY - rect.top) + "px");
    });
  });

  if (stageClose) {
    stageClose.addEventListener("click", function () {
      var card = activeCard;
      closeConcept();
      if (card) card.focus({ preventScroll: true });
    });
  }

  placeStage();
  if (typeof narrow.addEventListener === "function") narrow.addEventListener("change", placeStage);

  /* ----------------------------------------------------------------------
     5c. Cartoon laptop: dock, clock, click ripples, screen flash
     ---------------------------------------------------------------------- */

  var macScreen = document.getElementById("macScreen");
  if (macScreen) {
    var dockIcons = Array.prototype.slice.call(macScreen.querySelectorAll(".mac__dockicon"));
    var flash = macScreen.querySelector(".mac__flash");

    function syncDock() {
      var sel = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
      dockIcons.forEach(function (d) { d.classList.toggle("is-active", !!sel && d.dataset.target === sel.id); });
    }
    function flashScreen() {
      if (reduceMotion.matches || !flash) return;
      flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on");
    }

    dockIcons.forEach(function (d) {
      d.addEventListener("click", function () {
        var tab = document.getElementById(d.dataset.target);
        if (tab) selectTab(tab, false);
        d.classList.remove("is-bouncing"); void d.offsetWidth; d.classList.add("is-bouncing");
        syncDock(); flashScreen();
      });
    });
    tabs.forEach(function (t) { t.addEventListener("click", function () { syncDock(); flashScreen(); }); });
    bubbles.forEach(function (b) { b.addEventListener("click", syncDock); });
    syncDock();

    macScreen.addEventListener("pointerdown", function (e) {
      if (reduceMotion.matches) return;
      var r = macScreen.getBoundingClientRect();
      var dot = document.createElement("span");
      dot.className = "mac__click";
      dot.style.left = (e.clientX - r.left) + "px";
      dot.style.top = (e.clientY - r.top) + "px";
      macScreen.appendChild(dot);
      setTimeout(function () { dot.remove(); }, 520);
    });

    /* drop the fade once a panel has been scrolled to the bottom */
    Array.prototype.forEach.call(macScreen.querySelectorAll(".era__panel"), function (panel) {
      function check() { panel.classList.toggle("is-end", panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 6); }
      panel.addEventListener("scroll", check, { passive: true });
      tabs.forEach(function (t) { t.addEventListener("click", function () { panel.scrollTop = 0; setTimeout(check, 30); }); });
      dockIcons.forEach(function (d) { d.addEventListener("click", function () { panel.scrollTop = 0; setTimeout(check, 30); }); });
      setTimeout(check, 50);
    });

    var clock = document.getElementById("macClock");
    function tickClock() {
      var d = new Date();
      clock.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    if (clock) { tickClock(); setInterval(tickClock, 30000); }
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
