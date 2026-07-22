import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, initWebhooksTable } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");
  const network = searchParams.get("network") || "arbitrum";
  if (!planId) return NextResponse.json({ error: "Missing planId" }, { status: 400 });

  await initWebhooksTable();
  const rows = await sql`
    SELECT webhook_url FROM plan_webhooks WHERE plan_id = ${planId} AND network = ${network}
  `;
  return NextResponse.json({ webhookUrl: rows[0]?.webhook_url || null });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, network, webhookUrl } = await req.json();
  if (!planId || !network || !webhookUrl) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    new URL(webhookUrl);
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  }

  await initWebhooksTable();
  await sql`
    INSERT INTO plan_webhooks (plan_id, network, webhook_url)
    VALUES (${planId}, ${network}, ${webhookUrl})
    ON CONFLICT (plan_id, network) DO UPDATE SET webhook_url = EXCLUDED.webhook_url, created_at = NOW()
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, network } = await req.json();
  await initWebhooksTable();
  await sql`DELETE FROM plan_webhooks WHERE plan_id = ${planId} AND network = ${network}`;
  return NextResponse.json({ success: true });
}
