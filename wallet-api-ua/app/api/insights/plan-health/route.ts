import { NextResponse } from "next/server";
import {
  verifyOffChainPayment,
  settlePaymentOnChain,
  decodeAndParsePaymentHeader,
  BACKEND_WALLET_ADDRESS,
  type PaymentRequirements
} from "@/lib/openfort";
import { getPlanDetails } from "@/lib/contracts";
import { sql, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const PLAN_HEALTH_REQUIREMENTS: PaymentRequirements = {
  x402Version: 2,
  scheme: "exact",
  network: "base",
  maxAmountRequired: "50000", // 0.05 USDC (6 decimals)
  resource: "/api/insights/plan-health",
  description: "Pact Plan Health Insights Pay-Per-Call",
  mimeType: "application/json",
  payTo: BACKEND_WALLET_ADDRESS as `0x${string}`,
  maxTimeoutSeconds: 300,
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
  extra: {
    // Must match the token's own EIP-712 domain exactly or transferWithAuthorization
    // reverts with "FiatTokenV2: invalid signature". Verified against each
    // contract's on-chain DOMAIN_SEPARATOR:
    //   Base mainnet USDC -> name() == "USD Coin", version() == "2"
    //   Base Sepolia USDC -> name() == "USDC",     version() == "2"
    // Both the client signer and verifyOffChainPayment read these values, so a
    // wrong value here passes our own verification and only fails on-chain.
    name: "USD Coin",
    version: "2"
  }
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const network = searchParams.get("network") as "arbitrum" | "base" || "arbitrum";

    const paymentHeader = req.headers.get("payment-signature") || req.headers.get("x-payment");

    if (!paymentHeader) {
      const challengeResponse = {
        error: "Payment required",
        x402Version: PLAN_HEALTH_REQUIREMENTS.x402Version,
        paymentRequirements: PLAN_HEALTH_REQUIREMENTS
      };

      const headers = new Headers();
      headers.set(
        "PAYMENT-REQUIRED",
        Buffer.from(JSON.stringify(PLAN_HEALTH_REQUIREMENTS)).toString("base64")
      );

      return NextResponse.json(challengeResponse, { status: 402, headers });
    }

    let settlementTxHash: string;
    let settledBy: "openfort" | "relayer";
    try {
      await verifyOffChainPayment(paymentHeader, PLAN_HEALTH_REQUIREMENTS);
      const payment = decodeAndParsePaymentHeader(paymentHeader);
      const settlement = await settlePaymentOnChain(payment);
      settlementTxHash = settlement.txHash;
      settledBy = settlement.settledBy;
    } catch (verifErr: any) {
      console.error("[x402] Verification or settlement failed:", verifErr.message || verifErr);
      return NextResponse.json(
        { error: "Payment verification failed", details: verifErr.message || "Invalid signature" },
        { status: 402 }
      );
    }

    let analyticsData = {
      isDemoData: false,
      activeSubscribers: 0,
      mrr: 0,
      churnRate: "N/A",
      averageLtv: 0,
      dailyPaymentsSucceeded: 0,
      dailyPaymentsFailed: 0,
      totalRevenue: "0.00",
      token: "ETH",
      unlockedAt: new Date().toISOString(),
      fetchError: null as string | null,
    };

    if (planId) {
      // Compute churn from delegation DB (keeper never deletes expired rows)
      let churnRate = "N/A";
      try {
        await initDb();
        const now = Math.floor(Date.now() / 1000);
        const rows = await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE (scope->>'expiry')::bigint <= ${now})::int AS expired
          FROM keeper_delegations
          WHERE plan_id = ${planId} AND network = ${network}
        `;
        const total = Number(rows[0]?.total ?? 0);
        const expired = Number(rows[0]?.expired ?? 0);
        if (total > 0) {
          churnRate = `${((expired / total) * 100).toFixed(1)}%`;
        }
      } catch (dbErr: any) {
        console.warn("[x402] Failed to compute churn rate:", dbErr);
      }

      try {
        const details = await getPlanDetails(planId, network);
        if (details) {
          const priceNum = parseFloat(details.price.replace(/,/g, "")) || 0;
          const totalRevenueNum = parseFloat(details.totalRevenue.replace(/,/g, "")) || 0;

          analyticsData = {
            isDemoData: false,
            activeSubscribers: details.subscribersCount,
            mrr: Math.round(priceNum * details.subscribersCount * 100000) / 100000,
            churnRate,
            averageLtv: details.subscribersCount > 0
              ? Math.round((totalRevenueNum / details.subscribersCount) * 100000) / 100000
              : priceNum,
            dailyPaymentsSucceeded: details.pullsLast24h,
            dailyPaymentsFailed: 0,
            totalRevenue: details.totalRevenue,
            token: details.token,
            unlockedAt: new Date().toISOString(),
            fetchError: null,
          };
        }
      } catch (contractErr: any) {
        console.warn("[x402] Failed to fetch real-time plan details:", contractErr);
        analyticsData.fetchError = "Could not reach chain — showing empty state.";
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment settled on-chain. Real-time product analytics unlocked!",
      settlementTxHash,
      settledBy,
      data: analyticsData
    }, {
      headers: { "PAYMENT-RESPONSE": "Payment accepted" }
    });
  } catch (error: any) {
    console.error("[x402] Internal route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
