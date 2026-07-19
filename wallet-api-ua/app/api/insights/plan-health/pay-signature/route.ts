import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  getOpenfortClient,
  BACKEND_WALLET_ID,
  BACKEND_WALLET_ADDRESS,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  type PaymentPayload
} from "@/lib/openfort";
import { getAddress, type Hex } from "viem";

export const dynamic = "force-dynamic";

function generateNonce(): Hex {
  return `0x${randomBytes(32).toString("hex")}` as Hex;
}

export async function POST(req: Request) {
  try {
    const openfort = getOpenfortClient();
    
    if (!BACKEND_WALLET_ID) {
      return NextResponse.json(
        { error: "OPENFORT_BACKEND_WALLET_ID not configured on server" },
        { status: 500 }
      );
    }

    // Retrieve backend wallet account
    const account = await openfort.accounts.evm.backend.get({ id: BACKEND_WALLET_ID });
    
    if (!account) {
      return NextResponse.json(
        { error: "Failed to retrieve backend wallet account from Openfort" },
        { status: 500 }
      );
    }

    // Set parameters matching requirements of PLAN_HEALTH_REQUIREMENTS
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(nowSeconds - 600);
    const validBefore = BigInt(nowSeconds + 300);
    const nonce = generateNonce();
    const payTo = getAddress(BACKEND_WALLET_ADDRESS!);
    const asset = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const value = "50000";

    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: 84532, // Base Sepolia
      verifyingContract: asset,
    };

    const message = {
      from: getAddress(account.address),
      to: payTo,
      value: BigInt(value),
      validAfter,
      validBefore,
      nonce,
    };

    // Sign the payload via the Openfort HSM/TEE backend wallet
    console.log("[x402 Sign] Requesting backend wallet signature...");
    const signature = await account.signTypedData({
      domain,
      types: TRANSFER_WITH_AUTHORIZATION_TYPES,
      primaryType: "TransferWithAuthorization",
      message,
    });

    console.log("[x402 Sign] Signature generated successfully:", signature);

    // Build the payload
    const payload: PaymentPayload = {
      x402Version: 2,
      scheme: "exact",
      network: "base-sepolia",
      payload: {
        signature,
        authorization: {
          from: getAddress(account.address),
          to: payTo,
          value,
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    };

    const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");

    return NextResponse.json({
      success: true,
      paymentHeader: encoded,
      payerAddress: account.address,
      recipientAddress: payTo
    });
  } catch (error: any) {
    console.error("[x402 Sign] Error signing payload:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sign payment payload" },
      { status: 500 }
    );
  }
}
