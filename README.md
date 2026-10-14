# commodex-agent-contract-assurance

Contract assurance agent for the Commodex Avalanche C-Chain setup. Commodex: https://commodex.xyz/

- Production: https://commodex.xyz
- Testnet UI: https://wedevnext.commodex.xyz
- Fuji evidence page on the testnet UI: https://wedevnext.commodex.xyz/fuji
- Network: Avalanche Fuji C-Chain (EVM), chain id `43113`

## Agent

| | |
|---|---|
| Person | Viktor Nagy |
| Role | Contract assurance — independent review of every Commodex contract before it is deployed |
| FR scope | FR-03 |
| Squad page | https://team.impactcapital.ltd/showcase/commodex/agents/contract_assurance/ |

This unit does not write the contracts it reviews. A deployment needs its written review; it can hold a
deployment, it cannot approve one alone — the human lead signs off.

## Status — 14 October 2026

| Contract | Review | Result |
|---|---|---|
| CommodexAnchor v0 | [reviews/2026-10-11-commodex-anchor-v0.md](reviews/2026-10-11-commodex-anchor-v0.md) | no blocking finding; deployed on Fuji 11 Oct 2026 at 0xe274C452dFb0D259FA413EEd3a830197a4Fd50ef, deployed bytecode = reviewed source (explorer-verified) |
| CommodexEscrow v0 | not started (contract not written) | — |

## Commands

Re-check every recorded Fuji transaction yourself. No install, no key, no wallet — Node 18 or newer and the
public Fuji RPC only:

```bash
git clone https://github.com/Impact-Capital-Management/commodex-agent-contract-assurance
cd commodex-agent-contract-assurance
node checks/verify-fuji.mjs
```

[`checks/verify-fuji.mjs`](checks/verify-fuji.mjs) downloads
[`fuji-evidence.json`](https://github.com/Impact-Capital-Management/commodex-agent-avalanche-contracts/blob/main/evidence/fuji-evidence.json)
and checks, for each entry: mined with status 1, same block as recorded, sent to the CommodexAnchor contract;
for anchors, that the contract's own `anchoredAtBlock(hash)` returns that block; and that `operator()` is the
Commodex server wallet. Exit code 0 means every check passed.

Output on 14 October 2026:

```text
PASS  RPC answers Avalanche Fuji  chain id 43113
PASS  contract code exists on Fuji  922 bytes
PASS  deploy (0x24efb4ba…)  block 59306874
PASS  anchor TEST (0x2384d975…)  block 59306896, contract says hash anchored in block 59306896
PASS  fund-operator (0xe931ef10…)  block 59308703
PASS  set-operator (0xcca9d197…)  block 59308707
PASS  anchor TEST (0x41a6b23d…)  block 59309304, contract says hash anchored in block 59309304
PASS  anchor LEDGER_HEAD (0x3a1c5d00…)  block 59309310, contract says hash anchored in block 59309310
PASS  anchor P2P_ROOT (0x54a4a467…)  block 59309318, contract says hash anchored in block 59309318
PASS  operator() is the Commodex server wallet  0x215edfa8c9db88a972fbedb810b884ade94fca7b

10/10 checks passed
```

Run the contract's own tests (in-memory chain, no Fuji funds):

```bash
git clone https://github.com/Impact-Capital-Management/commodex-agent-avalanche-contracts
cd commodex-agent-avalanche-contracts && npm install && npm test     # 7 checks
```

## License

MIT — see [LICENSE](LICENSE).
