const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';

async function main() {
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("deployer.key not found");
    return;
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  const arbProvider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);

  const walletArb = new ethers.Wallet(privateKey, arbProvider);
  const walletBase = new ethers.Wallet(privateKey, baseProvider);

  console.log(`Address: ${walletArb.address}`);
  
  const arbBal = await arbProvider.getBalance(walletArb.address);
  const arbNonce = await arbProvider.getTransactionCount(walletArb.address);
  console.log(`Arbitrum - Balance: ${ethers.formatEther(arbBal)} ETH, Nonce: ${arbNonce}`);

  const baseBal = await baseProvider.getBalance(walletBase.address);
  const baseNonce = await baseProvider.getTransactionCount(walletBase.address);
  console.log(`Base - Balance: ${ethers.formatEther(baseBal)} ETH, Nonce: ${baseNonce}`);
}

main().catch(console.error);
