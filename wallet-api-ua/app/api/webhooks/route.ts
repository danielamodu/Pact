import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, initWebhooksTable } from "@/lib/db";
import { randomBytes } from "crypto";

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

  // Generate a per-merchant signing secret — returned once, never again
  const webhookSecret = `whsec_${randomBytes(24).toString("hex")}`;

  await initWebhooksTable();
  await sql`
    INSERT INTO plan_webhooks (plan_id, network, webhook_url, webhook_secret)
    VALUES (${planId}, ${network}, ${webhookUrl}, ${webhookSecret})
    ON CONFLICT (plan_id, network) DO UPDATE SET
      webhook_url    = EXCLUDED.webhook_url,
      webhook_secret = EXCLUDED.webhook_secret,
      created_at     = NOW()
  `;

  // Return the secret once — merchant must save it, we won't show it again
  return NextResponse.json({ success: true, webhookSecret });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, network } = await req.json();
  await initWebhooksTable();
  await sql`DELETE FROM plan_webhooks WHERE plan_id = ${planId} AND network = ${network}`;
  return NextResponse.json({ success: true });
}
