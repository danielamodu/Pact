import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, initNotificationsTable } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Payment receipts for a subscriber, written by the keeper on each successful pull.
 * Gives subscribers their own record of what was charged, rather than only the
 * merchant receiving a webhook.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initNotificationsTable();

    const { searchParams } = new URL(req.url);
    const subscriber = searchParams.get("subscriber");
    if (!subscriber) {
      return NextResponse.json({ error: "Missing subscriber address" }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, plan_id, network, event, amount, token, tx_hash, read_at, created_at
      FROM subscriber_notifications
      WHERE subscriber_address = ${subscriber.toLowerCase()}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      unreadCount: rows.filter((r: any) => !r.read_at).length,
      notifications: rows.map((r: any) => ({
        id: String(r.id),
        planId: r.plan_id,
        network: r.network,
        event: r.event,
        amount: r.amount,
        token: r.token,
        txHash: r.tx_hash,
        read: !!r.read_at,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error("[Notifications] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

/** Marks all of a subscriber's notifications as read. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subscriber } = await req.json();
    if (!subscriber) {
      return NextResponse.json({ error: "Missing subscriber address" }, { status: 400 });
    }

    await initNotificationsTable();
    await sql`
      UPDATE subscriber_notifications
      SET read_at = NOW()
      WHERE subscriber_address = ${String(subscriber).toLowerCase()} AND read_at IS NULL
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
