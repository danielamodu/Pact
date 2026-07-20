/**
 * Pact Protocol — Store Delegation API Route
 *
 * Called by the permission page after a successful subscription to persist
 * the session key delegation server-side so the keeper can execute pulls.
 *
 * POST /api/keeper/store-delegation
 * Body: { privateKey, ownerSignature, subscriberAddress, planId, network, scope }
 *
 * In production, replace the flat JSON file with a proper encrypted database.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Must be authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { privateKey, ownerSignature, subscriberAddress, planId, network, scope } = body;

    if (!privateKey || !ownerSignature || !subscriberAddress || !planId || !network || !scope) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (network !== "arbitrum" && network !== "base") {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 });
    }

    // Read existing store
    const storePath = path.join(process.cwd(), "keeper-store.json");
    let store: Record<string, unknown> = {};
    if (existsSync(storePath)) {
      try {
        store = JSON.parse(readFileSync(storePath, "utf8"));
      } catch { /* start fresh */ }
    }

    // Key: planId_subscriberAddress_network — one entry per subscriber per plan per network
    const storeKey = `${planId}_${subscriberAddress.toLowerCase()}_${network}`;

    store[storeKey] = {
      privateKey,
      ownerSignature,
      subscriberAddress: subscriberAddress.toLowerCase(),
      planId: planId.toString(),
      network,
      scope: {
        sessionKeyAddress: scope.sessionKeyAddress,
        recipient: scope.recipient,
        maxAmount: scope.maxAmount.toString(),
        token: scope.token,
        interval: scope.interval.toString(),
        expiry: scope.expiry.toString(),
        planId: scope.planId.toString(),
      },
      storedAt: new Date().toISOString(),
      storedBy: session.user.email,
    };

    writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");

    console.log(`[KeeperStore] Stored delegation for ${storeKey}`);
    return NextResponse.json({ success: true, storeKey });
  } catch (err: any) {
    console.error("[KeeperStore] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { planId, subscriberAddress, network } = await req.json();
    if (!planId || !subscriberAddress || !network) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const storePath = path.join(process.cwd(), "keeper-store.json");
    if (!existsSync(storePath)) {
      return NextResponse.json({ success: true, message: "Nothing to remove" });
    }

    const store = JSON.parse(readFileSync(storePath, "utf8"));
    const storeKey = `${planId}_${subscriberAddress.toLowerCase()}_${network}`;
    delete store[storeKey];
    writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");

    console.log(`[KeeperStore] Removed delegation for ${storeKey}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
