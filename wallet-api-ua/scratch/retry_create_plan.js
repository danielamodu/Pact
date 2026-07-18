const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const PactRegistryJson = require('../contracts/PactRegistry.json');

async function main() {
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("Error: deployer.key not found");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Retrying createPlan on Base Mainnet with wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Current Balance: ${ethers.formatEther(balance)} ETH`);

  const registryAddress = "0xF2cDBAcdcE2D7961C2dE969E28F623ffac617CF5";
  const contract = new ethers.Contract(registryAddress, PactRegistryJson.abi, wallet);

  console.log("Calling createPlan on Base Mainnet contract...");
  
  // Set explicit gasLimit and gasPrice if needed, or let ethers estimate with gasLimit override
  const tx = await contract.createPlan(
    "Premium Pro Plan",
    "0x0000000000000000000000000000000000000000", // Native token
    ethers.parseEther("0.01"),
    2592000, // 30 days
    wallet.address,
    { gasLimit: 200000 } // Custom gas limit buffer
  );
  
  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  console.log(`🎉 createPlan executed successfully on Base Mainnet!`);
  console.log(`Tx Hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error("❌ Transaction failed:", error);
  process.exit(1);
});
