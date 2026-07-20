const { ethers } = require('ethers');
const BASE_RPC = 'https://mainnet.base.org';

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const code = await provider.getCode('0xE592427A0AEce92De3Edee1F18E0157C05861564');
  console.log(`Code length: ${code.length}`);
}

main().catch(console.error);
