# Block by Block: a field guide to Web3

**Block by Block is a free, interactive website that explains Web3 to complete beginners in plain English.**
It walks you through what changed from Web1 to Web3, the maths that makes blockchains trustworthy,
the six ideas behind every Web3 headline, and what really happens when you press "Send".
Instead of just describing these ideas, the page lets you try them: hash your own text, generate a
key pair, sign and tamper with a transaction, take a myth-busting quiz, and connect a real browser wallet.

**Live site:** [shreya-anandhun.github.io/block-by-block](https://shreya-anandhun.github.io/block-by-block/)

| | |
| --- | --- |
| **Who it is for** | Anyone curious about Web3 who has never used it. No crypto knowledge needed. |
| **What you get** | 7 short chapters, 10 key terms decoded, a 5-question quiz, and hands-on demos. |
| **How long it takes** | About 15 to 20 minutes to read from top to bottom. |
| **What it is built with** | Hand-written HTML, CSS and vanilla JavaScript. No framework, no build step, no trackers. |
| **What it is not** | It sells nothing, asks for nothing, and is not financial advice. |

---

## What's on the page

The site is one long page split into seven chapters. Each chapter answers one question and ends with
something you can try.

| # | Chapter | The question it answers | What you can do there |
| --- | --- | --- | --- |
| 01 | **The shift** | Who holds the database? | Switch between Web1 (read), Web2 (write) and Web3 (own) in a mock app window. Ends with a "Reality check" on why most real products are a mix of Web2 and Web3. |
| 02 | **Hashes, keys & signatures** | What maths makes Web3 trustworthy? | Type into a live SHA-256 playground, run the avalanche test, generate a key pair, then sign a transaction and watch verification fail when an attacker edits it. Every explanation has a "Simply" and a "Technically" version. |
| 03 | **The Big 6** | What do the buzzwords actually mean? | Open cards on decentralisation, consensus, smart contracts, tokens & NFTs, DAOs, and wallets & keys. Each has a plain explanation and four key terms. |
| 04 | **What actually happens in Web3** | What happens after I press "Send"? | Follow one transaction through eight steps, from your wallet's signature to a new block on the chain, with Web2 and Web3 compared side by side. |
| 05 | **Myth or fact? Quiz time** | What do people get wrong? | Answer five questions on crypto, privacy, NFTs, energy and smart contracts. You get the real story after each answer and a rank at the end. |
| 06 | **Say hello with a wallet** | What does "log in with a wallet" mean? | Connect MetaMask or another browser wallet and see your address, network and balance read straight from the chain. |
| 07 | **Crack the code words** | What does this jargon mean? | Decode ten terms (address, gas & gwei, EVM, seed phrase, node, mempool, finality, testnet, bridge, rug pull), each with an everyday comparison and an example. |

Across the whole page, key words such as *smart contract*, *NFT* and *dApp* are highlighted. Hover or
tap one to see a one-line definition without leaving the paragraph.

---

## How the interactive parts work

### Hash playground, keys and signature lab (chapter 02)

- **Hashing is real.** The playground uses a small synchronous SHA-256 written for this project
  ([`js/sha256.js`](js/sha256.js)) and checked against the FIPS 180-4 test vectors. It is used
  instead of the browser's `crypto.subtle` because that API is asynchronous and does not work when
  `index.html` is opened straight from disk.
- **Keys and signatures are a teaching simulation.** Real wallets use elliptic-curve maths
  (secp256k1 and ECDSA). The demo builds its keys and signatures from SHA-256 so the one-way
  behaviour is visible and easy to follow. The page says so, and the values are never usable for
  real funds.

### Wallet connection (chapter 06)

The wallet section talks to the wallet directly through the
[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) provider interface, with no library.

- **Finds every installed wallet.** It listens for [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)
  announcements and shows a chooser when several wallets are installed. `window.ethereum` is kept as
  a fallback for older wallets.
- **Only reads, never writes.** It asks for your address, chain ID and balance. It never requests a
  signature, a transaction or a token approval.
- **Stays in sync.** Switching account or network in the wallet updates the panel without a reload.
- **Explains every failure.** A rejected request, a request already pending, no wallet installed,
  and an unreachable network each get their own message.
- **Handles money precisely.** Balances are converted from wei with `BigInt`, because 18 decimal
  places do not fit in a normal JavaScript number.
- **Draws an avatar** from the address bytes, the way wallets do.
- **Disconnects honestly.** It clears the page and asks the wallet to revoke permission, and it tells
  you the permission really lives in your wallet.

The "Recent activity" list in the panel is sample data and is labelled as such. Without a wallet the
section still explains what would happen and links to MetaMask. Nothing else on the page depends on it.

---

## Design and accessibility

- **Look.** A clean field-guide style: white paper, near-black ink, dark green for structure and a
  yellow highlight, with a matching dark theme in black and gold. Type is Google Sans, with Google
  Sans Code for hashes and addresses.
- **Themes.** Every colour lives in design tokens in [`css/base.css`](css/base.css). Dark mode
  redefines the same tokens, follows your system setting, and remembers a manual choice.
- **Artwork.** Every icon and illustration, including the animated hero diagram, is hand-written
  inline SVG. There are no raster images.
- **Keyboard and screen readers.** Semantic landmarks, a skip link, visible focus rings, a proper
  ARIA tab list for the eras, `aria-pressed` on toggles, and live regions for wallet status.
- **Reduced motion.** `prefers-reduced-motion` is respected, including the SVG animations CSS
  cannot reach.
- **Clean links.** Clicking a menu or chapter link scrolls to the section without adding `#section`
  to the address bar, so a copied link always opens the page from the top.
- **Works without JavaScript.** All the reading content is still there. Only the demos stop being
  interactive.

---

## Run it locally

There is nothing to install. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit http://localhost:4173. A local server is better than opening the file directly, because
wallet extensions only connect to `http` and `https` pages.

## Deployment

The site is deployed with **GitHub Pages from the `main` branch**, repository root. Every push to
`main` goes live within a minute or two.

To host a copy elsewhere, point any static host (Netlify, Vercel, Cloudflare Pages) at the
repository root with no build command.

---

## Project structure

```
.
├── index.html          # All page content: hero and the seven chapters
├── assets/
│   └── social-card.svg # Link-preview image
├── css/
│   ├── base.css        # Design tokens, light and dark themes, reset, typography
│   ├── layout.css      # Header, sections, progress rail, footer
│   ├── components.css  # Cards, era switcher, crypto lab, flow, quiz, decoder
│   ├── chain.css       # Block styles
│   └── wallet.css      # Wallet panel
└── js/
    ├── main.js         # Theme, navigation, scroll spy, reveal on scroll, era tabs, Big 6 cards
    ├── sha256.js       # Synchronous SHA-256 used by the crypto lab
    ├── crypto.js       # Hash playground, key pair demo, signature lab
    ├── quiz.js         # Five-question myth-busting quiz
    ├── wallet.js       # Wallet discovery and connection
    ├── glossary.js     # The ten-term decoder
    ├── tips.js         # Hover or tap definitions for highlighted words
    └── chain.js        # Earlier proof-of-work demo, not loaded by the current page
```

Each script is a self-contained function that exits early if the markup it needs is missing. The only
dependency between scripts is `crypto.js` on `sha256.js`.

---

## Accuracy and disclaimer

The content favours facts that stay true over time, such as how hashing, keys and consensus work,
rather than prices or market data. Links point to primary sources such as ethereum.org and the
Ethereum Improvement Proposals.

This is educational content only. It is not financial advice, and the project is not affiliated with
any product or organisation it mentions.

## Licence

MIT. See [LICENSE](LICENSE).
