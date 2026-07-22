/**
 * GET /api/v1/subscriptions/status
 *
 * Public endpoint — no auth required.
 * Third-party apps call this to check if a wallet address is an active
 * subscriber to a given Pact plan.
 *
 * Query params:
 *   planId     — numeric plan ID on PactRegistry
 *   subscriber — subscriber's EOA address (0x...)
 *   network    — "arbitrum" | "base" (default: arbitrum)
 */

import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { sql, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const NETWORKS: Record<string, { rpc: string; chainId: number; name: string }> = {
  arbitrum: { rpc: "https://arb1.arbitrum.io/rpc", chainId: 42161, name: "Arbitrum One" },
  base: { rpc: "https://mainnet.base.org", chainId: 8453, name: "Base Mainnet" },
};

const EXECUTOR_ABI = [
  "function lastPullTimestamp(address sessionKey) external view returns (uint256)",
  "function revokedSessionKeys(address sessionKey) external view returns (bool)",
];

const REGISTRY_ABI = [
  "function getPlan(uint256 planId) external view returns (tuple(string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress, bool active))",
];

const PACT_REGISTRY = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");
  const subscriber = searchParams.get("subscriber");
  const network = searchParams.get("network") || "arbitrum";

  if (!planId || !subscriber) {
    return NextResponse.json(
      { error: "Missing required params: planId, subscriber" },
      { status: 400 }
    );
  }

  if (!ethers.isAddress(subscriber)) {
    return NextResponse.json({ error: "Invalid subscriber address" }, { status: 400 });
  }

  const netConfig = NETWORKS[network];
  if (!netConfig) {
    return NextResponse.json({ error: "Invalid network. Use: arbitrum, base" }, { status: 400 });
  }

  try {
    // 1. Look up delegation in our DB
    await initDb();
    const storeKey = `${planId}_${subscriber.toLowerCase()}_${network}`;
    const rows = await sql`
      SELECT scope, subscriber_address FROM keeper_delegations WHERE store_key = ${storeKey}
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        active: false,
        planId,
        subscriber: subscriber.toLowerCase(),
        network,
        reason: "No active subscription found",
      });
    }

    const entry = rows[0];
    const scope = entry.scope as {
      sessionKeyAddress: string;
      interval: string;
      expiry: string;
    };

    const now = Math.floor(Date.now() / 1000);

    // 2. Expiry check (no RPC needed)
    if (now > Number(scope.expiry)) {
      return NextResponse.json({
        active: false,
        planId,
        subscriber: subscriber.toLowerCase(),
        network,
        reason: "Subscription authorization expired",
        expiry: new Date(Number(scope.expiry) * 1000).toISOString(),
      });
    }

    // 3. On-chain checks via subscriber's EIP-7702 delegated EOA
    const provider = new ethers.JsonRpcProvider(netConfig.rpc);
    const subscriberContract = new ethers.Contract(entry.subscriber_address, EXECUTOR_ABI, provider);

    const [isRevoked, lastPullRaw] = await Promise.all([
      subscriberContract.revokedSessionKeys(scope.sessionKeyAddress),
      subscriberContract.lastPullTimestamp(scope.sessionKeyAddress),
    ]);

    if (isRevoked) {
      return NextResponse.json({
        active: false,
        planId,
        subscriber: subscriber.toLowerCase(),
        network,
        reason: "Session key has been revoked by subscriber",
      });
    }

    const lastPull = Number(lastPullRaw);
    const interval = Number(scope.interval);
    const nextPull = lastPull + interval;
    const expiry = Number(scope.expiry);

    // Subscription is "current" if the last pull happened within this billing cycle
    // Grace period: 2 hours past due date
    const GRACE_SECONDS = 7200;
    const isCurrent = lastPull === 0
      ? true  // never pulled yet — subscription just started, still valid
      : now < nextPull + GRACE_SECONDS;

    // 4. Fetch plan info for context
    let planName = "";
    try {
      const registry = new ethers.Contract(PACT_REGISTRY, REGISTRY_ABI, provider);
      const plan = await registry.getPlan(BigInt(planId));
      planName = plan.name;
    } catch { /* non-critical */ }

    return NextResponse.json({
      active: isCurrent,
      planId,
      planName: planName || undefined,
      subscriber: subscriber.toLowerCase(),
      network,
      lastPull: lastPull > 0 ? new Date(lastPull * 1000).toISOString() : null,
      nextPull: lastPull > 0 ? new Date(nextPull * 1000).toISOString() : null,
      expiry: new Date(expiry * 1000).toISOString(),
      ...(isCurrent ? {} : { reason: "Payment overdue" }),
    });
  } catch (err: any) {
    console.error("[subscriptions/status]", err);
    return NextResponse.json({ error: "Internal error", detail: err.message }, { status: 500 });
  }
}
