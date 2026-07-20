const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

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

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';

const deployerAddress = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';

async function sweep(name, rpc) {
  console.log(`\n==================================================`);
  console.log(`Sweeping on ${name}...`);
  const provider = new ethers.JsonRpcProvider(rpc);
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerKey) {
    console.error("RELAYER_PRIVATE_KEY not found in .env");
    return;
  }
  const relayerWallet = new ethers.Wallet(relayerKey, provider);

  const balance = await provider.getBalance(relayerWallet.address);
  console.log(`Relayer Address: ${relayerWallet.address}`);
  console.log(`Relayer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log("Zero balance, skipping...");
    return;
  }

  // We want to transfer 0.00012 ETH to the deployer
  const transferAmount = ethers.parseEther("0.00012");
  if (balance < transferAmount) {
    console.error("Relayer balance is too low to transfer 0.00012 ETH");
    return;
  }

  console.log(`Sending 0.00012 ETH to deployer ${deployerAddress}...`);
  const tx = await relayerWallet.sendTransaction({
    to: deployerAddress,
    value: transferAmount
  });
  console.log(`Sent. Tx Hash: ${tx.hash}`);
  await tx.wait();
  console.log("Confirmed!");
}

async function main() {
  await sweep("Arbitrum", ARBITRUM_RPC);
  await sweep("Base", BASE_RPC);
}

main().catch(console.error);
