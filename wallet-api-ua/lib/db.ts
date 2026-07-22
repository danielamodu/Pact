import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS keeper_delegations (
      store_key         TEXT PRIMARY KEY,
      private_key       TEXT NOT NULL,
      owner_signature   TEXT NOT NULL,
      subscriber_address TEXT NOT NULL,
      plan_id           TEXT NOT NULL,
      network           TEXT NOT NULL,
      scope             JSONB NOT NULL,
      stored_at         TIMESTAMPTZ DEFAULT NOW(),
      stored_by         TEXT
    )
  `;
}

export async function initWebhooksTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS plan_webhooks (
      plan_id        TEXT NOT NULL,
      network        TEXT NOT NULL,
      webhook_url    TEXT NOT NULL,
      webhook_secret TEXT NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (plan_id, network)
    )
  `;
  // Add webhook_secret column to existing tables that predate this migration
  await sql`
    ALTER TABLE plan_webhooks ADD COLUMN IF NOT EXISTS webhook_secret TEXT NOT NULL DEFAULT ''
  `;
}
