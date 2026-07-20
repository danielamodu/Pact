const { ethers } = require('ethers');
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const WETH = '0x82aF49447D8a07e3bd95BD0d56f352415231aa11';

async function main() {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const code = await provider.getCode(ethers.getAddress(WETH.toLowerCase()));
  console.log(`Code size: ${code.length}`);
}

main().catch(console.error);
