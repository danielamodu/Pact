const { ethers } = require("ethers");

const PACT_REGISTRY_ADDRESS = "0xF2cDBAcdcE2D7961C2dE969E28F623ffac617CF5";
const PACT_REGISTRY_ABI = [
  "function getPlan(uint256 planId) external view returns (tuple(string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress, bool active))",
  "function nextPlanId() external view returns (uint256)"
];

const NETWORKS = {
  arbitrum: "https://arb1.arbitrum.io/rpc",
  base: "https://mainnet.base.org"
};

async function main() {
  const merchant = "0x6a7438a16d907f7f43044384335d9e347a04a68c";
  
  for (const [netName, rpcUrl] of Object.entries(NETWORKS)) {
    console.log(`Checking ${netName}...`);
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);
      
      const nextId = await contract.nextPlanId();
      console.log(`  Next planId on ${netName}: ${nextId.toString()}`);
      
      for (let i = 1; i < Number(nextId); i++) {
        try {
          const plan = await contract.getPlan(i);
          if (plan.payoutAddress.toLowerCase() === merchant.toLowerCase()) {
            console.log(`  Found Plan ID [${i}] on ${netName}: Name="${plan.name}", Price=${plan.price.toString()}, Token=${plan.token}`);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error(`  Error querying ${netName}:`, err.message);
    }
  }
}

main();
