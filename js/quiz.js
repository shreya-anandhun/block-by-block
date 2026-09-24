/* ==========================================================================
   quiz.js - five-question myth-busting quiz with palette confetti
   ========================================================================== */

(function () {
  "use strict";

  var card = document.getElementById("qCard");
  if (!card) return;

  var QUESTIONS = [
    {
      topic: "Crypto",
      q: "Is Web3 only about cryptocurrency?",
      options: [
        "Yes, it’s just coins and trading",
        "No. Crypto is one use; Web3 is also about ownership, identity, voting and more",
        "It’s only about NFTs"
      ],
      answer: 1,
      fact: "Currency was the first app, not the whole point. The core idea is a shared record with built-in ownership rules, used for identity, voting, tickets, digital art and more."
    },
    {
      topic: "Privacy",
      q: "Are blockchains completely anonymous?",
      options: [
        "Yes, nobody can ever trace anything",
        "Only banks can see the transactions",
        "Not really. There are no names, but every transaction is public forever"
      ],
      answer: 2,
      fact: "Blockchains are pseudonymous: your address isn’t your name, but everything it does is public. Link that address to you once, say through an exchange, and its whole history can be traced."
    },
    {
      topic: "NFTs",
      q: "You buy an NFT of a painting. What do you actually own?",
      options: [
        "A token on the blockchain that records you own that item",
        "The copyright to the painting",
        "The original physical painting"
      ],
      answer: 0,
      fact: "An NFT is a record in a smart contract that points to a file. The copyright usually stays with the artist unless the licence says it’s transferred to you."
    },
    {
      topic: "Energy",
      q: "Does every blockchain use huge amounts of energy?",
      options: [
        "Yes, every single one does",
        "No. It depends on how the network agrees; Proof of Stake uses very little",
        "Blockchains use no energy at all"
      ],
      answer: 1,
      fact: "The big energy use comes from Proof of Work mining. When Ethereum switched to Proof of Stake in 2022, its energy use fell by roughly 99.95%."
    },
    {
      topic: "Contracts",
      q: "What is a smart contract?",
      options: [
        "A legal document signed by a lawyer",
        "A contract written by artificial intelligence",
        "A program on the blockchain that runs automatically when conditions are met"
      ],
      answer: 2,
      fact: "It’s code, not a legal contract. It does exactly what it was programmed to do, every time, even if that isn’t what its author meant. That’s why good contracts get audited."
    }
  ];

  var CHEERS_RIGHT = [
    "Nailed it! You just busted a myth.",
    "Sharp thinking. You’re getting the hang of this.",
    "Spot on! That one fools a lot of people.",
    "Yes! You’re thinking like a Web3 insider.",
    "Perfect. Myth officially busted."
  ];
  var CHEERS_WRONG = [
    "Good guess! Most people pick that one, and now you know better.",
    "Not quite, but that’s exactly how learning works.",
    "Close! Keep going, you’ve got the next one.",
    "No worries. This myth is everywhere, and you just saw through it.",
    "Almost! Now you know something most people don’t."
  ];
  var RANKS = ["Curious beginner", "Curious beginner", "Rising explorer", "Rising explorer", "Web3 insider", "Myth-buster legend"];

  var LETTERS = ["A", "B", "C", "D"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var scoreEl = document.getElementById("qScore");
  var rankEl = document.getElementById("qRank");
  var ringFill = document.getElementById("qRingFill");
  var steps = Array.prototype.slice.call(document.querySelectorAll("#qSteps li"));
  var RING = 2 * Math.PI * 50;

  var index = 0;
  var score = 0;
  var results = [];

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var ICON_SPARK = '<svg viewBox="-10 -10 20 20" aria-hidden="true"><path fill="currentColor" d="M0 -9 C1.2 -2.4 2.4 -1.2 9 0 C2.4 1.2 1.2 2.4 0 9 C-1.2 2.4 -2.4 1.2 -9 0 C-2.4 -1.2 -1.2 -2.4 0 -9Z"/></svg>';

  function updateSide() {
    scoreEl.textContent = String(score);
    ringFill.style.strokeDasharray = RING;
    ringFill.style.strokeDashoffset = RING * (1 - score / QUESTIONS.length);
    rankEl.textContent = RANKS[score];
    steps.forEach(function (li, i) {
      li.className = results[i] === true ? "is-right" : results[i] === false ? "is-wrong" : i === index ? "is-current" : "";
    });
  }

  function swap(build) {
    card.classList.add("is-leaving");
    setTimeout(function () {
      card.innerHTML = "";
      build();
      card.classList.remove("is-leaving");
      card.classList.remove("is-entering");
      void card.offsetWidth;
      card.classList.add("is-entering");
    }, reduceMotion.matches ? 0 : 220);
  }

  function renderQuestion() {
    var item = QUESTIONS[index];

    var head = el("div", "qcard__head");
    head.appendChild(el("span", "qcard__count", "Question <strong>" + (index + 1) + "</strong> of " + QUESTIONS.length));
    head.appendChild(el("span", "qcard__tag", ICON_SPARK + "Myth check · " + item.topic));
    card.appendChild(head);

    var bar = el("div", "qbar");
    var fill = el("span", "qbar__fill");
    fill.style.width = (index / QUESTIONS.length) * 100 + "%";
    bar.appendChild(fill);
    card.appendChild(bar);
    requestAnimationFrame(function () { fill.style.width = ((index + 1) / QUESTIONS.length) * 100 + "%"; });

    card.appendChild(el("h3", "qcard__q", item.q));

    var list = el("div", "qopts");
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Answers");
    item.options.forEach(function (text, i) {
      var btn = el("button", "qopt", '<span class="qopt__letter">' + LETTERS[i] + '</span><span class="qopt__text">' + text + '</span><span class="qopt__mark"></span>');
      btn.type = "button";
      btn.style.setProperty("--i", i);
      btn.addEventListener("click", function (event) { choose(i, btn, event); });
      list.appendChild(btn);
    });
    card.appendChild(list);

    card.appendChild(el("div", "qfeedback"));
    updateSide();
  }

  function choose(choice, btn, event) {
    var item = QUESTIONS[index];
    var right = choice === item.answer;
    var buttons = Array.prototype.slice.call(card.querySelectorAll(".qopt"));

    buttons.forEach(function (b, i) {
      b.disabled = true;
      if (i === item.answer) { b.classList.add("is-correct"); b.querySelector(".qopt__mark").innerHTML = ICON_CHECK; }
      else if (i === choice) { b.classList.add("is-wrong"); b.querySelector(".qopt__mark").innerHTML = ICON_X; }
      else b.classList.add("is-dim");
    });

    results[index] = right;
    if (right) score++;
    updateSide();

    var cheers = right ? CHEERS_RIGHT : CHEERS_WRONG;
    var fb = card.querySelector(".qfeedback");
    fb.className = "qfeedback is-open " + (right ? "is-right" : "is-wrong");
    fb.innerHTML =
      '<p class="qfeedback__verdict">' + (right ? ICON_CHECK + "Correct!" : ICON_X + "Not quite") + '</p>' +
      '<p class="qfeedback__cheer">' + cheers[index % cheers.length] + '</p>' +
      '<div class="qfact"><span class="qfact__label">' + ICON_SPARK + 'The fact</span><p>' + item.fact + '</p></div>';

    var next = el("button", "btn btn--primary qnext", index < QUESTIONS.length - 1 ? "Next question →" : "See my result →");
    next.type = "button";
    next.addEventListener("click", function () {
      index++;
      if (index < QUESTIONS.length) swap(renderQuestion);
      else swap(renderResult);
    });
    fb.appendChild(next);

    if (right) {
      var r = btn.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2, 90);
    }
    setTimeout(function () {
      var rect = fb.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        window.scrollBy({ top: rect.bottom - window.innerHeight + 24, behavior: reduceMotion.matches ? "auto" : "smooth" });
      }
    }, 120);
  }

  function renderResult() {
    index = QUESTIONS.length;
    updateSide();
    var total = QUESTIONS.length;
    var msg = score === total ? "A perfect score. You can explain Web3 better than most people who talk about it."
            : score >= 3 ? "Great work. You’ve got the fundamentals, and you just busted " + score + " myths."
            : "Every expert started exactly here. Read the facts again and give it another go, you’ve got this.";

    var wrap = el("div", "qresult");
    wrap.innerHTML =
      '<div class="qbadge" aria-hidden="true">' +
        '<svg viewBox="0 0 120 120"><path class="qbadge__shape" d="M60 6 L104 30 V70 C104 92 84 108 60 114 C36 108 16 92 16 70 V30 Z"/>' +
        '<path class="qbadge__inner" d="M60 18 L94 37 V70 C94 87 79 99 60 104 C41 99 26 87 26 70 V37 Z"/></svg>' +
        '<span class="qbadge__score">' + score + '<small>/' + total + '</small></span>' +
      '</div>' +
      '<p class="qresult__rank">' + RANKS[score] + '</p>' +
      '<h3 class="qresult__title">' + (score >= 3 ? "Myths busted!" : "Nice try!") + '</h3>' +
      '<p class="qresult__msg">' + msg + '</p>';

    var recap = el("ul", "qrecap");
    QUESTIONS.forEach(function (q, i) {
      recap.appendChild(el("li", results[i] ? "is-right" : "is-wrong", (results[i] ? ICON_CHECK : ICON_X) + "<span>" + q.q + "</span>"));
    });
    wrap.appendChild(recap);

    var again = el("button", "btn btn--primary qnext", "Try again ↺");
    again.type = "button";
    again.addEventListener("click", function () {
      index = 0; score = 0; results = [];
      swap(renderQuestion);
    });
    wrap.appendChild(again);
    card.appendChild(wrap);

    if (score >= 3) {
      var r = card.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height * 0.3, 220, true);
    }
  }

  /* ----------------------------------------------------------------------
     Confetti in the page palette
     ---------------------------------------------------------------------- */

  var canvas = document.getElementById("confetti");
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var pieces = [];
  var running = false;

  function paletteColours() {
    var cs = getComputedStyle(document.documentElement);
    return ["--gold", "--gold-hi", "--accent", "--ink", "--gold"].map(function (v) { return cs.getPropertyValue(v).trim() || "#f5c542"; });
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function confetti(x, y, count, big) {
    if (!ctx || reduceMotion.matches) return;
    resize();
    var colours = paletteColours();
    for (var i = 0; i < count; i++) {
      var angle = big ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      var speed = (big ? 6 : 5) + Math.random() * (big ? 9 : 7);
      pieces.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (big ? 3 : 2),
        size: 5 + Math.random() * 7,
        colour: colours[i % colours.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        shape: i % 5 === 0 ? "spark" : i % 3 === 0 ? "dot" : "rect",
        life: 0,
        max: 90 + Math.random() * 60
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function drawSpark(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.15, -s * 0.15, s, 0);
    ctx.quadraticCurveTo(s * 0.15, s * 0.15, 0, s);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.15, -s, 0);
    ctx.quadraticCurveTo(-s * 0.15, -s * 0.15, 0, -s);
    ctx.fill();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces = pieces.filter(function (p) { return p.life < p.max && p.y < window.innerHeight + 40; });
    pieces.forEach(function (p) {
      p.life++;
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.colour;
      if (p.shape === "spark") drawSpark(p.size);
      else if (p.shape === "dot") { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (pieces.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  renderQuestion();
})();
