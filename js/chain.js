/* ==========================================================================
   chain.js — the interactive proof-of-work chain
   --------------------------------------------------------------------------
   Four blocks are hashed live in the browser. Each block stores the previous
   block's hash, so editing an old block invalidates every block after it —
   the point of the whole exercise.

   Mining runs in requestAnimationFrame slices rather than a tight loop, so
   the page keeps painting and the nonce counter stays readable while the
   search is running.
   ========================================================================== */

(function () {
  "use strict";

  var track = document.getElementById("chainTrack");
  if (!track || typeof window.sha256 !== "function") return;

  var statusEl = document.getElementById("chainStatus");
  var statusText = document.getElementById("chainStatusText");
  var difficultyInput = document.getElementById("difficulty");
  var difficultyOut = document.getElementById("difficultyOut");
  var mineAllBtn = document.getElementById("mineAll");
  var resetBtn = document.getElementById("resetChain");

  var GENESIS_PREV = new Array(65).join("0");   /* 64 zeros */
  var CHUNK = 6000;                             /* hashes per animation frame */
  var MAX_NONCE = 40000000;

  var SEED = [
    "alice → bob     50 ◆\nbob   → carol   12 ◆",
    "carol → dave     3 ◆\ndave  → erin     9 ◆",
    "erin  → alice   14 ◆\nalice → frank    2 ◆",
    "frank → carol    7 ◆\ncarol → bob      1 ◆"
  ];

  var difficulty = parseInt(difficultyInput.value, 10) || 3;
  var blocks = [];
  var views = [];
  var mining = null;      /* handle for the frame loop currently running */

  /* ----------------------------------------------------------------------
     Model
     ---------------------------------------------------------------------- */

  function payload(block) {
    return block.index + "|" + block.data + "|" + block.prev + "|" + block.nonce;
  }

  function target() {
    return new Array(difficulty + 1).join("0");
  }

  function isSolved(block) {
    return block.hash.indexOf(target()) === 0;
  }

  /* Recompute hashes from `from` to the end of the chain. Hashes always
     reflect the current contents, which is what makes tampering visible. */
  function recompute(from) {
    for (var i = from; i < blocks.length; i++) {
      blocks[i].prev = i === 0 ? GENESIS_PREV : blocks[i - 1].hash;
      blocks[i].hash = window.sha256(payload(blocks[i]));
    }
  }

  function build() {
    blocks = SEED.map(function (data, i) {
      return { index: i + 1, data: data, nonce: 0, prev: GENESIS_PREV, hash: "" };
    });
    recompute(0);
  }

  /* ----------------------------------------------------------------------
     View
     ---------------------------------------------------------------------- */

  function markupFor(block, i) {
    var el = document.createElement("article");
    el.className = "block";
    el.setAttribute("role", "listitem");
    el.dataset.index = String(i);

    el.innerHTML =
      '<div class="block__head">' +
        '<p class="block__index">Block <span>#' + block.index + "</span></p>" +
        '<p class="block__state"><span class="dot" aria-hidden="true"></span><span data-role="state">unmined</span></p>' +
      "</div>" +

      '<div class="block__field">' +
        '<label class="block__key" for="blockData' + i + '">Data — try editing it</label>' +
        '<textarea class="block__data" id="blockData' + i + '" spellcheck="false"></textarea>' +
      "</div>" +

      '<div class="block__field">' +
        '<span class="block__key">Previous hash</span>' +
        '<p class="block__hash block__hash--prev mono" data-role="prev"></p>' +
      "</div>" +

      '<div class="block__field">' +
        '<span class="block__key">Hash of this block</span>' +
        '<p class="block__hash mono" data-role="hash"></p>' +
      "</div>" +

      '<div class="block__foot">' +
        '<p class="block__nonce">Nonce <b data-role="nonce">0</b></p>' +
        '<button class="btn btn--small" type="button" data-role="mine">Mine</button>' +
      "</div>";

    var textarea = el.querySelector("textarea");
    textarea.value = block.data;

    textarea.addEventListener("input", function () {
      blocks[i].data = textarea.value;
      recompute(i);
      render();
    });

    el.querySelector('[data-role="mine"]').addEventListener("click", function () {
      mineFrom(i, false);
    });

    return {
      el: el,
      state: el.querySelector('[data-role="state"]'),
      prev: el.querySelector('[data-role="prev"]'),
      hash: el.querySelector('[data-role="hash"]'),
      nonce: el.querySelector('[data-role="nonce"]'),
      mine: el.querySelector('[data-role="mine"]'),
      textarea: textarea
    };
  }

  /* Wrap the run of leading zeros in <b> so "solved" is visible at a glance. */
  function formatHash(hash) {
    var zeros = 0;
    while (zeros < hash.length && hash.charAt(zeros) === "0") zeros++;
    if (!zeros) return hash;
    return "<b>" + hash.slice(0, zeros) + "</b>" + hash.slice(zeros);
  }

  function render() {
    var firstBroken = -1;

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var view = views[i];
      var solved = isSolved(block);
      var linked = i === 0 ? block.prev === GENESIS_PREV : block.prev === blocks[i - 1].hash;
      var valid = solved && linked;

      if (!valid && firstBroken === -1) firstBroken = i;

      view.el.dataset.valid = String(valid);
      view.state.textContent = valid ? "valid" : solved ? "broken link" : "unmined";
      view.prev.innerHTML = i === 0
        ? '<span style="opacity:.6">' + GENESIS_PREV.slice(0, 32) + "… (genesis)</span>"
        : formatHash(block.prev);
      view.hash.innerHTML = formatHash(block.hash);
      view.nonce.textContent = block.nonce.toLocaleString();
    }

    setStatus(firstBroken);
  }

  function setStatus(firstBroken) {
    if (mining) return;                       /* the miner owns the status line */

    if (firstBroken === -1) {
      statusEl.dataset.state = "valid";
      statusText.textContent =
        "Chain valid — every hash starts with " + difficulty +
        " zero" + (difficulty === 1 ? "" : "s") + " and every link matches";
    } else {
      statusEl.dataset.state = "invalid";
      statusText.textContent =
        "Chain broken from block #" + blocks[firstBroken].index +
        " onwards — re-mine it and everything after it";
    }
  }

  /* ----------------------------------------------------------------------
     Mining
     ---------------------------------------------------------------------- */

  function setBusy(busy) {
    mineAllBtn.disabled = busy;
    resetBtn.disabled = busy;
    difficultyInput.disabled = busy;
    views.forEach(function (view) { view.mine.disabled = busy; });
    mineAllBtn.textContent = busy ? "Mining…" : "Mine all blocks";
  }

  /* Mine block `i`; when `cascade` is true, carry on through the rest of the
     chain, which is exactly the work an attacker would have to redo. */
  function mineFrom(i, cascade) {
    if (mining || i >= blocks.length) return;

    var block = blocks[i];
    var prefix = target();
    var nonce = 0;

    /* Point at the current previous hash before searching, otherwise we would
       solve for a link that no longer exists and the result would be thrown
       away the moment the chain is recomputed. */
    block.prev = i === 0 ? GENESIS_PREV : blocks[i - 1].hash;

    setBusy(true);
    views[i].el.dataset.mining = "true";
    statusEl.dataset.state = "working";

    mining = { cancelled: false };
    var handle = mining;

    function step() {
      if (handle.cancelled) return;

      var end = nonce + CHUNK;
      for (; nonce < end && nonce < MAX_NONCE; nonce++) {
        block.nonce = nonce;
        var hash = window.sha256(payload(block));
        if (hash.indexOf(prefix) === 0) {
          block.hash = hash;
          finish();
          return;
        }
      }

      /* Keep the read-out honest while the search continues. */
      block.hash = window.sha256(payload(block));
      views[i].nonce.textContent = nonce.toLocaleString();
      views[i].hash.innerHTML = formatHash(block.hash);
      statusText.textContent =
        "Mining block #" + block.index + " — " + nonce.toLocaleString() + " hashes tried";

      if (nonce >= MAX_NONCE) { finish(); return; }
      requestAnimationFrame(step);
    }

    function finish() {
      views[i].el.dataset.mining = "false";
      mining = null;
      recompute(i);                      /* downstream links now point at a new hash */
      setBusy(false);
      render();

      if (cascade && i + 1 < blocks.length) mineFrom(i + 1, true);
    }

    requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------------------
     Controls
     ---------------------------------------------------------------------- */

  difficultyInput.addEventListener("input", function () {
    difficulty = parseInt(difficultyInput.value, 10) || 1;
    difficultyOut.textContent = difficulty + " zero" + (difficulty === 1 ? "" : "s");
    render();
  });

  mineAllBtn.addEventListener("click", function () { mineFrom(0, true); });

  resetBtn.addEventListener("click", function () {
    if (mining) mining.cancelled = true;
    mining = null;
    build();
    views.forEach(function (view, i) {
      view.textarea.value = blocks[i].data;
      view.el.dataset.mining = "false";
    });
    setBusy(false);
    render();
  });

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  build();
  views = blocks.map(markupFor);
  views.forEach(function (view) { track.appendChild(view.el); });
  difficultyOut.textContent = difficulty + " zero" + (difficulty === 1 ? "" : "s");
  render();

  /* Mine once automatically when the demo first scrolls into view, so the
     chain is in its "valid" state before anyone tries to break it. */
  if ("IntersectionObserver" in window) {
    var started = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !started) {
          started = true;
          observer.disconnect();
          mineFrom(0, true);
        }
      });
    }, { threshold: 0.25 });
    observer.observe(track);
  }
})();
