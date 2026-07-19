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
const walletSecret = process.env.OPENFORT_WALLET_SECRET;
const walletId = process.env.OPENFORT_BACKEND_WALLET_ID;
const walletAddress = process.env.OPENFORT_BACKEND_WALLET_ADDRESS;

async function main() {
  console.log("=== Testing signTypedData on Backend Wallet ===");
  const openfort = new Openfort(apiKey, { walletSecret });

  try {
    const account = await openfort.accounts.evm.backend.get({ id: walletId });
    console.log("SUCCESS! Got account address:", account.address);
    console.log("Account object keys:", Object.keys(account));

    // Sign message test
    if (typeof account.signTypedData === 'function') {
      console.log("signTypedData method exists! Testing...");
      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: 84532, // Base Sepolia
        verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      };

      const message = {
        from: account.address,
        to: "0x320d034d76c4c79b12850d288bf68044abe7bf2f",
        value: 10000n,
        validAfter: 0n,
        validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600),
        nonce: "0x" + "00".repeat(32)
      };

      const TRANSFER_WITH_AUTHORIZATION_TYPES = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" }
        ]
      };

      const signature = await account.signTypedData({
        domain,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message
      });

      console.log("SUCCESS! Signature generated:", signature);
    } else {
      console.error("signTypedData method is missing on account!");
    }
  } catch(e) {
    console.error("Failed:", e.message || e);
  }
}

main().catch(console.error);
