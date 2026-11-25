# AI usage

This project was built with an AI coding agent (Muse) working under a
human's direction, as the entry for the **Best AI-Native Build** special
award of Build Before Q-Day.

## What the human did

- Chose the competition, the Quantum Pass level and the project scope.
- Reviewed the official rules, prizes and the Workshop 1 tutorial and
  decided to follow the official kit path.
- Owns the GitHub account that registers for the fest and submits the
  project, and performs every account sign-in personally.
- Will record (or narrate) the demo video and makes the final submission.

## What the AI agent did

- Scaffolded the project with the official `create-qorechain-dapp` kit and
  ran its test suite.
- Created the throwaway **testnet-only** development account used by the
  project (a fresh key pair and QRC1 recovery code in a local `.env`,
  never committed, holding no real funds).
- Wrote the original `scripts/verify-hybrid.ts` PQ checker and tested it
  against a recorded-shape fixture and the live testnet REST endpoint.
- Wrote this repository's README, the demo video script and the build
  status notes.

## Boundaries the agent worked under

- Testnet only. No mainnet keys, no real funds, no user wallet was ever
  touched; the development account is a throwaway created for this project.
- No account registration was performed by the agent: every sign-in
  (GitHub, X, QoreX, Dashboard) is done by the human.
- Nothing in this repository claims a step that has not actually run;
  the on-chain transaction hashes in the README are filled in only after
  the transactions exist on the testnet.
