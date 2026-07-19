const fs = require('fs');
const OpenfortModule = require('@openfort/openfort-node');
const Openfort = OpenfortModule.default || OpenfortModule;

// Parse .env manually
try {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
} catch(e) {}

const apiKey = process.env.OPENFORT_SECRET_KEY;

async function main() {
  const openfort = new Openfort(apiKey);
  console.log("=== Inspecting Openfort Client ===");
  
  // Get all getters on Openfort prototype
  const proto = Object.getPrototypeOf(openfort);
  const properties = Object.getOwnPropertyNames(proto);
  console.log("Prototype properties:", properties);

  // Print all top-level keys
  const keys = ['accounts', 'apiKeys', 'assets', 'inventories', 'players', 'policies', 'projects', 'sessions', 'transactionIntents', 'webhooks', 'subscriptions', 'backendWallets', 'developerWallets', 'google', 'contracts', 'devices'];
  for (const key of keys) {
    try {
      const val = openfort[key];
      if (val) {
        console.log(`- ${key}: exists, type ${typeof val}, keys:`, Object.keys(val));
      }
    } catch(e) {
      // Ignored
    }
  }
}

main().catch(console.error);
