# QDay Pass — Hybrid Counter & PQ Checker

A **Quantum Pass** entry for **Build Before Q-Day**, the QoreChain
Developer Fest (QoreChain Association).

**Status:* Submitted to Build Before Q-Day (QoreChain) on 25 Nov 2026 — public project page: https://build.qorechain.io/p/qday-pass-hybrid-counter-pq-checker

**The idea in one sentence:** a small Counter dApp on the QoreChain
testnet whose deployment is authorised by a *hybrid post-quantum
transaction* — one transaction signed with **two keys at once**, a
classical secp256k1 key and a post-quantum **ML-DSA-87** key
(NIST FIPS 204) — plus a command-line **PQ Checker** that lets anyone
prove, from the chain's own public records, that the validators
verified both signatures.

## Why this matters

A quantum computer that breaks ECDSA would let an attacker forge the
classical signature of any exposed account. QoreChain answers this at
the protocol level: accounts register an ML-DSA-87 key once, and the
transactions that matter are signed *hybrid* — classical **and**
post-quantum. Stealing one key is not enough. This project performs
exactly that flow end to end on the testnet, following the official
Workshop 1 tutorial, and then reads the proof back from the chain.

## What is inside

| Part | What it does |
| --- | --- |
| `contracts/Counter.sol` | Minimal storage contract (from the official kit): one number, `increment()` / `set()`, `CountChanged` event. |
| `ignition/modules/Counter.ts` | Hardhat Ignition deployment module for the Counter. |
| `scripts/window.ts` | The kit's helper: registers the account's ML-DSA-87 key and opens the EVM authorisation window with a hybrid-signed transaction. |
| `scripts/verify-hybrid.ts` | **Original tool — the PQ Checker.** Given a transaction hash, it fetches the transaction from the public REST endpoint and reports the three pieces of on-chain proof (see below). |
| `test/Counter.ts` | The kit's test suite (2 tests, passing). |

## The post-quantum components

- **ML-DSA-87 (Dilithium-5, FIPS 204)** — the post-quantum signature
  scheme. Its signature is 4,627 bytes, next to the 64-byte secp256k1
  signature in the same transaction.
- **Hybrid signing** — the EVM authorisation window is opened by a
  transaction carrying a `PQCHybridSignature` extension; the chain
  answers with a `pqc_hybrid_verify` event whose `status` is
  `verified` only if *both* signatures check out.
- **`@qorechain/sdk` / `@qorechain/evm`** — the official kits derive
  the ML-DSA-87 key from a QRC1 recovery code and handle the window
  flow.
- **EVM authorisation window** — an Ethereum transaction cannot carry
  a post-quantum signature, so the account registers its ML-DSA-87 key
  once and opens a short window (600 blocks, 5 transactions) inside
  which its normal EVM transactions — like the Counter deployment —
  are admitted.

## The proof (testnet `qorechain-diana`)

Project development account (throwaway, testnet only):

- EVM: `0x3611842DA80DdA0DB599E7e696054d799f55E587`
- Native: `qor1xcgcgtdgphdqmdveulnfvp2d0x04tev88fkvcy`

On-chain evidence — *filled in as each step lands on the testnet*:

| Evidence | Value |
| --- | --- |
| Faucet funding tx | Funded 25 Nov 2026: 100 QOR testnet faucet to the registrant's QoreX wallet, 99 QOR forwarded to this account (balance verified on-chain via REST) |
| ML-DSA-87 key registration tx | `53073F6B8282DA01C7FB74B082B71DB320F6BECF4ED379AB245E329AEDE40049` |
| **Hybrid-signed window-open tx** | `A8C853C5423098DE6CC39435ECEFC33B9E60D8211DBE3F45B602B32691381A17` — verified with `pnpm verify`: PQCHybridSignature present (ML-DSA-87, ~4,627 bytes), chain event `pqc_hybrid_verify` = **verified**, block 10718822 |
| Counter contract | `0xdfB810F8498b54Ef917Ed6C311be06B8d48361ee` — deploy tx `0x1408db2c907db85ffc1aaba6acbb567c93d389280a0adf2cf8d38416b4f53478` (status success, 574 bytes of code on-chain, `count()` reads 0). Deployed inside the second authorisation window (opened by tx `AE37B486E5C1A6808AFC04F0D9CDE19225A247E48F142D33AF33F6FE0C3A0B38`) |
| Explorer | https://explore.qore.network (switch to **Testnet**, search the hashes above) |

Anyone can re-check the hybrid transaction, no account needed:

```sh
pnpm verify <WINDOW_OPEN_TX_HASH>
# or, by hand:
curl -s https://api-testnet.qore.host/cosmos/tx/v1beta1/txs/<HASH> \
  | jq '.tx_response.events[] | select(.type=="pqc_hybrid_verify")'
```

## Run it yourself

Prerequisites: Node.js 22+, pnpm. Everything runs on the **testnet**;
test QOR has no value.

```sh
pnpm install
pnpm test            # 2 passing, on Hardhat's simulated network
cp .env.example .env # then create a throwaway account as in the tutorial
pnpm window status   # show account, PQC key and window state
```

Full flow (official Workshop 1 tutorial,
<https://docs.qorechain.io/build-before-qday/workshop-1/>):

1. Create a throwaway testnet account (private key + QRC1 recovery
   code in `.env` — never commit it, never use a real wallet).
2. Fund it with 100 test QOR from the faucet at
   <https://dashboard.qorechain.io/faucet> (Dashboard sign-in required).
3. `pnpm window register` — register the ML-DSA-87 key (one-time,
   ~0.09 QOR).
4. `pnpm window open` — **the hybrid-signed transaction**: opens the
   EVM authorisation window, signed with both keys.
5. `pnpm build` and `pnpm deploy:testnet` — deploy the Counter inside
   the window.
6. `pnpm verify <HASH>` — read the proof back from the chain.

| Network | Chain | EVM chain id | RPC / REST |
| --- | --- | --- | --- |
| Testnet | `qorechain-diana` | 9800 | `https://rpc-testnet.qore.host` / `https://api-testnet.qore.host` |
| Mainnet | `qorechain-vladi` | 9801 | (this project is testnet-only) |

## Credits

Built with the official QoreChain kits and templates
(`create-qorechain-dapp`, `@qorechain/sdk`, `@qorechain/evm`,
Hardhat 3) following the fest's Workshop 1 guide — thank you to the
QoreChain Association and the kit authors. The PQ Checker
(`scripts/verify-hybrid.ts`), this README and the project packaging
are original to this entry. AI assistance is documented in
[AI_USAGE.md](AI_USAGE.md).

## Licence

MIT — see [LICENSE](LICENSE).
