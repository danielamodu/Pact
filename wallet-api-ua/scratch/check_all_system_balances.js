const { ethers } = require('ethers');

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';

const addresses = [
  "0x4F31f7C529bf0cD0846E593fc043c552475A839c", // deployer EOA
  "0xF7D4f5F87f1A3879B7eF41E15c87D0d6eF7f08c3", // relayer
  "0x6a7438A16D907f7f43044384335D9E347a04a68C", // treasury
  "0xF821447c6Bd7c54e5FC2Bd92239F4D8eD73C52f0", // merchant
  "0x320d034d76c4c79b12850d288bf68044abe7bf2f"  // backend wallet
];

async function check() {
  const arb = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const base = new ethers.JsonRpcProvider(BASE_RPC);

  console.log("=== ARBITRUM ONE BALANCES ===");
  for (const addr of addresses) {
    const bal = await arb.getBalance(addr);
    console.log(`${addr}: ${ethers.formatEther(bal)} ETH`);
  }

  console.log("\n=== BASE MAINNET BALANCES ===");
  for (const addr of addresses) {
    const bal = await base.getBalance(addr);
    console.log(`${addr}: ${ethers.formatEther(bal)} ETH`);
  }
}

check().catch(console.error);
