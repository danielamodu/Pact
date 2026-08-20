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
      stored_by         TEXT,
      key_version       INT NOT NULL DEFAULT 1
    )
  `;
  // Explicit encryption marker instead of guessing from ciphertext shape.
  // Every row this app has ever written was encrypted, so backfilling
  // existing rows to 1 reflects reality rather than assuming it.
  await sql`
    ALTER TABLE keeper_delegations ADD COLUMN IF NOT EXISTS key_version INT NOT NULL DEFAULT 1
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

export async function initSponsorshipsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS relayer_sponsorships (
      id                 BIGSERIAL PRIMARY KEY,
      subscriber_address TEXT NOT NULL,
      network            TEXT NOT NULL,
      tx_hash            TEXT,
      sponsored_at       TIMESTAMPTZ DEFAULT NOW()
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
  await sql`
    ALTER TABLE plan_webhooks ADD COLUMN IF NOT EXISTS webhook_secret TEXT NOT NULL DEFAULT ''
  `;
}
