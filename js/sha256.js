/* ==========================================================================
   sha256.js — a small, synchronous SHA-256
   --------------------------------------------------------------------------
   The browser ships crypto.subtle.digest, but it is asynchronous and is only
   available in a secure context — so it fails silently when someone opens
   index.html straight from disk. The chain demo needs to hash hundreds of
   thousands of times while staying responsive, so a plain synchronous
   implementation of FIPS 180-4 is the better fit here.

   Exposes: window.sha256(string) -> 64-character lowercase hex string
   ========================================================================== */

(function (global) {
  "use strict";

  /* First 32 bits of the fractional parts of the cube roots of the first
     64 primes — the SHA-256 round constants. */
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);

  var HEX = "0123456789abcdef";

  /* Scratch buffers are reused between calls: mining hashes the same short
     message hundreds of thousands of times, so allocation would dominate. */
  var w = new Uint32Array(64);
  var H = new Uint32Array(8);

  function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
  }

  /* UTF-8 encode without TextEncoder, so this works in any context. */
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      } else if (c < 0xd800 || c >= 0xe000) {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      } else {
        /* surrogate pair */
        i++;
        var cp = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 63),
          0x80 | ((cp >> 6) & 63),
          0x80 | (cp & 63)
        );
      }
    }
    return out;
  }

  function sha256(message) {
    var bytes = utf8Bytes(String(message));
    var len = bytes.length;

    /* Pad to a multiple of 64 bytes: 0x80, then zeros, then a 64-bit
       big-endian bit length in the final eight bytes. */
    var blocks = Math.ceil((len + 9) / 64);
    var total = blocks * 64;
    var buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;

    var view = new DataView(buf.buffer);
    var bitsHi = Math.floor(len / 536870912);        /* (len * 8) >>> 32 */
    var bitsLo = (len * 8) >>> 0;
    view.setUint32(total - 8, bitsHi);
    view.setUint32(total - 4, bitsLo);

    /* First 32 bits of the fractional parts of the square roots of the
       first eight primes. */
    H[0] = 0x6a09e667; H[1] = 0xbb67ae85; H[2] = 0x3c6ef372; H[3] = 0xa54ff53a;
    H[4] = 0x510e527f; H[5] = 0x9b05688c; H[6] = 0x1f83d9ab; H[7] = 0x5be0cd19;

    for (var b = 0; b < blocks; b++) {
      var off = b * 64;
      var t;

      for (t = 0; t < 16; t++) w[t] = view.getUint32(off + t * 4);

      for (t = 16; t < 64; t++) {
        var x = w[t - 15];
        var y = w[t - 2];
        var s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
        var s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }

      var a = H[0], bb = H[1], c = H[2], d = H[3],
          e = H[4], f = H[5], g = H[6], h = H[7];

      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & bb) ^ (a & c) ^ (bb & c);
        var t2 = (S0 + maj) >>> 0;

        h = g; g = f; f = e;
        e = (d + t1) >>> 0;
        d = c; c = bb; bb = a;
        a = (t1 + t2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0;  H[1] = (H[1] + bb) >>> 0;
      H[2] = (H[2] + c) >>> 0;  H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;  H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;  H[7] = (H[7] + h) >>> 0;
    }

    /* Serialise the eight words as lowercase hex. */
    var hex = "";
    for (var i = 0; i < 8; i++) {
      var v = H[i];
      for (var shift = 28; shift >= 0; shift -= 4) {
        hex += HEX[(v >>> shift) & 0xf];
      }
    }
    return hex;
  }

  global.sha256 = sha256;
})(window);
