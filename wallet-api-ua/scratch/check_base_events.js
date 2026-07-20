const { ethers } = require('ethers');
const PactRegistryJson = require('../contracts/PactRegistry.json');

const BASE_RPC = 'https://mainnet.base.org';
const registryAddr = '0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56';

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const registry = new ethers.Contract(registryAddr, PactRegistryJson.abi, provider);

  console.log("Querying events on Base...");
  const filter = registry.filters.PlanCreated();
  // Query last 10,000 blocks
  const latestBlock = await provider.getBlockNumber();
  const events = await registry.queryFilter(filter, latestBlock - 5000, latestBlock);

  console.log(`Found ${events.length} PlanCreated events:`);
  for (const event of events) {
    console.log(`Plan ID: ${event.args.planId.toString()}, Merchant: ${event.args.merchant}, Name: ${event.args.name}, Tx: ${event.transactionHash}`);
  }
}

main().catch(console.error);
