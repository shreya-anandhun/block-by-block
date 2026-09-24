/* ==========================================================================
   tips.js - hover (or tap) a highlighted word to see a plain-English bubble
   ========================================================================== */

(function () {
  "use strict";

  /* Longest phrases first so "decentralised apps" wins over "decentralised". */
  var TERMS = [
    { re: /\bdecentrali[sz]ed apps?\b|\bdApps?\b/i, title: "Decentralised app (dApp)", def: "An app whose back end runs on a blockchain instead of one company’s server, so no single company can switch it off." },
    { re: /\bdigital ownership\b/i, title: "Digital ownership", def: "Owning something online for real. The record that it’s yours lives on a blockchain, not in a company’s database." },
    { re: /\bnon-fungible tokens?\b|\bNFTs?\b/, title: "NFT", def: "A one-of-a-kind token that proves you own a specific item, like a piece of art, a ticket or a collectible." },
    { re: /\bsmart contracts?\b/i, title: "Smart contract", def: "A small program on the blockchain that runs by itself when its conditions are met. No middleman needed." },
    { re: /\bcrypto ?currenc(?:y|ies)\b|\bdigital currency\b/i, title: "Cryptocurrency", def: "Digital money that runs on a blockchain instead of a bank. Bitcoin and ETH are the best known." },
    { re: /\bSHA-256\b/, title: "SHA-256", def: "A maths recipe that turns any data into a unique 64-character fingerprint. Change one letter and the whole fingerprint changes." },
    { re: /\bproof of work\b/i, title: "Proof of Work", def: "Computers race to solve a hard puzzle using electricity. The winner adds the next block. Bitcoin uses this." },
    { re: /\bproof of stake\b/i, title: "Proof of Stake", def: "Validators lock up coins as a deposit to add blocks. Cheat, and that deposit is taken away. Ethereum uses this." },
    { re: /\bprivate keys?\b/i, title: "Private key", def: "Your secret password for the blockchain. It signs your transactions. Anyone who has it controls your funds." },
    { re: /\bblockchains?\b/i, title: "Blockchain", def: "A shared record book copied on thousands of computers. New pages are added in linked blocks, so the past can’t be quietly edited." },
    { re: /\bdecentrali[sz](?:ed|ation)\b/i, title: "Decentralised", def: "No single boss. Control is spread across many independent computers, so no one party can shut it down or rewrite it." },
    { re: /\bconsensus\b/i, title: "Consensus", def: "How thousands of computers agree on one version of the truth without anyone in charge." },
    { re: /\bledger\b/i, title: "Ledger", def: "A record of who owns what, and every transaction that has ever happened." },
    { re: /\bDAOs?\b/, title: "DAO", def: "An online group run by code and member votes instead of a CEO." },
    { re: /\bnodes?\b/i, title: "Node", def: "A computer that keeps a full copy of the blockchain and checks every rule." }
  ];

  var TARGETS = [
    ".lede", ".stat__label", ".bubble", ".era__panel .prose", ".callout__body", ".section-head .prose",
    ".chain__legend", ".concept__lead", ".stage__text", ".fcard__text", ".lane__verdict", ".pillar p",
    ".qfact p", ".grow p", ".cx-text", ".cx-facts", ".cx-note", ".whycard p", ".sigsteps", ".safety-list", ".wallet__hint", ".prose"
  ].join(",");
  var SKIP = "a, button, .cx-hash, .keynode__val, .tip, code, svg, script, style, .kterm, .qopt, .hw";

  var master = new RegExp(TERMS.map(function (t) { return t.re.source; }).join("|"), "gi");

  function find(word) {
    for (var i = 0; i < TERMS.length; i++) {
      var re = new RegExp("^(?:" + TERMS[i].re.source + ")$", TERMS[i].re.flags.replace("g", ""));
      if (re.test(word)) return i;
    }
    return -1;
  }

  function wrapIn(root) {
    var used = {};
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var text = node.nodeValue;
      master.lastIndex = 0;
      var match, last = 0, frag = null;
      while ((match = master.exec(text))) {
        var idx = find(match[0]);
        if (idx < 0 || used[idx]) continue;       /* one bubble per term per block */
        used[idx] = true;
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(text.slice(last, match.index)));
        var span = document.createElement("span");
        span.className = "tip";
        span.tabIndex = 0;
        span.dataset.tip = String(idx);
        span.textContent = match[0];
        frag.appendChild(span);
        last = match.index + match[0].length;
      }
      if (frag) {
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  var done = [];
  document.querySelectorAll(TARGETS).forEach(function (el) {
    if (done.some(function (d) { return d.contains(el); })) return;
    done.push(el);
    wrapIn(el);
  });

  /* The existing dashed "term" words join in too. */
  document.querySelectorAll(".term").forEach(function (el) {
    var idx = find(el.textContent.trim());
    if (idx >= 0) { el.classList.add("tip"); el.tabIndex = 0; el.dataset.tip = String(idx); }
  });

  /* One shared bubble, fixed to the viewport so nothing can clip it */
  var bubble = document.createElement("div");
  bubble.className = "tipbubble";
  bubble.setAttribute("role", "tooltip");
  bubble.id = "tipBubble";
  bubble.innerHTML =
    '<span class="tipbubble__ring" aria-hidden="true"></span>' +
    '<span class="tipbubble__head"><svg viewBox="-10 -10 20 20" aria-hidden="true"><path fill="currentColor" d="M0 -9 C1.2 -2.4 2.4 -1.2 9 0 C2.4 1.2 1.2 2.4 0 9 C-1.2 2.4 -2.4 1.2 -9 0 C-2.4 -1.2 -1.2 -2.4 0 -9Z"/></svg><strong></strong></span>' +
    '<p></p><span class="tipbubble__foot">Web3 decoder</span><span class="tipbubble__arrow" aria-hidden="true"></span>';
  document.body.appendChild(bubble);
  var titleEl = bubble.querySelector("strong");
  var defEl = bubble.querySelector("p");
  var arrow = bubble.querySelector(".tipbubble__arrow");
  var current = null;
  var hideTimer = null;

  function show(el) {
    clearTimeout(hideTimer);
    var t = TERMS[+el.dataset.tip];
    if (!t) return;
    if (current && current !== el) current.classList.remove("is-open");
    current = el;
    el.classList.add("is-open");
    el.setAttribute("aria-describedby", "tipBubble");
    titleEl.textContent = t.title;
    defEl.textContent = t.def;

    bubble.classList.remove("is-on");
    bubble.style.left = "0px";
    bubble.style.top = "0px";
    var r = el.getBoundingClientRect();
    var b = bubble.getBoundingClientRect();
    var x = r.left + r.width / 2 - b.width / 2;
    x = Math.max(12, Math.min(x, window.innerWidth - b.width - 12));
    var above = r.top - b.height - 14 > 70;
    var y = above ? r.top - b.height - 14 : r.bottom + 14;
    bubble.style.left = x + "px";
    bubble.style.top = y + "px";
    bubble.dataset.side = above ? "top" : "bottom";
    arrow.style.left = Math.max(16, Math.min(r.left + r.width / 2 - x, b.width - 16)) + "px";
    void bubble.offsetWidth;
    bubble.classList.add("is-on");
  }

  function hide() {
    hideTimer = setTimeout(function () {
      bubble.classList.remove("is-on");
      if (current) { current.classList.remove("is-open"); current.removeAttribute("aria-describedby"); }
      current = null;
    }, 90);
  }

  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest && e.target.closest(".tip");
    if (el) show(el);
  });
  document.addEventListener("mouseout", function (e) {
    var el = e.target.closest && e.target.closest(".tip");
    if (el && !el.contains(e.relatedTarget)) hide();
  });
  document.addEventListener("focusin", function (e) { if (e.target.classList && e.target.classList.contains("tip")) show(e.target); });
  document.addEventListener("focusout", function (e) { if (e.target.classList && e.target.classList.contains("tip")) hide(); });
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest(".tip");
    if (el) { e.preventDefault(); if (current === el && bubble.classList.contains("is-on")) hide(); else show(el); }
    else if (current) hide();
  });
  window.addEventListener("scroll", function () { if (current) hide(); }, { passive: true });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
})();
