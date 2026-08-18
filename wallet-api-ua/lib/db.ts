import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, { ssl: "require" });

// Tagged-template sql helper matching the @neondatabase/serverless API
export const sql = client;

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

export async function initKeeperRunsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS keeper_runs (
      id          BIGSERIAL PRIMARY KEY,
      total       INT NOT NULL DEFAULT 0,
      executed    INT NOT NULL DEFAULT 0,
      skipped     INT NOT NULL DEFAULT 0,
      errors      INT NOT NULL DEFAULT 0,
      detail      JSONB,
      ran_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function initNotificationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS subscriber_notifications (
      id                 BIGSERIAL PRIMARY KEY,
      subscriber_address TEXT NOT NULL,
      plan_id            TEXT NOT NULL,
      network            TEXT NOT NULL,
      event              TEXT NOT NULL,
      amount             TEXT,
      token              TEXT,
      tx_hash            TEXT,
      read_at            TIMESTAMPTZ,
      created_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS subscriber_notifications_address_idx
      ON subscriber_notifications (subscriber_address, created_at DESC)
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
  await sql`
    ALTER TABLE plan_webhooks ADD COLUMN IF NOT EXISTS webhook_secret TEXT NOT NULL DEFAULT ''
  `;
}
