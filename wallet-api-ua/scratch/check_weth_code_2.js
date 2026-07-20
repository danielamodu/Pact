const { ethers } = require('ethers');
const ARBITRUM_RPC = 'https://arbitrum-one-rpc.publicnode.com';
const WETH = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';

async function main() {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const code = await provider.getCode(ethers.getAddress(WETH));
  console.log(`WETH 0x82af...fbab1 Code size: ${code.length}`);
}

main().catch(console.error);
