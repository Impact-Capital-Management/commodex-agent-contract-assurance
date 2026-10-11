# commodex-agent-contract-assurance

Contract assurance agent for the Commodex Avalanche C-Chain setup. Commodex: https://commodex.xyz/

- Production: https://commodex.xyz
- Testnet UI: https://wedevnext.commodex.xyz
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

## Status — 11 October 2026

| Contract | Review | Result |
|---|---|---|
| CommodexAnchor v0 | [reviews/2026-10-11-commodex-anchor-v0.md](reviews/2026-10-11-commodex-anchor-v0.md) | no blocking finding; deployed on Fuji 11 Oct 2026 at 0xe274C452dFb0D259FA413EEd3a830197a4Fd50ef, deployed bytecode = reviewed source (explorer-verified) |
| CommodexEscrow v0 | not started (contract not written) | — |

## License

MIT — see [LICENSE](LICENSE).
