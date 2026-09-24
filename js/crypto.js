/* ==========================================================================
   crypto.js - hash playground, key pair demo and signature lab
   Uses window.sha256 (js/sha256.js). Keys and signatures here are a
   teaching simulation built from SHA-256, not real elliptic-curve maths.
   ========================================================================== */

(function () {
  "use strict";
  var H = window.sha256;
  if (typeof H !== "function") return;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- explain-it toggle ---------------- */
  var modeBtns = Array.prototype.slice.call(document.querySelectorAll(".cx-mode__btn"));
  modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.dataset.mode;
      modeBtns.forEach(function (b) { var on = b === btn; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
      document.querySelectorAll(".cx-section [data-show]").forEach(function (el) { el.hidden = el.dataset.show !== mode; });
      document.querySelector(".cx-mode").dataset.mode = mode;
    });
  });

  /* ---------------- scramble text effect ---------------- */
  var HEX = "0123456789abcdef";
  function scramble(el, finalText, cls) {
    if (reduce.matches) { el.textContent = finalText; return; }
    var frame = 0, total = 14;
    clearInterval(el._t);
    el._t = setInterval(function () {
      frame++;
      var reveal = Math.floor(finalText.length * frame / total);
      var out = finalText.slice(0, reveal);
      for (var i = reveal; i < finalText.length; i++) out += HEX[(Math.random() * 16) | 0];
      el.textContent = out;
      if (frame >= total) { clearInterval(el._t); el.textContent = finalText; if (cls) el.classList.add(cls); }
    }, 28);
  }

  function bytes(str) { return unescape(encodeURIComponent(str)).length; }

  /* ---------------- 01 hash playground ---------------- */
  var hashIn = $("hashIn"), hashOut = $("hashOut"), hashBits = $("hashBits"), hashBytes = $("hashBytes");
  var BOOK = new Array(60).join("It was the best of times, it was the worst of times. ");
  var cells = [];
  for (var c = 0; c < 64; c++) { var s = document.createElement("span"); hashBits.appendChild(s); cells.push(s); }

  function paintBits(h) {
    for (var i = 0; i < 64; i++) {
      var v = parseInt(h[i], 16);
      cells[i].style.setProperty("--v", (v / 15).toFixed(2));
      cells[i].className = v > 11 ? "is-hi" : v > 5 ? "is-mid" : "";
    }
  }

  function updateHash() {
    var text = hashIn.value;
    var h = H(text);
    var n = bytes(text);
    hashBytes.textContent = n.toLocaleString() + (n === 1 ? " byte" : " bytes");
    scramble(hashOut, h);
    paintBits(h);
    hashOut.parentElement.classList.remove("is-pulse"); void hashOut.offsetWidth; hashOut.parentElement.classList.add("is-pulse");
    if ($("avalanche").checked) updateAvalanche();
  }

  function flipLast(t) {
    if (!t.length) return "a";
    var ch = t[t.length - 1];
    var next = ch === "z" ? "y" : ch === "Z" ? "Y" : String.fromCharCode(ch.charCodeAt(0) + 1);
    return t.slice(0, -1) + next;
  }

  function updateAvalanche() {
    var a = hashIn.value, b = flipLast(a);
    var ha = H(a), hb = H(b), diff = 0, htmlA = "", htmlB = "";
    for (var i = 0; i < 64; i++) {
      var same = ha[i] === hb[i];
      if (!same) diff++;
      htmlA += same ? ha[i] : "<b>" + ha[i] + "</b>";
      htmlB += same ? hb[i] : "<b>" + hb[i] + "</b>";
    }
    var show = function (t) { return t.length > 28 ? "“" + t.slice(0, 12) + "…" + t.slice(-12) + "”" : "“" + t + "”"; };
    $("avA").textContent = show(a);
    $("avB").textContent = show(b);
    $("avHashA").innerHTML = htmlA;
    $("avHashB").innerHTML = htmlB;
    var pct = Math.round(diff / 64 * 100);
    $("avPct").textContent = pct + "%";
    $("avMeter").style.width = pct + "%";
  }

  var hashTimer;
  hashIn.addEventListener("input", function () { clearTimeout(hashTimer); hashTimer = setTimeout(updateHash, 90); });
  document.querySelectorAll("[data-preset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      hashIn.value = btn.dataset.preset === "book" ? BOOK : btn.dataset.preset;
      updateHash();
    });
  });
  $("avalanche").addEventListener("change", function () {
    $("avalancheBox").hidden = !this.checked;
    if (this.checked) updateAvalanche();
  });
  updateHash();

  /* ---------------- 02 key pair ---------------- */
  var priv = "", pub = "";
  function randomHex(n) {
    var out = "", arr = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    for (var i = 0; i < n; i++) out += ("0" + arr[i].toString(16)).slice(-2);
    return out;
  }
  function genKeys() {
    priv = randomHex(32);
    pub = "04" + H("pub:" + priv) + H("pub2:" + priv);
    var addr = "0x" + H("addr:" + pub).slice(-40);
    scramble($("kPriv"), "0x" + priv);
    setTimeout(function () { scramble($("kPub"), "0x" + pub.slice(0, 40) + "…" + pub.slice(-8)); }, 250);
    setTimeout(function () { scramble($("kAddr"), addr.slice(0, 8) + "…" + addr.slice(-6)); }, 500);
    document.querySelectorAll(".keyarrow").forEach(function (a, i) {
      a.classList.remove("is-run"); void a.offsetWidth;
      setTimeout(function () { a.classList.add("is-run"); }, 150 + i * 250);
    });
    resetSig();
  }
  $("kGen").addEventListener("click", genKeys);
  $("kPeek").addEventListener("click", function () {
    var v = $("kPriv"), hidden = v.classList.toggle("is-blurred");
    this.lastChild.textContent = hidden ? " Show" : " Hide";
  });
  genKeys();

  /* ---------------- 03 signature lab ---------------- */
  var demo = $("sigDemo"), sigOut = $("sigOut"), result = $("sigResult"), msg = $("sigMsg"), tamper = $("sigTamper");
  var signedMsg = null, signature = null;

  function sign(m) { return H("sig:" + priv + ":" + H(m)); }
  function currentMsg() { return tamper.checked ? signedMsg.replace(/\b10\b/, "1000") : msg.value; }

  function setResult(state, text) {
    demo.dataset.state = state;
    result.className = "sigresult is-" + state;
    result.querySelector("p").innerHTML = text;
    result.classList.remove("is-pop"); void result.offsetWidth; result.classList.add("is-pop");
  }
  function resetSig() {
    signedMsg = null; signature = null;
    if (!sigOut) return;
    sigOut.textContent = "Not signed yet";
    tamper.checked = false;
    setResult("idle", "Sign the message, then verify it.");
  }

  $("sigSign").addEventListener("click", function () {
    tamper.checked = false;
    signedMsg = msg.value;
    signature = sign(signedMsg);
    scramble(sigOut, "0x" + signature + signature.slice(0, 32).split("").reverse().join(""));
    setResult("signed", "Signed! The signature was made with your private key, which <b>never left the wallet</b>. Now press Verify.");
  });

  tamper.addEventListener("change", function () {
    if (!signedMsg) { tamper.checked = false; setResult("idle", "Sign the message first, then try tampering with it."); return; }
    msg.value = tamper.checked ? signedMsg.replace(/\b10\b/, "1000") : signedMsg;
    if (msg.value === signedMsg && tamper.checked) msg.value = signedMsg + " (edited)";
    msg.classList.toggle("is-tampered", tamper.checked);
    setResult("signed", tamper.checked ? "Message changed after signing. Press Verify to see what the network thinks." : "Back to the original message. Press Verify.");
  });

  msg.addEventListener("input", function () { if (signedMsg && msg.value !== signedMsg) msg.classList.add("is-tampered"); else msg.classList.remove("is-tampered"); });

  $("sigVerify").addEventListener("click", function () {
    if (!signature) { setResult("idle", "Nothing to check yet. Sign the message first."); return; }
    var ok = sign(msg.value) === signature;
    if (ok) setResult("valid", "<b>Valid signature.</b> The public key confirms the owner of this address approved exactly this message.");
    else setResult("invalid", "<b>Invalid signature.</b> The message no longer matches what was signed, so every node rejects it.");
  });
  resetSig();
})();
