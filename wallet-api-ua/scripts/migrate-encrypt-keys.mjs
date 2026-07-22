/**
 * One-time migration: encrypt all plaintext private_key values in keeper_delegations.
 * Run once after deploying the encryption changes:
 *   node scripts/migrate-encrypt-keys.mjs
 */

import { neon } from "@neondatabase/serverless";
import { createCipheriv, randomBytes } from "crypto";
import { readFileSync } from "fs";

// Parse .env manually (no dotenv dependency needed)
try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch { /* .env optional */ }

const sql = neon(process.env.DATABASE_URL);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error("ENCRYPTION_KEY not set in .env");
  process.exit(1);
}

function encrypt(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function isEncrypted(value) {
  return value.split(":").length === 3 && value.length > 80;
}

async function main() {
  // Create table if it doesn't exist yet
  await sql`
    CREATE TABLE IF NOT EXISTS keeper_delegations (
      store_key TEXT PRIMARY KEY, private_key TEXT NOT NULL, owner_signature TEXT NOT NULL,
      subscriber_address TEXT NOT NULL, plan_id TEXT NOT NULL, network TEXT NOT NULL,
      scope JSONB NOT NULL, stored_at TIMESTAMPTZ DEFAULT NOW(), stored_by TEXT
    )
  `;

  const rows = await sql`SELECT store_key, private_key FROM keeper_delegations`;
  console.log(`Found ${rows.length} rows`);

  let migrated = 0;
  for (const row of rows) {
    if (isEncrypted(row.private_key)) {
      console.log(`  [skip] ${row.store_key} — already encrypted`);
      continue;
    }
    const encryptedKey = encrypt(row.private_key);
    await sql`UPDATE keeper_delegations SET private_key = ${encryptedKey} WHERE store_key = ${row.store_key}`;
    console.log(`  [done] ${row.store_key} — encrypted`);
    migrated++;
  }

  console.log(`\nMigration complete. ${migrated}/${rows.length} rows encrypted.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
