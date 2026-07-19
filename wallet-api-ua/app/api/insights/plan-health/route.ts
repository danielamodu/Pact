import { NextResponse } from "next/server";
import {
  verifyOffChainPayment,
  BACKEND_WALLET_ADDRESS,
  type PaymentRequirements
} from "@/lib/openfort";

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
    const paymentHeader = req.headers.get("payment-signature") || req.headers.get("x-payment");

    if (!paymentHeader) {
      // Return HTTP 402 Payment Required
      const challengeResponse = {
        error: "Payment required",
        x402Version: PLAN_HEALTH_REQUIREMENTS.x402Version,
        paymentRequirements: PLAN_HEALTH_REQUIREMENTS
      };

      // Set headers for standard x402 discovery
      const headers = new Headers();
      headers.set(
        "PAYMENT-REQUIRED",
        Buffer.from(JSON.stringify(PLAN_HEALTH_REQUIREMENTS)).toString("base64")
      );

      return NextResponse.json(challengeResponse, {
        status: 402,
        headers
      });
    }

    // Verify the payment signature off-chain
    try {
      await verifyOffChainPayment(paymentHeader, PLAN_HEALTH_REQUIREMENTS);
    } catch (verifErr: any) {
      console.error("[x402] Verification failed:", verifErr.message || verifErr);
      return NextResponse.json(
        { error: "Payment verification failed", details: verifErr.message || "Invalid signature" },
        { status: 402 }
      );
    }

    // Return the plan health detailed insights (protected data)
    const analyticsData = {
      success: true,
      message: "Payment successfully verified. Analytics unlocked!",
      data: {
        activeSubscribers: 142,
        mrr: 7100,
        churnRate: "2.4%",
        averageLtv: 820,
        dailyPaymentsSucceeded: 48,
        dailyPaymentsFailed: 0,
        unlockedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(analyticsData, {
      headers: {
        "PAYMENT-RESPONSE": "Payment accepted"
      }
    });
  } catch (error: any) {
    console.error("[x402] Internal route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
