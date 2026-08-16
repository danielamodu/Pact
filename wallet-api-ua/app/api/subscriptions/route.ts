import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Returns the caller's stored session-key delegations so the dashboard can recover
 * subscription state when localStorage has been cleared or the user switched devices.
 *
 * Scoped to the signed-in account — private keys are never included in the response.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const network = searchParams.get("network");

    const rows = planId && network
      ? await sql`
          SELECT store_key, subscriber_address, plan_id, network, scope, stored_at
          FROM keeper_delegations
          WHERE stored_by = ${session.user.email}
            AND plan_id = ${planId}
            AND network = ${network}
        `
      : await sql`
          SELECT store_key, subscriber_address, plan_id, network, scope, stored_at
          FROM keeper_delegations
          WHERE stored_by = ${session.user.email}
          ORDER BY stored_at DESC
        `;

    const now = Math.floor(Date.now() / 1000);
    const subscriptions = rows.map((row: any) => ({
      planId: row.plan_id,
      network: row.network,
      subscriberAddress: row.subscriber_address,
      sessionKeyAddress: row.scope?.sessionKeyAddress ?? null,
      recipient: row.scope?.recipient ?? null,
      maxAmount: row.scope?.maxAmount ?? null,
      token: row.scope?.token ?? null,
      interval: row.scope?.interval ?? null,
      expiry: row.scope?.expiry ?? null,
      expired: row.scope?.expiry ? Number(row.scope.expiry) <= now : false,
      storedAt: row.stored_at,
    }));

    return NextResponse.json({ success: true, subscriptions });
  } catch (err: any) {
    console.error("[Subscriptions] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
