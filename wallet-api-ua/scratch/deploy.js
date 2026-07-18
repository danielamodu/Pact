const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const PactRegistryJson = require('../contracts/PactRegistry.json');

async function main() {
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("Error: deployer.key file not found. Please run scratch/generate_disposable.js first.");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  // Connect to Sepolia using a public RPC
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deploying PactRegistry with account: ${wallet.address}`);
  console.log(`Account balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);

  const factory = new ethers.ContractFactory(
    PactRegistryJson.abi,
    PactRegistryJson.bytecode,
    wallet
  );

  console.log("Sending deployment transaction...");
  const contract = await factory.deploy();
  console.log("Waiting for deployment confirmation...");
  await contract.waitForDeployment();
  
  const registryAddress = await contract.getAddress();
  const deployTxHash = contract.deploymentTransaction().hash;
  console.log(`\n🎉 PactRegistry deployed successfully!`);
  console.log(`Address: ${registryAddress}`);
  console.log(`Tx Hash: ${deployTxHash}`);

  // Save the address
  fs.writeFileSync(
    path.join(__dirname, '..', 'contracts', 'PactRegistryAddress.txt'),
    registryAddress,
    'utf8'
  );

  console.log("\nCalling createPlan to confirm it works on-chain...");
  const tx = await contract.createPlan(
    "Premium Pro Plan",
    "0x0000000000000000000000000000000000000000", // Native token
    ethers.parseEther("0.01"),
    2592000, // 30 days
    wallet.address
  );
  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  console.log(`🎉 createPlan executed successfully!`);
  console.log(`Tx Hash: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
