import { NextResponse } from "next/server";
import {
  verifyOffChainPayment,
  BACKEND_WALLET_ADDRESS,
  type PaymentRequirements
} from "@/lib/openfort";
import { getPlanDetails } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const PLAN_HEALTH_REQUIREMENTS: PaymentRequirements = {
  x402Version: 2,
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: "50000", // 0.05 USDC (6 decimals)
  resource: "/api/insights/plan-health",
  description: "Pact Plan Health Insights Pay-Per-Call",
  mimeType: "application/json",
  payTo: BACKEND_WALLET_ADDRESS as `0x${string}`,
  maxTimeoutSeconds: 300,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  extra: {
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

    try {
      await verifyOffChainPayment(paymentHeader, PLAN_HEALTH_REQUIREMENTS);
    } catch (verifErr: any) {
      console.error("[x402] Verification failed:", verifErr.message || verifErr);
      return NextResponse.json(
        { error: "Payment verification failed", details: verifErr.message || "Invalid signature" },
        { status: 402 }
      );
    }

    let analyticsData = {
      isDemoData: false,
      activeSubscribers: 0,
      mrr: 0,
      churnRate: "0.0%",
      averageLtv: 0,
      dailyPaymentsSucceeded: 0,
      dailyPaymentsFailed: 0,
      totalRevenue: "0.00",
      token: "ETH",
      unlockedAt: new Date().toISOString(),
      fetchError: null as string | null,
    };

    if (planId) {
      try {
        const details = await getPlanDetails(planId, network);
        if (details) {
          const priceNum = parseFloat(details.price.replace(/,/g, "")) || 0;
          const totalRevenueNum = parseFloat(details.totalRevenue.replace(/,/g, "")) || 0;

          analyticsData = {
            isDemoData: false,
            activeSubscribers: details.subscribersCount,
            mrr: Math.round(priceNum * details.subscribersCount * 100000) / 100000,
            churnRate: "0.0%",
            averageLtv: details.subscribersCount > 0
              ? Math.round((totalRevenueNum / details.subscribersCount) * 100000) / 100000
              : priceNum,
            dailyPaymentsSucceeded: details.subscribersCount,
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
      message: analyticsData.isDemoData
        ? "Payment successfully verified. Demo analytics unlocked!"
        : "Payment successfully verified. Real-time product analytics unlocked!",
      data: analyticsData
    }, {
      headers: { "PAYMENT-RESPONSE": "Payment accepted" }
    });
  } catch (error: any) {
    console.error("[x402] Internal route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
