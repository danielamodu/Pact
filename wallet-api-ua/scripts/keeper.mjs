/**
 * Pact Protocol — Keeper Script
 *
 * Scans all active subscriptions on PactRegistry, checks if billing intervals
 * have elapsed, and executes pulls via SessionKeyExecutor.executePull().
 *
 * Usage:
 *   node scripts/keeper.mjs
 *
 * Cron (every minute):
 *   * * * * * cd /path/to/wallet-api-ua && node scripts/keeper.mjs >> keeper.log 2>&1
 *
 * Required env vars (in .env or environment):
 *   KEEPER_RELAYER_PRIVATE_KEY   — funded EOA that submits executePull transactions
 *   NEXT_PUBLIC_PROJECT_ID       — (optional) for logging context
 *
 * The session key delegations are stored in localStorage on the client side.
 * For the keeper to execute pulls server-side, delegations must also be stored
 * in a server-accessible store. This script reads from keeper-store.json which
 * is written by the permission page after a successful subscription.
 */

import { ethers } from "ethers";
import { readFileSync, existsSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Load .env manually (no dotenv dependency required)
const envPath = path.join(ROOT, ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const KEEPER_PRIVATE_KEY = process.env.KEEPER_RELAYER_PRIVATE_KEY;
if (!KEEPER_PRIVATE_KEY) {
  console.error("[Keeper] KEEPER_RELAYER_PRIVATE_KEY not set. Exiting.");
  process.exit(1);
}

// ─── Contract Addresses ───────────────────────────────────────────────────────

const PACT_REGISTRY_ADDRESS = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";
const SESSION_KEY_EXECUTOR_ADDRESS = "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f";

const NETWORKS = {
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    deployBlock: 485100000,
  },
  base: {
    chainId: 8453,
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    deployBlock: 487800000,
  },
};

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const PACT_REGISTRY_ABI = [
  "event Subscribed(uint256 indexed planId, address indexed subscriber, address indexed executorContract)",
  "function getPlan(uint256 planId) external view returns (tuple(string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress, bool active))",
  "function logPull(uint256 planId, address subscriber, uint256 amount) external",
  "function nextPlanId() external view returns (uint256)",
];

const SESSION_KEY_EXECUTOR_ABI = [
  "function executePull(uint256 amount, tuple(address sessionKeyAddress, address recipient, uint256 maxAmount, address token, uint256 interval, uint256 expiry, uint256 planId) scope, bytes ownerSig, bytes sessionKeySig) external",
  "function lastPullTimestamp(address sessionKey) external view returns (uint256)",
  "function revokedSessionKeys(address sessionKey) external view returns (bool)",
  "function nonces(address owner) external view returns (uint256)",
  "function executionNonces(address sessionKey) external view returns (uint256)",
  "function getScopeHash(tuple(address sessionKeyAddress, address recipient, uint256 maxAmount, address token, uint256 interval, uint256 expiry, uint256 planId) scope, uint256 nonce) external view returns (bytes32)",
  "function getExecutionHash(uint256 amount, address recipient, uint256 nonce) external view returns (bytes32)",
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// ─── EIP-712 Helpers ──────────────────────────────────────────────────────────

const EIP712_TYPES = {
  SessionKeyScope: [
    { name: "sessionKeyAddress", type: "address" },
    { name: "recipient", type: "address" },
    { name: "maxAmount", type: "uint256" },
    { name: "token", type: "address" },
    { name: "interval", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "planId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
  PullExecution: [
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
};

function getEIP712Domain(chainId, verifyingContract) {
  return {
    name: "Pact Protocol",
    version: "1",
    chainId,
    verifyingContract,
  };
}

// ─── Delegation Store ─────────────────────────────────────────────────────────

/**
 * Reads server-side delegation store written by the permission page.
 * File: wallet-api-ua/keeper-store.json
 * Shape: { [planId_subscriberAddress]: { privateKey, scope, ownerSignature } }
 */
function loadDelegationStore() {
  const storePath = path.join(ROOT, "keeper-store.json");
  if (!existsSync(storePath)) {
    console.log("[Keeper] No keeper-store.json found — no delegations to process.");
    return {};
  }
  try {
    const raw = readFileSync(storePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[Keeper] Failed to parse keeper-store.json:", err.message);
    return {};
  }
}

// ─── Core Execution ───────────────────────────────────────────────────────────

async function processNetwork(networkKey) {
  const config = NETWORKS[networkKey];
  const provider = new ethers.JsonRpcProvider(config.rpc);
  const keeperWallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

  const registry = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);

  console.log(`\n[Keeper] Processing ${config.name}...`);
  console.log(`[Keeper] Keeper address: ${keeperWallet.address}`);

  const keeperBalance = await provider.getBalance(keeperWallet.address);
  console.log(`[Keeper] Keeper balance: ${ethers.formatEther(keeperBalance)} ETH`);

  if (keeperBalance === 0n) {
    console.warn(`[Keeper] Keeper wallet has no ETH on ${config.name}. Skipping.`);
    return;
  }

  // Load delegation store
  const store = loadDelegationStore();
  const entries = Object.entries(store).filter(([key]) => key.endsWith(`_${networkKey}`));

  if (entries.length === 0) {
    console.log(`[Keeper] No delegations stored for ${config.name}.`);
    return;
  }

  console.log(`[Keeper] Found ${entries.length} delegation(s) for ${config.name}.`);

  let processed = 0;
  let executed = 0;
  let skipped = 0;
  let errors = 0;

  for (const [storeKey, entry] of entries) {
    processed++;
    const { privateKey, scope, ownerSignature, subscriberAddress, planId } = entry;

    // Reconstruct bigints from stored strings
    const scopeForContract = {
      sessionKeyAddress: scope.sessionKeyAddress,
      recipient: scope.recipient,
      maxAmount: BigInt(scope.maxAmount),
      token: scope.token,
      interval: BigInt(scope.interval),
      expiry: BigInt(scope.expiry),
      planId: BigInt(scope.planId),
    };

    // Connect session key wallet to provider so it can sign and send txs
    const sessionKeyWallet = new ethers.Wallet(privateKey, provider);
    const sessionKeyAddress = sessionKeyWallet.address.toLowerCase();

    // All state reads target the subscriber's EIP-7702-delegated EOA (not the deployed executor).
    // When the subscriber's EOA is called, address(this) = subscriberAddress, which matches
    // the verifying contract used when the owner signed the scope.
    const subscriberContract = new ethers.Contract(subscriberAddress, SESSION_KEY_EXECUTOR_ABI, provider);

    try {
      // 1. Check revocation
      const isRevoked = await subscriberContract.revokedSessionKeys(scope.sessionKeyAddress);
      if (isRevoked) {
        console.log(`[Keeper] [${storeKey}] Session key revoked — skipping.`);
        skipped++;
        continue;
      }

      // 2. Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (now > Number(scope.expiry)) {
        console.log(`[Keeper] [${storeKey}] Session key expired — skipping.`);
        skipped++;
        continue;
      }

      // 3. Check interval
      const lastPull = await subscriberContract.lastPullTimestamp(scope.sessionKeyAddress);
      const nextAllowed = Number(lastPull) + Number(scope.interval);
      if (now < nextAllowed) {
        const waitSecs = nextAllowed - now;
        const waitHrs = (waitSecs / 3600).toFixed(1);
        console.log(`[Keeper] [${storeKey}] Interval not elapsed — next pull in ${waitHrs}h. Skipping.`);
        skipped++;
        continue;
      }

      // 4. Check plan is still active
      const plan = await registry.getPlan(BigInt(scope.planId));
      if (!plan.active) {
        console.log(`[Keeper] [${storeKey}] Plan ${scope.planId} is paused — skipping.`);
        skipped++;
        continue;
      }

      const amount = scopeForContract.maxAmount;
      const token = scope.token;

      // 5. Check subscriber balance
      if (token === ethers.ZeroAddress || token === "0x0000000000000000000000000000000000000000") {
        const bal = await provider.getBalance(subscriberAddress);
        if (bal < amount) {
          console.warn(`[Keeper] [${storeKey}] Insufficient ETH balance (${ethers.formatEther(bal)} < ${ethers.formatEther(amount)}). Skipping.`);
          skipped++;
          continue;
        }
      } else {
        const erc20 = new ethers.Contract(token, ERC20_ABI, provider);
        const bal = await erc20.balanceOf(subscriberAddress);
        if (bal < amount) {
          console.warn(`[Keeper] [${storeKey}] Insufficient token balance. Skipping.`);
          skipped++;
          continue;
        }
      }

      // 6. Verify owner signature against the subscriber's EOA (verifyingContract = subscriberAddress)
      const ownerNonce = await subscriberContract.nonces(subscriberAddress);
      const scopeHashCheck = await subscriberContract.getScopeHash(scopeForContract, ownerNonce);
      const recoveredOwner = ethers.recoverAddress(scopeHashCheck, ownerSignature);
      if (recoveredOwner.toLowerCase() !== subscriberAddress.toLowerCase()) {
        console.warn(`[Keeper] [${storeKey}] Owner signature no longer valid (nonce mismatch or revoked). Skipping.`);
        skipped++;
        continue;
      }

      // 7. Build session key signature over execution params
      const execNonce = await subscriberContract.executionNonces(scope.sessionKeyAddress);
      const executionHash = await subscriberContract.getExecutionHash(amount, scope.recipient, execNonce);
      const sessionKeySigRaw = ethers.Signature.from(
        await sessionKeyWallet.signingKey.sign(executionHash)
      ).serialized;

      console.log(`[Keeper] [${storeKey}] Executing pull: ${ethers.formatUnits(amount, token === ethers.ZeroAddress ? 18 : 6)} to ${scope.recipient}...`);

      // 8. Fund session key wallet with gas if needed.
      // The tx must come from the session key wallet (msg.sender == scope.sessionKeyAddress)
      // to pass the caller check in SessionKeyExecutor.executePull().
      const MIN_SK_GAS = ethers.parseEther("0.001");
      const skBalance = await provider.getBalance(sessionKeyWallet.address);
      if (skBalance < MIN_SK_GAS) {
        console.log(`[Keeper] [${storeKey}] Funding session key wallet (${sessionKeyWallet.address}) with 0.001 ETH for gas...`);
        const fundTx = await keeperWallet.sendTransaction({
          to: sessionKeyWallet.address,
          value: MIN_SK_GAS,
        });
        await fundTx.wait(1);
        console.log(`[Keeper] [${storeKey}] Session key wallet funded.`);
      }

      // 9. Estimate gas + execute — tx goes TO the subscriber's EOA (EIP-7702 delegated),
      //    sent FROM the session key wallet so msg.sender == scope.sessionKeyAddress.
      const subscriberExecutor = new ethers.Contract(subscriberAddress, SESSION_KEY_EXECUTOR_ABI, sessionKeyWallet);

      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 150n) / 100n
        : 2_000_000_000n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
        ? (feeData.maxPriorityFeePerGas * 130n) / 100n
        : 1_000_000n;

      let gasLimit;
      try {
        const estimated = await subscriberExecutor.executePull.estimateGas(
          amount,
          scopeForContract,
          ownerSignature,
          sessionKeySigRaw
        );
        gasLimit = (estimated * 140n) / 100n;
      } catch (e) {
        console.warn(`[Keeper] Gas estimation failed: ${e.message}. Using 500k fallback.`);
        gasLimit = 500_000n;
      }

      const tx = await subscriberExecutor.executePull(
        amount,
        scopeForContract,
        ownerSignature,
        sessionKeySigRaw,
        { gasLimit, maxFeePerGas, maxPriorityFeePerGas }
      );

      console.log(`[Keeper] [${storeKey}] Tx submitted: ${tx.hash}`);
      const receipt = await tx.wait(1);

      if (receipt.status === 1) {
        console.log(`[Keeper] [${storeKey}] ✅ Pull executed successfully in block ${receipt.blockNumber}`);

        // Log pull on PactRegistry for on-chain receipts
        try {
          const registryWithSigner = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, keeperWallet);
          const logTx = await registryWithSigner.logPull(BigInt(scope.planId), subscriberAddress, amount);
          await logTx.wait(1);
          console.log(`[Keeper] [${storeKey}] Pull logged on PactRegistry.`);
        } catch (logErr) {
          console.warn(`[Keeper] [${storeKey}] Failed to log pull on registry (non-critical):`, logErr.message);
        }

        executed++;
      } else {
        console.error(`[Keeper] [${storeKey}] ❌ Transaction reverted. Hash: ${tx.hash}`);
        errors++;
      }
    } catch (err) {
      console.error(`[Keeper] [${storeKey}] Error:`, err.message || err);
      errors++;
    }
  }

  console.log(`\n[Keeper] ${config.name} done. Processed: ${processed} | Executed: ${executed} | Skipped: ${skipped} | Errors: ${errors}`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`[Keeper] Starting Pact keeper at ${new Date().toISOString()}`);

  await processNetwork("arbitrum");
  await processNetwork("base");

  console.log(`\n[Keeper] Run complete at ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("[Keeper] Fatal error:", err);
  process.exit(1);
});
