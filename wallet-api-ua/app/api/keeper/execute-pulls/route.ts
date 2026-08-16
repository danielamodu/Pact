/**
 * Pact Protocol — Keeper API Route
 *
 * Triggers a single execution cycle of the keeper, processing all eligible
 * subscriptions on both Arbitrum and Base.
 *
 * POST /api/keeper/execute-pulls
 * Headers:
 *   Authorization: Bearer <KEEPER_API_SECRET>
 *
 * Returns a JSON summary of what was executed, skipped, and errored.
 */

import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { sql, initDb, initWebhooksTable, initNotificationsTable, initKeeperRunsTable } from "@/lib/db";
import { decrypt, isEncrypted, signWebhook } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min timeout for Vercel

// ─── Addresses ───────────────────────────────────────────────────────────────

const PACT_REGISTRY_ADDRESS = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";
const SESSION_KEY_EXECUTOR_ADDRESS = "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f";

const NETWORKS: Record<string, { chainId: number; name: string; rpc: string }> = {
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
  },
  base: {
    chainId: 8453,
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
  },
};

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const REGISTRY_ABI = [
  "function getPlan(uint256 planId) external view returns (tuple(string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress, bool active))",
  "function logPull(uint256 planId, address subscriber, uint256 amount) external",
];

const EXECUTOR_ABI = [
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
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DelegationEntry {
  privateKey: string;
  ownerSignature: string;
  subscriberAddress: string;
  planId: string;
  network: string;
  scope: {
    sessionKeyAddress: string;
    recipient: string;
    maxAmount: string;
    token: string;
    interval: string;
    expiry: string;
    planId: string;
  };
}

interface PullResult {
  key: string;
  status: "executed" | "skipped" | "error";
  reason?: string;
  txHash?: string;
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function processEntry(
  storeKey: string,
  entry: DelegationEntry,
  networkKey: string
): Promise<PullResult> {
  const config = NETWORKS[networkKey];
  if (!config) return { key: storeKey, status: "skipped", reason: "Unknown network" };

  const keeperKey = process.env.KEEPER_RELAYER_PRIVATE_KEY;
  if (!keeperKey) return { key: storeKey, status: "error", reason: "KEEPER_RELAYER_PRIVATE_KEY not set" };

  const provider = new ethers.JsonRpcProvider(config.rpc);
  const keeperWallet = new ethers.Wallet(keeperKey, provider);

  const scope = {
    sessionKeyAddress: entry.scope.sessionKeyAddress,
    recipient: entry.scope.recipient,
    maxAmount: BigInt(entry.scope.maxAmount),
    token: entry.scope.token,
    interval: BigInt(entry.scope.interval),
    expiry: BigInt(entry.scope.expiry),
    planId: BigInt(entry.scope.planId),
  };

  // All reads target the subscriber's EIP-7702-delegated EOA so address(this)
  // matches the verifying contract used when the owner signed the scope.
  const subscriberContract = new ethers.Contract(entry.subscriberAddress, EXECUTOR_ABI, provider);

  try {
    // Revocation check
    const isRevoked = await subscriberContract.revokedSessionKeys(scope.sessionKeyAddress);
    if (isRevoked) return { key: storeKey, status: "skipped", reason: "Session key revoked" };

    // Expiry check
    const now = Math.floor(Date.now() / 1000);
    if (now > Number(scope.expiry)) return { key: storeKey, status: "skipped", reason: "Session key expired" };

    // Interval check
    const lastPull = await subscriberContract.lastPullTimestamp(scope.sessionKeyAddress);
    const nextAllowed = Number(lastPull) + Number(scope.interval);
    if (now < nextAllowed) {
      const waitHrs = ((nextAllowed - now) / 3600).toFixed(1);
      return { key: storeKey, status: "skipped", reason: `Interval not elapsed — next pull in ${waitHrs}h` };
    }

    // Plan active check
    const registry = new ethers.Contract(PACT_REGISTRY_ADDRESS, REGISTRY_ABI, provider);
    const plan = await registry.getPlan(scope.planId);
    if (!plan.active) return { key: storeKey, status: "skipped", reason: "Plan is paused" };

    const amount = scope.maxAmount;

    // Balance check
    if (scope.token === ethers.ZeroAddress) {
      const bal = await provider.getBalance(entry.subscriberAddress);
      if (bal < amount) return { key: storeKey, status: "skipped", reason: `Insufficient ETH balance` };
    } else {
      const erc20 = new ethers.Contract(scope.token, ERC20_ABI, provider);
      const bal = await erc20.balanceOf(entry.subscriberAddress);
      if (bal < amount) return { key: storeKey, status: "skipped", reason: `Insufficient token balance` };
    }

    // Validate owner signature against subscriber's EOA (verifyingContract = subscriberAddress)
    const ownerNonce = await subscriberContract.nonces(entry.subscriberAddress);
    const scopeHash = await subscriberContract.getScopeHash(scope, ownerNonce);
    const recoveredOwner = ethers.recoverAddress(scopeHash, entry.ownerSignature);
    if (recoveredOwner.toLowerCase() !== entry.subscriberAddress.toLowerCase()) {
      return { key: storeKey, status: "skipped", reason: "Owner signature invalid (nonce changed)" };
    }

    // Connect session key wallet to provider and fund it if needed.
    // tx must come FROM the session key wallet so msg.sender == scope.sessionKeyAddress.
    const sessionKeyWallet = new ethers.Wallet(entry.privateKey, provider);
    const skBalance = await provider.getBalance(sessionKeyWallet.address);
    const MIN_SK_GAS = ethers.parseEther("0.001");
    if (skBalance < MIN_SK_GAS) {
      const fundTx = await keeperWallet.sendTransaction({
        to: sessionKeyWallet.address,
        value: MIN_SK_GAS,
      });
      await fundTx.wait(1);
    }

    // Build session key signature
    const execNonce = await subscriberContract.executionNonces(scope.sessionKeyAddress);
    const execHash = await subscriberContract.getExecutionHash(amount, scope.recipient, execNonce);
    const sessionKeySigBytes = ethers.Signature.from(
      sessionKeyWallet.signingKey.sign(execHash)
    ).serialized;

    // Gas — tx targets subscriber's EOA (EIP-7702 delegated), sent from session key wallet
    const subscriberExecutor = new ethers.Contract(entry.subscriberAddress, EXECUTOR_ABI, sessionKeyWallet);

    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * BigInt(150)) / BigInt(100)
      : BigInt(2_000_000_000);
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
      ? (feeData.maxPriorityFeePerGas * BigInt(130)) / BigInt(100)
      : BigInt(1_000_000);

    let gasLimit: bigint;
    try {
      const est = await subscriberExecutor.executePull.estimateGas(amount, scope, entry.ownerSignature, sessionKeySigBytes);
      gasLimit = (est * BigInt(140)) / BigInt(100);
    } catch {
      gasLimit = BigInt(500_000);
    }

    // Submit
    const tx = await subscriberExecutor.executePull(
      amount,
      scope,
      entry.ownerSignature,
      sessionKeySigBytes,
      { gasLimit, maxFeePerGas, maxPriorityFeePerGas }
    );

    const receipt = await tx.wait(1);
    if (receipt.status !== 1) return { key: storeKey, status: "error", reason: "Transaction reverted", txHash: tx.hash };

    // Log on registry (best-effort)
    try {
      const registryWriter = new ethers.Contract(PACT_REGISTRY_ADDRESS, REGISTRY_ABI, keeperWallet);
      const logTx = await registryWriter.logPull(scope.planId, entry.subscriberAddress, amount);
      await logTx.wait(1);
    } catch { /* non-critical */ }

    // Record a subscriber-facing receipt (best-effort, non-blocking)
    try {
      await initNotificationsTable();
      const decimals = scope.token === ethers.ZeroAddress ? 18 : 6;
      const symbol = scope.token === ethers.ZeroAddress ? "ETH" : "USDC";
      await sql`
        INSERT INTO subscriber_notifications
          (subscriber_address, plan_id, network, event, amount, token, tx_hash)
        VALUES
          (${entry.subscriberAddress.toLowerCase()}, ${entry.planId}, ${networkKey},
           'pull.executed', ${ethers.formatUnits(amount, decimals)}, ${symbol}, ${tx.hash})
      `;
    } catch { /* non-critical */ }

    // Fire webhook if configured (best-effort, non-blocking)
    try {
      await initWebhooksTable();
      const wh = await sql`SELECT webhook_url, webhook_secret FROM plan_webhooks WHERE plan_id = ${entry.planId} AND network = ${networkKey}`;
      if (wh[0]?.webhook_url) {
        const timestamp = new Date().toISOString();
        const payload = JSON.stringify({
          event: "pull.executed",
          planId: entry.planId,
          network: networkKey,
          subscriber: entry.subscriberAddress,
          amount: amount.toString(),
          txHash: tx.hash,
          timestamp,
        });
        const signature = wh[0].webhook_secret ? signWebhook(payload, wh[0].webhook_secret) : "";
        await fetch(wh[0].webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(signature && { "X-Pact-Signature": signature, "X-Pact-Timestamp": timestamp }),
          },
          body: payload,
          signal: AbortSignal.timeout(5000),
        });
      }
    } catch { /* non-critical */ }

    return { key: storeKey, status: "executed", txHash: tx.hash };
  } catch (err: any) {
    return { key: storeKey, status: "error", reason: err.message || String(err) };
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Auth
  const authHeader = req.headers.get("authorization") || "";
  const secret = process.env.KEEPER_API_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load delegations from Neon
  await initDb();
  const rows = await sql`SELECT * FROM keeper_delegations`;
  if (rows.length === 0) {
    return NextResponse.json({ success: true, message: "No delegations stored.", results: [] });
  }

  const entries: [string, DelegationEntry][] = rows.map((row: any) => [
    row.store_key,
    {
      privateKey: isEncrypted(row.private_key) ? decrypt(row.private_key) : row.private_key,
      ownerSignature: row.owner_signature,
      subscriberAddress: row.subscriber_address,
      planId: row.plan_id,
      network: row.network,
      scope: row.scope,
    } as DelegationEntry,
  ]);

  // Process all entries
  const results: PullResult[] = await Promise.all(
    entries.map(([key, entry]) =>
      processEntry(key, entry, entry.network || key.split("_").pop() || "arbitrum")
    )
  );

  const executed = results.filter((r) => r.status === "executed");
  const skipped = results.filter((r) => r.status === "skipped");
  const errors = results.filter((r) => r.status === "error");

  const summary = {
    total: results.length,
    executed: executed.length,
    skipped: skipped.length,
    errors: errors.length,
  };

  // Persist the run so a keeper that is failing silently is visible after the fact
  try {
    await initKeeperRunsTable();
    await sql`
      INSERT INTO keeper_runs (total, executed, skipped, errors, detail)
      VALUES (${summary.total}, ${summary.executed}, ${summary.skipped}, ${summary.errors},
              ${JSON.stringify(results)})
    `;
  } catch (err) {
    console.warn("[Keeper] Could not record run:", err);
  }

  return NextResponse.json({ success: true, summary, results });
}

/**
 * Health check.
 *
 * Reports what is actually true rather than a fixed "ready". A missing keeper
 * key or an unreachable database previously still returned status "ok" with
 * delegationsStored 0, which is indistinguishable from a healthy idle keeper —
 * that is how a completely non-operational keeper went unnoticed.
 */
export async function GET() {
  const problems: string[] = [];

  const keeperKey = process.env.KEEPER_RELAYER_PRIVATE_KEY;
  const checks = {
    keeperKey: !!keeperKey,
    database: false,
    encryptionKey: !!process.env.ENCRYPTION_KEY,
  };

  if (!checks.keeperKey) {
    problems.push("KEEPER_RELAYER_PRIVATE_KEY is not set — the keeper cannot sign or execute any pull.");
  }
  if (!checks.encryptionKey) {
    problems.push("ENCRYPTION_KEY is not set — stored session keys cannot be decrypted.");
  }

  // Keeper wallet identity and gas. Only the address is exposed, never the key.
  let keeperWallet: { address: string; balances: Record<string, string> } | null = null;
  if (keeperKey) {
    try {
      const address = new ethers.Wallet(keeperKey).address;
      const balances: Record<string, string> = {};
      await Promise.all(
        Object.entries(NETWORKS).map(async ([key, cfg]) => {
          try {
            const bal = await new ethers.JsonRpcProvider(cfg.rpc).getBalance(address);
            balances[key] = ethers.formatEther(bal);
            if (bal === BigInt(0)) {
              problems.push(`Keeper wallet has no ETH on ${cfg.name} — it cannot fund session keys.`);
            }
          } catch {
            balances[key] = "unavailable";
          }
        })
      );
      keeperWallet = { address, balances };
    } catch {
      problems.push("KEEPER_RELAYER_PRIVATE_KEY is set but is not a valid private key.");
    }
  }

  let delegations: { total: number; byNetwork: Record<string, number> } | null = null;
  let lastRun: unknown = null;

  try {
    await initDb();
    const rows = await sql`SELECT network, COUNT(*)::int AS count FROM keeper_delegations GROUP BY network`;
    const byNetwork: Record<string, number> = {};
    let total = 0;
    for (const r of rows as any[]) {
      byNetwork[r.network] = Number(r.count);
      total += Number(r.count);
    }
    delegations = { total, byNetwork };
    checks.database = true;

    if (total === 0) {
      problems.push("No delegations stored — the keeper has nothing to execute.");
    }

    try {
      await initKeeperRunsTable();
      const runs = await sql`
        SELECT total, executed, skipped, errors, ran_at
        FROM keeper_runs ORDER BY ran_at DESC LIMIT 1
      `;
      lastRun = runs[0] ?? null;
      if (!runs[0]) problems.push("No keeper run has been recorded yet.");
    } catch { /* runs table is optional */ }
  } catch (err: any) {
    problems.push(`Database unreachable: ${err.message || "unknown error"}`);
  }

  return NextResponse.json(
    {
      status: problems.length === 0 ? "ok" : "degraded",
      checks,
      keeperWallet,
      delegations,
      lastRun,
      problems,
    },
    { status: problems.length === 0 ? 200 : 503 }
  );
}
