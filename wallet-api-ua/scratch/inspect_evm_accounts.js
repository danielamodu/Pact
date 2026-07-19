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
  console.log("=== Inspecting openfort.accounts.evm ===");
  if (openfort.accounts && openfort.accounts.evm) {
    console.log("evm keys:", Object.keys(openfort.accounts.evm));
  }
}

main().catch(console.error);
