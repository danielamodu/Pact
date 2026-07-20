const { ethers } = require('ethers');

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';
const executor = '0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f';

async function findDeployer(net) {
  console.log(`\nConnecting to ${net.name}...`);
  const provider = new ethers.JsonRpcProvider(net.rpc);
  
  // Let's do a search or fetch code
  const code = await provider.getCode(executor);
  console.log(`Code size: ${code.length}`);
}

findDeployer({ name: 'Arbitrum One', rpc: ARBITRUM_RPC });
findDeployer({ name: 'Base Mainnet', rpc: BASE_RPC });
