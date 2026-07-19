const fs = require('fs');
const { ethers } = require('ethers');
const { UniversalAccount } = require('@particle-network/universal-account-sdk');

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
const projectAppUuid = process.env.NEXT_PUBLIC_APP_ID || "01bc1045-ed39-44c4-b1f2-ecfa8aff3be4";

async function main() {
  console.log("=== Testing Cross-Chain Transfer via Particle SDK ===");

  const keyPath = 'deployer.key';
  if (!fs.existsSync(keyPath)) {
    console.error("deployer.key not found");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey);
  const ownerAddress = wallet.address;

  console.log("EOA Owner Address:", ownerAddress);

  // Initialize UA with default config (name: "UNIVERSAL", version: "1.0.3")
  const ua = new UniversalAccount({
    projectId,
    projectClientKey,
    projectAppUuid,
    ownerAddress
  });

  const saOptions = await ua.getSmartAccountOptions();
  console.log("Smart Account Address:", saOptions.smartAccountAddress);

  // Create transfer: Sourcing from Base SA (where we have 0.00008 ETH)
  // Settling on Arbitrum One Mainnet (ID: 42161)
  // Amount: 0.00001 ETH
  console.log("Building cross-chain transfer transaction...");
  
  let transaction;
  try {
    transaction = await ua.createTransferTransaction({
      token: {
        chainId: 8453, // Base Mainnet
        address: ethers.ZeroAddress // Native ETH
      },
      amount: "0.00001",
      receiver: ownerAddress // Send to our EOA
    });
  } catch(e) {
    console.error("Failed to build transaction:", e.message || e);
    if (e.response && e.response.data) {
      console.error("Response data:", JSON.stringify(e.response.data, null, 2));
    }
    process.exit(1);
  }

  console.log("Transaction successfully built!");
  console.log("Root Hash:", transaction.rootHash);
  console.log("Token Changes:", JSON.stringify(transaction.tokenChanges, null, 2));

  // Sign rootHash
  console.log("Signing rootHash...");
  // Particle SDK expects the owner's signature over the raw 32-byte rootHash
  // Signed as personal message or raw digest. Let's try raw digest signing or personalSign
  const rootHashBytes = ethers.getBytes(transaction.rootHash);
  
  // Try personalSign (signMessage)
  const signature = await wallet.signMessage(rootHashBytes);
  console.log("Signature:", signature);

  console.log("Broadcasting transaction via Particle sendTransaction...");
  try {
    const result = await ua.sendTransaction(transaction, signature);
    console.log("RESULT:", JSON.stringify(result, null, 2));
  } catch(e) {
    console.error("FAILED to send transaction:", e.message || e);
    if (e.response && e.response.data) {
      console.error("Response data:", JSON.stringify(e.response.data, null, 2));
    }
  }
}

main().catch(console.error);
