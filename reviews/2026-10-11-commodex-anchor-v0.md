# Review — CommodexAnchor v0 (2026-10-11)

Source: https://github.com/Impact-Capital-Management/commodex-agent-avalanche-contracts/blob/main/contracts/CommodexAnchor.sol
Compiler: solc 0.8.24, optimizer 200 runs, EVM `paris`. Target: Avalanche Fuji, chain id 43113.
Method: line-by-line reading against the M0 requirement ("accept a 32-byte hash and emit it"), plus the
7 local tests in that repository. No static-analysis tool or fuzzer was run on this version.

## Scope check

| Requirement | Result |
|---|---|
| Holds no funds | Pass — no payable function, no receive/fallback, no token calls |
| Stores no personal data | Pass — a `bytes32` digest, a `bytes32` kind label and a short `ref` string chosen by the operator |
| One hash, one record | Pass — `AlreadyAnchored` on a repeat |
| Only the operator writes | Pass — `onlyOperator` on both state-changing functions |
| No upgrade path, no self-destruct | Pass |

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Medium | `setOperator(address(0))` would lock the contract for good | Fixed before deploy: `ZeroOperator` revert + test 6 |
| 2 | Low | One operator key controls every anchor. Acceptable for a public timestamp; it must be a dedicated wallet, rotated through `setOperator` | Accepted — see the infrastructure runbook |
| 3 | Info | `ref` is a free string: the operator must never put a name, an amount or an address in it | Accepted — rule written in commodex-agent-avalanche-engineering/docs/what-gets-anchored.md |
| 4 | Info | `anchoredAtBlock` returns 0 for "never anchored"; block 0 cannot hold a user transaction, so the value is unambiguous | No action |

## Verdict

No blocking finding for a Fuji deployment. Not reviewed for C-Chain mainnet; that needs a tool-based pass
(static analysis + invariant tests) on the exact bytecode. Human sign-off: pending.
