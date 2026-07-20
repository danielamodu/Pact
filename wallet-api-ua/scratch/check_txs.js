const { ethers } = require('ethers');

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';
const targetAddress = '0x6a7438A16D907f7f43044384335D9E347a04a68C';

async function checkTxs(net) {
  console.log(`\nChecking transactions on ${net.name}...`);
  const provider = new ethers.JsonRpcProvider(net.rpc);
  
  // Let's check block number first
  const blockNum = await provider.getBlockNumber();
  console.log(`Current block: ${blockNum}`);
}

async function main() {
  await checkTxs({ name: 'Arbitrum One', rpc: ARBITRUM_RPC });
  await checkTxs({ name: 'Base Mainnet', rpc: BASE_RPC });
}

main().catch(console.error);
