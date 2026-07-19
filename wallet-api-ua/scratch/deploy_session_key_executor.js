const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const SessionKeyExecutorJson = require('../contracts/SessionKeyExecutor.json');

const networks = [
  {
    name: "Arbitrum One Mainnet",
    key: "arbitrum",
    rpc: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    explorer: "https://arbiscan.io"
  },
  {
    name: "Base Mainnet",
    key: "base",
    rpc: "https://mainnet.base.org",
    chainId: 8453,
    explorer: "https://basescan.org"
  }
];

async function deployToNetwork(net, privateKey) {
  console.log(`\n==================================================`);
  console.log(`Deploying SessionKeyExecutor to ${net.name}...`);

  const provider = new ethers.JsonRpcProvider(net.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error(`❌ Balance is zero on ${net.name}. Cannot deploy. Please fund ${wallet.address} and retry.`);
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(
    SessionKeyExecutorJson.abi,
    SessionKeyExecutorJson.bytecode,
    wallet
  );

  console.log("Estimating deployment gas...");
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice
    ? (feeData.gasPrice * BigInt(130)) / BigInt(100) // 30% buffer
    : BigInt(100000000);

  console.log(`Gas price (with buffer): ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
  console.log("Sending deployment transaction...");

  const contract = await factory.deploy({ gasPrice });
  console.log(`Deployment tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation (this may take 15-30s)...");

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const txHash = contract.deploymentTransaction().hash;

  console.log(`\n✅ SessionKeyExecutor deployed on ${net.name}!`);
  console.log(`   Address:  ${address}`);
  console.log(`   Tx Hash:  ${txHash}`);
  console.log(`   Explorer: ${net.explorer}/address/${address}`);
  console.log(`   Tx Link:  ${net.explorer}/tx/${txHash}`);

  // Verify bytecode is live
  const code = await provider.getCode(address);
  if (code === '0x') {
    console.error(`❌ getCode returned 0x after deploy — something went wrong`);
    process.exit(1);
  }
  console.log(`   Bytecode: ✅ live (${code.length / 2 - 1} bytes)`);

  // Save address
  const addressFile = path.join(__dirname, '..', 'contracts', `SessionKeyExecutorAddress_${net.key}.txt`);
  fs.writeFileSync(addressFile, address, 'utf8');
  console.log(`   Saved to: ${addressFile}`);

  return { address, txHash, network: net.key };
}

async function main() {
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("Error: deployer.key not found. Run scratch/generate_mainnet_disposable.js first.");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  const results = [];
  for (const net of networks) {
    try {
      const result = await deployToNetwork(net, privateKey);
      results.push(result);
    } catch (e) {
      console.error(`\n❌ Failed to deploy to ${net.name}:`, e.message || e);
      process.exit(1);
    }
  }

  console.log("\n==================================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("==================================================");
  for (const r of results) {
    console.log(`${r.network}: ${r.address} (tx: ${r.txHash})`);
  }
  console.log("\nAdd these to lib/contracts.ts as SESSION_KEY_EXECUTOR_ADDRESS:");
  for (const r of results) {
    console.log(`  ${r.network}: "${r.address}",`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
