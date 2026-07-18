const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const PactRegistryJson = require('../contracts/PactRegistry.json');

const networks = [
  {
    name: "Arbitrum One Mainnet",
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org"
  }
];

async function deployToNetwork(net, privateKey) {
  console.log(`\n==================================================`);
  console.log(`Connecting to ${net.name}...`);
  const provider = new ethers.JsonRpcProvider(net.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.log(`⚠️ Balance is zero on ${net.name}. Skipping...`);
    return;
  }

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
  console.log(`🎉 PactRegistry deployed successfully on ${net.name}!`);
  console.log(`Address: ${registryAddress}`);
  console.log(`Tx Hash: ${deployTxHash}`);
  console.log(`Explorer Link: ${net.explorer}/address/${registryAddress}`);

  console.log("Calling createPlan as a live test...");
  const tx = await contract.createPlan(
    "Premium Pro Plan",
    "0x0000000000000000000000000000000000000000", // Native token
    ethers.parseEther("0.01"),
    2592000, // 30 days
    wallet.address
  );
  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  console.log(`🎉 createPlan executed successfully on ${net.name}!`);
  console.log(`Tx Hash: ${tx.hash}`);
  console.log(`Explorer Link: ${net.explorer}/tx/${tx.hash}`);

  // Write deployment data to config file
  const logFile = path.join(__dirname, '..', 'contracts', `PactRegistryAddress_${net.name.replace(/\s+/g, '_')}.txt`);
  fs.writeFileSync(logFile, registryAddress, 'utf8');
}

async function main() {
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("Error: deployer.key file not found. Please run scratch/generate_mainnet_disposable.js first.");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  for (const net of networks) {
    try {
      await deployToNetwork(net, privateKey);
    } catch (e) {
      console.error(`❌ Failed to deploy to ${net.name}:`, e.message || e);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
