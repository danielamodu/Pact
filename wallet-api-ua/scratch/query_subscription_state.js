const { ethers } = require('ethers');
const PactRegistryJson = require('../contracts/PactRegistry.json');

const BASE_RPC = 'https://mainnet.base.org';
const registryAddr = '0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56';
const subscriber = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';
const planId = 2;

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const registry = new ethers.Contract(registryAddr, PactRegistryJson.abi, provider);

  const isActive = await registry.isActiveSubscriber(planId, subscriber);
  console.log(`Base Plan ${planId} subscription state for ${subscriber}: ${isActive}`);
}

main().catch(console.error);
