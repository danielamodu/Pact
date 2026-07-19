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
  console.log("=== Sweeping All ETH from Smart Account to EOA on Base ===");

  const keyPath = 'deployer.key';
  if (!fs.existsSync(keyPath)) {
    console.error("deployer.key not found");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey);
  const ownerAddress = wallet.address;

  const ua = new UniversalAccount({
    projectId,
    projectClientKey,
    projectAppUuid,
    ownerAddress,
    smartAccountOptions: {
      name: "UNIVERSAL",
      version: "1.0.3",
      ownerAddress,
      useEIP7702: false
    }
  });

  const saOptions = await ua.getSmartAccountOptions();
  console.log("Smart Account Address:", saOptions.smartAccountAddress);

  // Fetch current SA balance on Base
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const balance = await provider.getBalance(saOptions.smartAccountAddress);
  console.log("Current SA Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.log("No balance to sweep.");
    return;
  }

  // We leave 0.0001 ETH for gas fee and transfer the rest
  const gasReserve = ethers.parseEther("0.0001");
  if (balance <= gasReserve) {
    console.log("Balance is too low to cover gas reserve.");
    return;
  }

  const sweepAmount = balance - gasReserve;
  const sweepAmountEth = ethers.formatEther(sweepAmount);
  console.log(`Sweeping ${sweepAmountEth} ETH to EOA...`);

  const transaction = await ua.createTransferTransaction({
    token: {
      chainId: 8453, // Base Mainnet
      address: ethers.ZeroAddress
    },
    amount: sweepAmountEth,
    receiver: ownerAddress
  });

  console.log("Signing transaction...");
  const rootHashBytes = ethers.getBytes(transaction.rootHash);
  const signature = await wallet.signMessage(rootHashBytes);

  console.log("Broadcasting transaction...");
  const result = await ua.sendTransaction(transaction, signature);
  console.log("Broadcast result:", JSON.stringify(result, null, 2));

  // Loop checking status until finished
  console.log("Waiting for confirmation...");
  const txId = result.transactionId;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const status = await ua.getTransaction(txId);
    if (status && status.status === 7) {
      const op = status.lendingUserOperations[0] || status.settlementUserOperations[0];
      console.log("SUCCESS! Swept successfully.");
      console.log("Transaction Hash:", op.txHash);
      return;
    }
    console.log(`Checking... Status code: ${status?.status}`);
  }
}

main().catch(console.error);
