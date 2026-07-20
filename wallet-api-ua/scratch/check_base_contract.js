const { ethers } = require('ethers');
const PactRegistryJson = require('../contracts/PactRegistry.json');

const BASE_RPC = 'https://mainnet.base.org';
const registryAddr = '0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56';

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const registry = new ethers.Contract(registryAddr, PactRegistryJson.abi, provider);

  const nextPlanId = await registry.nextPlanId();
  console.log(`nextPlanId: ${nextPlanId.toString()}`);

  if (Number(nextPlanId) > 0) {
    const plan0 = await registry.plans(0);
    console.log(`Plan 0 name: ${plan0.name}, active: ${plan0.active}, token: ${plan0.token}, price: ${plan0.price.toString()}`);
    if (Number(nextPlanId) > 1) {
      const plan1 = await registry.plans(1);
      console.log(`Plan 1 name: ${plan1.name}, active: ${plan1.active}, token: ${plan1.token}, price: ${plan1.price.toString()}`);
    }
  }
}

main().catch(console.error);
