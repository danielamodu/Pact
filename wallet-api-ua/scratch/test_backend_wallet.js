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

// Override base URL to point to active .io domain instead of dead .xyz domain
process.env.OPENFORT_BASE_URL = "https://api.openfort.io";
const apiKey = process.env.OPENFORT_SECRET_KEY;

async function main() {
  const walletSecret = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgpKy2VvPzDaf5x6obkw+MWGo4+CE7xSmVIzwKthZGUMyhRANCAAROkEsgDMXFARFYtXilmMW0dQW0aKSNo4D3YJFlZHSEkVvQwlDI0lAGfCNbV5Ee1yoGjTSUaa9O1Z/9lh+xQ6vO";
  const openfort = new Openfort(apiKey, { walletSecret });
  console.log("=== Querying Openfort Backend Wallets ===");
  
  try {
    const response = await openfort.accounts.evm.backend.list();
    if (response.accounts.length === 0) {
      console.log("No accounts found. Creating one with chainId 421614...");
      const newAcc = await openfort.accounts.evm.backend.create({ chainId: 421614 });
      console.log("SUCCESS! Created Backend Account:", JSON.stringify(newAcc, null, 2));
    } else {
      console.log("Existing Backend Accounts:", JSON.stringify(response.accounts, null, 2));
    }
  } catch(e) {
    console.error("Failed:", e.message || e);
  }
}

main().catch(console.error);
