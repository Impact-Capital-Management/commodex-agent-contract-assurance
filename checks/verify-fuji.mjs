#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Independent check of the Commodex evidence on Avalanche Fuji (chain id 43113).
//
// No install, no key, no wallet: Node 18+ and the public Fuji RPC only.
//   node checks/verify-fuji.mjs                       # evidence file from GitHub
//   node checks/verify-fuji.mjs ./fuji-evidence.json  # a local copy
//   FUJI_RPC=https://... node checks/verify-fuji.mjs  # another Fuji RPC
//
// For every entry it reads the transaction receipt and checks: mined, status 1,
// same block as recorded, sent to the CommodexAnchor contract (anchor and
// setOperator steps), and for anchors that the contract itself returns the
// same block from anchoredAtBlock(hash). It also checks that code exists at the
// contract address and that operator() is the wallet recorded by setOperator.
// Exit code 0 = every check passed; 1 = at least one failed.
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';

const RPC = process.env.FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc';
const EVIDENCE_URL =
  'https://raw.githubusercontent.com/Impact-Capital-Management/commodex-agent-avalanche-contracts/main/evidence/fuji-evidence.json';

// Function selectors, computed once from the ABI with keccak256 and fixed here so the script needs no library.
const SEL_ANCHORED_AT_BLOCK = '0x0cbeeb9e'; // anchoredAtBlock(bytes32)
const SEL_OPERATOR = '0x570ca735';          // operator()

let id = 0;
async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function loadEvidence(source) {
  if (source) return JSON.parse(await readFile(source, 'utf8'));
  const res = await fetch(EVIDENCE_URL);
  if (!res.ok) throw new Error(`could not download ${EVIDENCE_URL} (HTTP ${res.status})`);
  return res.json();
}

const results = [];
function check(label, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
}

const ev = await loadEvidence(process.argv[2]);
const contract = ev.contract.toLowerCase();
console.log(`RPC       ${RPC}`);
console.log(`Contract  ${ev.contract}\n`);

const chainId = parseInt(await rpc('eth_chainId', []), 16);
check('RPC answers Avalanche Fuji', chainId === 43113, `chain id ${chainId}`);

const code = await rpc('eth_getCode', [ev.contract, 'latest']);
check('contract code exists on Fuji', code && code.length > 2, `${(code.length - 2) / 2} bytes`);

for (const e of ev.entries) {
  const r = await rpc('eth_getTransactionReceipt', [e.txHash]);
  const label = `${e.step}${e.kind ? ' ' + e.kind : ''} (${e.txHash.slice(0, 10)}…)`;
  if (!r) { check(label, false, 'no receipt'); continue; }
  const block = parseInt(r.blockNumber, 16);
  const toContract = (r.to || '').toLowerCase() === contract;
  const deployed = (r.contractAddress || '').toLowerCase() === contract;
  let ok = r.status === '0x1' && block === e.block;
  let detail = `block ${block}`;
  if (e.step === 'deploy') ok &&= deployed;
  if (e.step === 'anchor' || e.step === 'set-operator') ok &&= toContract;
  if (e.step === 'anchor') {
    const raw = await rpc('eth_call', [{ to: ev.contract, data: SEL_ANCHORED_AT_BLOCK + e.hash.slice(2) }, 'latest']);
    const stored = parseInt(raw, 16);
    ok &&= stored === e.block;
    detail += `, contract says hash anchored in block ${stored}`;
  }
  check(label, ok, detail);
}

const setOp = [...ev.entries].reverse().find((e) => e.step === 'set-operator');
if (setOp) {
  const raw = await rpc('eth_call', [{ to: ev.contract, data: SEL_OPERATOR }, 'latest']);
  const operator = '0x' + raw.slice(-40);
  check('operator() is the Commodex server wallet', operator.toLowerCase() === setOp.to.toLowerCase(), operator);
}

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
