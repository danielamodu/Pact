const fs = require('fs');
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

const { UniversalAccount } = require('@particle-network/universal-account-sdk');

const ownerAddress = "0x4F31f7C529bf0cD0846E593fc043c552475A839c";
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "8e0b60ba-6c33-4293-bfb8-f33f8d889114";
const projectClientKey = process.env.NEXT_PUBLIC_CLIENT_KEY || "c27MqU6j4lNYOhOXUsU29A8met2N9KsJli0Ic55u";
const projectAppUuid = process.env.NEXT_PUBLIC_APP_ID || "01bc1045-ed39-44c4-b1f2-ecfa8aff3be4";

const combinations = [
  { name: "BICONOMY", version: "1.0.3" },
  { name: "SIMPLE", version: "1.0.3" },
  { name: "BICONOMY", version: "2.0.0" },
  { name: "BICONOMY", version: "1.0.0" },
  { name: "SIMPLE", version: "1.0.0" },
  { name: "SIMPLE", version: "2.0.0" },
  { name: "LIGHT", version: "1.0.0" },
  { name: "CYBERCONNECT", version: "1.0.0" }
];

async function testCombination(chainId, chainName, combo) {
  const ua = new UniversalAccount({
    projectId,
    projectClientKey,
    projectAppUuid,
    ownerAddress,
    smartAccountOptions: {
      name: combo.name,
      version: combo.version,
      ownerAddress,
      useEIP7702: true
    }
  });

  try {
    const auth = await ua.getEIP7702Auth([chainId]);
    console.log(`[SUCCESS] Chain: ${chainName}, Combo: ${combo.name} v${combo.version} ->`, JSON.stringify(auth));
    return true;
  } catch (error) {
    console.log(`[FAILED] Chain: ${chainName}, Combo: ${combo.name} v${combo.version} -> Error: ${error.message || error}`);
    return false;
  }
}

async function main() {
  console.log("=== Running getEIP7702Auth combinations for Arbitrum (42161) ===");
  for (const combo of combinations) {
    await testCombination(42161, "Arbitrum One", combo);
  }

  console.log("\n=== Running getEIP7702Auth combinations for Base (8453) ===");
  for (const combo of combinations) {
    await testCombination(8453, "Base Mainnet", combo);
  }
}

main().catch(console.error);
