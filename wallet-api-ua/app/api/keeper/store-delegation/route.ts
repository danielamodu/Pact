import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, initDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

    await initDb();

    const storeKey = `${planId}_${subscriberAddress.toLowerCase()}_${network}`;
    const scopeJson = {
      sessionKeyAddress: scope.sessionKeyAddress,
      recipient: scope.recipient,
      maxAmount: scope.maxAmount.toString(),
      token: scope.token,
      interval: scope.interval.toString(),
      expiry: scope.expiry.toString(),
      planId: scope.planId.toString(),
    };

    await sql`
      INSERT INTO keeper_delegations
        (store_key, private_key, owner_signature, subscriber_address, plan_id, network, scope, stored_by)
      VALUES
        (${storeKey}, ${encrypt(privateKey)}, ${ownerSignature}, ${subscriberAddress.toLowerCase()},
         ${planId.toString()}, ${network}, ${JSON.stringify(scopeJson)}, ${session.user.email})
      ON CONFLICT (store_key) DO UPDATE SET
        private_key       = EXCLUDED.private_key,
        owner_signature   = EXCLUDED.owner_signature,
        scope             = EXCLUDED.scope,
        stored_at         = NOW(),
        stored_by         = EXCLUDED.stored_by
    `;

    console.log(`[KeeperStore] Upserted delegation for ${storeKey}`);
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
    const { planId, network } = await req.json();
    if (!planId || !network) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await initDb();

    // Scoped to the signed-in owner rather than a client-supplied address, so a
    // wrong or stale address can never leave the delegation live in the keeper.
    const deleted = await sql`
      DELETE FROM keeper_delegations
      WHERE plan_id = ${planId.toString()}
        AND network = ${network}
        AND stored_by = ${session.user.email}
      RETURNING store_key
    `;

    console.log(`[KeeperStore] Removed ${deleted.length} delegation(s) for plan ${planId} on ${network}`);
    return NextResponse.json({ success: true, removed: deleted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
