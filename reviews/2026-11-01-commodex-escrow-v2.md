# Review — CommodexEscrow v2 (2026-11-01)

Source: https://github.com/Impact-Capital-Management/commodex-agent-avalanche-contracts/blob/main/contracts/CommodexEscrow.sol
Specification: https://github.com/Impact-Capital-Management/commodex-agent-avalanche-contracts/blob/main/docs/escrow-spec.md
Compiler: solc 0.8.24, optimizer 200 runs, EVM `paris`. Target: Avalanche Fuji, chain id 43113.
Deployed: 0xe453ebae20f06d53c44946b15A35E0e790A3089e, block 60366934, on Circle's Fuji USDC.
Method: line-by-line reading against the specification, plus the 16 local test groups in that repository
(including a re-entrant token and a fee-on-transfer token). No static-analysis tool or fuzzer was run on this version.

## Scope check

| Requirement | Result |
|---|---|
| Only the buyer releases before the deadline | Pass — `release` checks `msg.sender == buyer`; operator and seller refused (test 4) |
| Operator may force the release only after the deadline | Pass — `forceRelease` is `onlyOperator` and reverts `DeadlineNotReached` before it (test 5) |
| Disputes resolved by the operator only, no expiry | Pass — `expire` and `forceRelease` require `FUNDED`; `resolve` is `onlyOperator` and requires `DISPUTED` (tests 7, 8) |
| Buyer never locked out for good | Pass — 30-day backstop after the deadline on undisputed trades (test 6); owner can replace a lost operator |
| Fee 0% on testnet, capped at 3% | Pass — `feeBps` starts at 0, `setFee` reverts above 300 (test 12); read back as 0 on Fuji |
| Pause cannot trap funds | Pass — pause only blocks `createAndFund` (test 11) |
| Funds move once | Pass — `nonReentrant` on every payout path, status set before transfer (test 14) |
| Exact deposits | Pass — balance-delta check rejects fee-on-transfer tokens (test 15) |
| No upgrade path, no self-destruct | Pass |

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Medium | One operator key can refund any open trade and force-release any undisputed trade after its deadline. Acceptable on a testnet; before any mainnet use the operator must be a multisig or a contract with its own controls | Accepted for Fuji — blocks mainnet |
| 2 | Low | The fee is read at payout, not at funding: the owner could raise it (up to 3%) on trades already funded | Accepted for Fuji (fee stays 0). Before mainnet: store the fee in the escrow at funding |
| 3 | Low | The 7-day window is set by the application, not enforced: a buyer calling the contract directly can choose 1 hour to 30 days | Accepted — the Commodex app sends 7 days; a direct caller only changes their own trade |
| 4 | Low | Circle USDC can block addresses. A blocked seller makes `release`/`forceRelease` revert; a blocked buyer makes `refund`/`expire` revert | Accepted — the other exit stays open (operator refund, or resolve after a dispute) |
| 5 | Info | A buyer may still open a dispute after the deadline, as long as the operator has not force-released. Whichever transaction is mined first wins | No action — both outcomes are allowed by the specification |
| 6 | Info | `EscrowReleasedBy` tells the ledger who triggered each payout (buyer, forced, resolved) | No action |

## Deployment check

`node checks/verify-fuji-escrow.mjs` — 11/11 checks passed on 1 Nov 2026, including: the deploy input is
byte-for-byte the published bytecode plus the three constructor arguments, `token()` is Circle Fuji USDC,
`operator()` is the Commodex server wallet, fee 0, 7-day window, 30-day grace, not paused.

## Verdict

No blocking finding for a Fuji deployment. Not reviewed for C-Chain mainnet: findings 1 and 2 must be closed
first, and the exact bytecode needs a tool-based pass (static analysis + invariant tests). Human sign-off: pending.
