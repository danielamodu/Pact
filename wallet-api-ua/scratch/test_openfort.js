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
  console.log("=== Testing Openfort Node SDK ===");
  console.log("API Key loaded:", apiKey ? "YES" : "NO");

  const openfort = new Openfort(apiKey);

  console.log("SDK Keys:", Object.keys(openfort));

  try {
    // List backend accounts or projects
    console.log("Checking project/accounts list...");
    // Let's print out what methods are available on openfort.accounts
    if (openfort.accounts) {
      console.log("openfort.accounts keys:", Object.keys(openfort.accounts));
    }
  } catch(e) {
    console.error("Error:", e.message || e);
  }
}

main().catch(console.error);
