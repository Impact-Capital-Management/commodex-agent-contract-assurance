#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Independent check of the CommodexEscrow deployment on Avalanche Fuji (chain id 43113).
//
// No install, no key, no wallet: Node 18+ and the public Fuji RPC only.
//   node checks/verify-fuji-escrow.mjs                        # evidence + build from GitHub
//   node checks/verify-fuji-escrow.mjs ./fuji-escrow.json     # a local evidence copy
//   FUJI_RPC=https://... node checks/verify-fuji-escrow.mjs   # another Fuji RPC
//
// Checks: the RPC is Fuji; code exists at the escrow address; the deploy transaction is mined with
// status 1 in the recorded block and created that address; its input is exactly the published
// bytecode followed by the three constructor arguments (token, operator, fee recipient); and the
// live contract returns the agreed settings: Circle Fuji USDC, the Commodex operator wallet,
// fee 0, a 7-day default window, a 30-day operator grace, not paused. Any later entries (demo
// trades) must be mined with status 1 in their recorded block.
// Exit code 0 = every check passed; 1 = at least one failed.
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';

const RPC = process.env.FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc';
const BASE = 'https://raw.githubusercontent.com/Impact-Capital-Management/commodex-agent-avalanche-contracts/main';
const EVIDENCE_URL = `${BASE}/evidence/fuji-escrow.json`;
const BUILD_URL = `${BASE}/build/CommodexEscrow.json`;
const CIRCLE_FUJI_USDC = '0x5425890298aed601595a70ab815c96711a31bc65'; // https://developers.circle.com/stablecoins/usdc-contract-addresses

// Function selectors (keccak256 of the signature, first 4 bytes), fixed here so no library is needed.
const SEL = {
  token: '0xfc0c546a', operator: '0x570ca735', owner: '0x8da5cb5b', feeBps: '0x24a9d853',
  paused: '0x5c975abb', DEFAULT_WINDOW: '0x43a0c39f', OPERATOR_GRACE: '0xddf15722', MAX_FEE_BPS: '0xd55be8c6',
};

let id = 0;
async function rpc(method, params) {
  const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`could not download ${url} (HTTP ${res.status})`);
  return res.json();
}
const call = (to, sel) => rpc('eth_call', [{ to, data: sel }, 'latest']);
const asAddress = (word) => '0x' + word.slice(-40).toLowerCase();
const asNumber = (word) => BigInt(word);
const pad = (addr) => addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');

const results = [];
function check(label, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
}

const ev = process.argv[2] ? JSON.parse(await readFile(process.argv[2], 'utf8')) : await getJson(EVIDENCE_URL);
const build = await getJson(BUILD_URL);
const escrow = ev.escrow.toLowerCase();
console.log(`RPC     ${RPC}`);
console.log(`Escrow  ${ev.escrow}\n`);

const chainId = parseInt(await rpc('eth_chainId', []), 16);
check('RPC answers Avalanche Fuji', chainId === 43113, `chain id ${chainId}`);

const code = await rpc('eth_getCode', [ev.escrow, 'latest']);
check('escrow code exists on Fuji', code && code.length > 2, `${(code.length - 2) / 2} bytes`);

const dep = ev.entries.find((e) => e.step === 'deploy-escrow');
const r = await rpc('eth_getTransactionReceipt', [dep.txHash]);
const block = r ? parseInt(r.blockNumber, 16) : -1;
check(`deploy-escrow (${dep.txHash.slice(0, 10)}…)`, !!r && r.status === '0x1' && block === dep.block && (r.contractAddress || '').toLowerCase() === escrow, `block ${block}`);

const tx = await rpc('eth_getTransactionByHash', [dep.txHash]);
const expectedInput = (build.CommodexEscrow.bytecode + pad(ev.token) + pad(ev.operator) + pad(ev.feeRecipient)).toLowerCase();
check('deploy input = published bytecode + constructor arguments', (tx.input || '').toLowerCase() === expectedInput, `${(tx.input.length - 2) / 2} bytes`);

check('token() is Circle Fuji USDC', asAddress(await call(ev.escrow, SEL.token)) === CIRCLE_FUJI_USDC, CIRCLE_FUJI_USDC);
const op = asAddress(await call(ev.escrow, SEL.operator));
check('operator() is the Commodex server wallet', op === ev.operator.toLowerCase(), op);
check('feeBps() is 0', asNumber(await call(ev.escrow, SEL.feeBps)) === 0n);
check('MAX_FEE_BPS() is 300 (3%)', asNumber(await call(ev.escrow, SEL.MAX_FEE_BPS)) === 300n);
check('DEFAULT_WINDOW() is 7 days', asNumber(await call(ev.escrow, SEL.DEFAULT_WINDOW)) === 604800n);
check('OPERATOR_GRACE() is 30 days', asNumber(await call(ev.escrow, SEL.OPERATOR_GRACE)) === 2592000n);
check('paused() is false', asNumber(await call(ev.escrow, SEL.paused)) === 0n);

for (const e of ev.entries.filter((x) => x !== dep && !String(x.step).startsWith('deploy'))) {
  const rr = await rpc('eth_getTransactionReceipt', [e.txHash]);
  const b = rr ? parseInt(rr.blockNumber, 16) : -1;
  check(`${e.step} (${e.txHash.slice(0, 10)}…)`, !!rr && rr.status === '0x1' && b === e.block, `block ${b}`);
}

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
