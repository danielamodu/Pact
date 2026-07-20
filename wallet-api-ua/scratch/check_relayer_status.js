const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

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

async function main() {
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  if (!relayerKey) {
    console.error("RELAYER_PRIVATE_KEY not found in .env");
    return;
  }

  const arbProvider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);

  const walletArb = new ethers.Wallet(relayerKey, arbProvider);
  const walletBase = new ethers.Wallet(relayerKey, baseProvider);

  console.log(`Relayer Address: ${walletArb.address}`);
  
  const arbBal = await arbProvider.getBalance(walletArb.address);
  const arbNonce = await arbProvider.getTransactionCount(walletArb.address);
  console.log(`Arbitrum - Balance: ${ethers.formatEther(arbBal)} ETH, Nonce: ${arbNonce}`);

  const baseBal = await baseProvider.getBalance(walletBase.address);
  const baseNonce = await baseProvider.getTransactionCount(walletBase.address);
  console.log(`Base - Balance: ${ethers.formatEther(baseBal)} ETH, Nonce: ${baseNonce}`);
}

main().catch(console.error);
