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

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "8e0b60ba-6c33-4293-bfb8-f33f8d889114";
const projectClientKey = process.env.NEXT_PUBLIC_CLIENT_KEY || "c27MqU6j4lNYOhOXUsU29A8met2N9KsJli0Ic55u";
const ownerAddress = "0x4F31f7C529bf0cD0846E593fc043c552475A839c";

async function testRpc(chainId, name) {
  console.log(`\n--- Testing raw RPC for ${name} (ID: ${chainId}) ---`);
  
  const payload = {
    id: Date.now(),
    jsonrpc: "2.0",
    method: "universal_createEIP7702DelegationAuth",
    params: [
      {
        ownerAddress: ownerAddress,
        name: "BICONOMY",
        version: "1.0.3",
        useEIP7702: true
      },
      {
        chainIds: [chainId]
      }
    ],
    deviceId: "09050c3a-f6bb-4495-ae48-39da2d7ae42e",
    projectId: projectId,
    projectClientKey: projectClientKey
  };

  try {
    const response = await fetch("https://universal-rpc.particle.network/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    try {
      const parsed = JSON.parse(text);
      console.log(`Response:`, JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log(`Raw Response:`, text);
    }
  } catch (error) {
    console.error(`Error for ${name}:`, error.message || error);
  }
}

async function main() {
  await testRpc(42161, "Arbitrum One Mainnet");
  await testRpc(8453, "Base Mainnet");
}

main().catch(console.error);
