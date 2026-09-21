/* ==========================================================================
   wallet.js — optional browser-wallet connection
   --------------------------------------------------------------------------
   Talks to the wallet directly over EIP-1193 (`request`, `on`) with no
   library. Wallets are discovered with EIP-6963, the announcement standard
   that replaced fighting over `window.ethereum` when several wallets are
   installed at once; `window.ethereum` is kept as a fallback.

   The page only ever *reads*: it asks for an address, a chain id and a
   balance. It never requests a signature, a transaction or an approval.
   ========================================================================== */

(function () {
  "use strict";

  var connectBtn = document.getElementById("connectBtn");
  if (!connectBtn) return;

  var connectText  = document.getElementById("connectBtnText");
  var disconnectBtn = document.getElementById("disconnectBtn");
  var copyBtn      = document.getElementById("copyBtn");
  var copyFlash    = document.getElementById("copyFlash");
  var statusEl     = document.getElementById("walletStatus");
  var statusText   = document.getElementById("walletStatusText");
  var addressEl    = document.getElementById("walletAddress");
  var hintEl       = document.getElementById("walletHint");
  var avatarEl     = document.getElementById("walletAvatar");
  var networkEl    = document.getElementById("walletNetwork");
  var chainIdEl    = document.getElementById("walletChainId");
  var balanceEl    = document.getElementById("walletBalance");
  var messageEl    = document.getElementById("walletMessage");
  var providersEl  = document.getElementById("walletProviders");

  /* Chain id (decimal) -> [display name, native currency symbol] */
  var CHAINS = {
    1: ["Ethereum Mainnet", "ETH"],
    10: ["OP Mainnet", "ETH"],
    56: ["BNB Smart Chain", "BNB"],
    137: ["Polygon", "POL"],
    8453: ["Base", "ETH"],
    42161: ["Arbitrum One", "ETH"],
    43114: ["Avalanche C-Chain", "AVAX"],
    11155111: ["Sepolia testnet", "SepoliaETH"],
    84532: ["Base Sepolia testnet", "ETH"],
    31337: ["Local dev chain", "ETH"]
  };

  var discovered = [];   /* EIP-6963 providers: { info, provider } */
  var active = null;     /* the provider we are currently talking to */
  var account = null;

  /* ----------------------------------------------------------------------
     Discovery (EIP-6963)
     ---------------------------------------------------------------------- */

  window.addEventListener("eip6963:announceProvider", function (event) {
    var detail = event.detail;
    if (!detail || !detail.info || !detail.provider) return;
    var known = discovered.some(function (item) { return item.info.uuid === detail.info.uuid; });
    if (!known) discovered.push({ info: detail.info, provider: detail.provider });
  });

  window.dispatchEvent(new Event("eip6963:requestProvider"));

  function fallbackProvider() {
    return typeof window.ethereum !== "undefined" ? window.ethereum : null;
  }

  function hasAnyWallet() {
    return discovered.length > 0 || !!fallbackProvider();
  }

  /* ----------------------------------------------------------------------
     Rendering
     ---------------------------------------------------------------------- */

  function setStatus(state, text) {
    statusEl.dataset.state = state;
    statusText.textContent = text;
  }

  function say(text, tone) {
    messageEl.innerHTML = text || "";
    if (tone) messageEl.dataset.tone = tone;
    else messageEl.removeAttribute("data-tone");
  }

  function shorten(address) {
    return address.slice(0, 6) + "…" + address.slice(-4);
  }

  /* A deterministic identicon: the address bytes decide which cells of a
     mirrored 5x5 grid are filled, and the hue. Same address, same picture,
     everywhere — the same idea wallets use for their little avatars. */
  function drawAvatar(address) {
    var clean = address.replace(/^0x/, "").toLowerCase();
    var hue = parseInt(clean.slice(0, 6), 16) % 360;
    var cells = "";

    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 3; col++) {
        var nibble = parseInt(clean.charAt(row * 3 + col) || "0", 16);
        if (nibble % 2 === 0) continue;
        var opacity = 0.55 + (nibble / 15) * 0.45;
        cells += '<rect x="' + col + '" y="' + row + '" width="1" height="1" opacity="' + opacity.toFixed(2) + '"/>';
        if (col < 2) {
          cells += '<rect x="' + (4 - col) + '" y="' + row + '" width="1" height="1" opacity="' + opacity.toFixed(2) + '"/>';
        }
      }
    }

    avatarEl.innerHTML =
      '<svg viewBox="0 0 5 5" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">' +
        '<rect width="5" height="5" fill="hsl(' + hue + ' 70% 94%)"/>' +
        '<g fill="hsl(' + hue + ' 72% 42%)">' + cells + "</g>" +
      "</svg>";
  }

  function clearAvatar() { avatarEl.innerHTML = ""; }

  /* wei (hex string) -> a short decimal string, using BigInt so nothing is
     lost to floating point. Balances are 18 decimals wide. */
  function formatEther(hexWei) {
    try {
      var wei = BigInt(hexWei);
      var whole = wei / 1000000000000000000n;
      var frac = (wei % 1000000000000000000n).toString().padStart(18, "0").slice(0, 4);
      return whole.toString() + "." + frac;
    } catch (error) {
      return "—";
    }
  }

  function showDisconnected() {
    account = null;
    setStatus("idle", "Not connected");
    addressEl.textContent = "0x000…0000";
    addressEl.style.opacity = "0.4";
    hintEl.textContent = "Your public address — safe to share. It is derived from your public key.";
    networkEl.textContent = "—";
    chainIdEl.textContent = "—";
    balanceEl.textContent = "—";
    connectText.textContent = "Connect wallet";
    connectBtn.hidden = false;
    disconnectBtn.hidden = true;
    copyBtn.hidden = true;
    clearAvatar();
  }

  function showConnected(address) {
    account = address;
    setStatus("connected", "Connected");
    addressEl.textContent = shorten(address);
    addressEl.title = address;
    addressEl.style.opacity = "1";
    hintEl.textContent = "This is a real, public address. Anyone can look up its full history on a block explorer.";
    connectBtn.hidden = true;
    disconnectBtn.hidden = false;
    copyBtn.hidden = false;
    drawAvatar(address);
  }

  /* ----------------------------------------------------------------------
     Reading the chain
     ---------------------------------------------------------------------- */

  function refreshChainData() {
    if (!active || !account) return;

    active.request({ method: "eth_chainId" }).then(function (hexChainId) {
      var id = parseInt(hexChainId, 16);
      var known = CHAINS[id];
      chainIdEl.textContent = String(id);
      networkEl.textContent = known ? known[0] : "Unrecognised network";
      balanceEl.dataset.symbol = known ? known[1] : "native";

      return active.request({ method: "eth_getBalance", params: [account, "latest"] });
    }).then(function (hexWei) {
      var symbol = balanceEl.dataset.symbol || "ETH";
      balanceEl.innerHTML = formatEther(hexWei) + ' <span class="unit">' + symbol + "</span>";
    }).catch(function () {
      balanceEl.textContent = "unavailable";
      say("Connected, but the wallet would not return a balance. That usually means its network endpoint is unreachable.", "error");
    });
  }

  /* ----------------------------------------------------------------------
     Connecting
     ---------------------------------------------------------------------- */

  function attach(provider) {
    if (active === provider || !provider || !provider.on) return;
    active = provider;

    provider.on("accountsChanged", function (accounts) {
      if (!accounts || !accounts.length) {
        showDisconnected();
        say("The wallet disconnected this site.", null);
        return;
      }
      showConnected(accounts[0]);
      refreshChainData();
    });

    provider.on("chainChanged", function () {
      /* The account stays valid across a network switch; only the read-outs
         need refreshing. Reloading the page here is the common shortcut. */
      say("Network switched — re-reading the chain.", null);
      refreshChainData();
    });
  }

  function connect(provider) {
    if (!provider) {
      say(
        'No browser wallet found. Install <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask</a> ' +
        "(or any EIP-1193 wallet) and reload this page. Everything else here works without one.",
        "error"
      );
      setStatus("error", "No wallet found");
      return;
    }

    attach(provider);
    setStatus("pending", "Waiting for you");
    say("Check your wallet — it is asking whether to reveal your address to this page.");
    connectBtn.disabled = true;
    connectText.textContent = "Check your wallet…";

    provider.request({ method: "eth_requestAccounts" }).then(function (accounts) {
      if (!accounts || !accounts.length) throw { code: 4001 };
      showConnected(accounts[0]);
      refreshChainData();
      say("Connected. No password, no sign-up, no data sent anywhere — your wallet simply vouched for you.", "success");
      providersEl.hidden = true;
    }).catch(function (error) {
      var code = error && error.code;
      if (code === 4001) {
        say("Request rejected — which is exactly the right instinct when you are not sure. Nothing happened.", null);
        setStatus("idle", "Not connected");
      } else if (code === -32002) {
        say("Your wallet already has a pending request. Open the extension and answer it first.", "error");
        setStatus("pending", "Request pending");
      } else {
        say("Could not connect: " + ((error && error.message) || "unknown error"), "error");
        setStatus("error", "Connection failed");
      }
    }).then(function () {
      connectBtn.disabled = false;
      if (!account) connectText.textContent = "Connect wallet";
    });
  }

  /* When several wallets announce themselves, let the visitor pick. */
  function offerChoice() {
    providersEl.innerHTML = '<p class="label">Choose a wallet</p>';

    discovered.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "provider";
      button.innerHTML =
        '<img src="' + item.info.icon + '" alt="" />' +
        "<span>" + item.info.name + "</span>";
      button.addEventListener("click", function () { connect(item.provider); });
      providersEl.appendChild(button);
    });

    providersEl.hidden = false;
    say("More than one wallet is installed. Which one should this page talk to?");
  }

  /* ----------------------------------------------------------------------
     Events
     ---------------------------------------------------------------------- */

  connectBtn.addEventListener("click", function () {
    if (discovered.length > 1) { offerChoice(); return; }
    if (discovered.length === 1) { connect(discovered[0].provider); return; }
    connect(fallbackProvider());
  });

  /* A site cannot revoke its own permission in every wallet, so this clears
     the page's own state and tells the truth about the rest. */
  disconnectBtn.addEventListener("click", function () {
    var provider = active;
    showDisconnected();
    say("Disconnected from this page. The permission itself lives in your wallet — remove this site there to revoke it fully.");

    if (provider && provider.request) {
      provider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }]
      }).catch(function () { /* not supported by every wallet; harmless */ });
    }
  });

  copyBtn.addEventListener("click", function () {
    if (!account || !navigator.clipboard) return;
    navigator.clipboard.writeText(account).then(function () {
      copyFlash.classList.add("is-on");
      setTimeout(function () { copyFlash.classList.remove("is-on"); }, 1600);
    }).catch(function () {
      say("Clipboard blocked by the browser — the full address is " + account);
    });
  });

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  showDisconnected();

  /* Give wallets a moment to announce, then reconnect silently if this site
     is already authorised. eth_accounts never prompts. */
  setTimeout(function () {
    if (!hasAnyWallet()) {
      setStatus("idle", "No wallet detected");
      say(
        'This browser has no wallet extension. The section is optional — or install ' +
        '<a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask</a> to try it.'
      );
      return;
    }

    var provider = discovered.length ? discovered[0].provider : fallbackProvider();
    attach(provider);

    provider.request({ method: "eth_accounts" }).then(function (accounts) {
      if (accounts && accounts.length) {
        showConnected(accounts[0]);
        refreshChainData();
        say("Reconnected automatically — you already granted this page permission.", "success");
      }
    }).catch(function () { /* wallet locked or unavailable: stay disconnected */ });
  }, 350);
})();
