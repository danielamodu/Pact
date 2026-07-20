const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const PactRegistryJson = require('../contracts/PactRegistry.json');
const SessionKeyExecutorJson = require('../contracts/SessionKeyExecutor.json');

const networks = [
  {
    name: "Arbitrum One Mainnet",
    key: "arbitrum",
    rpc: "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Base Mainnet",
    key: "base",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org"
  }
];

async function main() {
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("deployer.key not found");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  for (const net of networks) {
    console.log(`\n==================================================`);
    console.log(`Deploying Contracts to ${net.name}...`);
    const provider = new ethers.JsonRpcProvider(net.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    const balance = await provider.getBalance(wallet.address);
    const nonce = await provider.getTransactionCount(wallet.address);
    console.log(`Deployer Address: ${wallet.address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH, Current Nonce: ${nonce}`);

    if (balance === 0n) {
      console.warn(`⚠️ Balance is zero on ${net.name}. Skipping...`);
      continue;
    }

    // 1. Deploy PactRegistry (Nonce should be 3 or current)
    console.log(`\n[1/2] Deploying PactRegistry (Expected Nonce: ${nonce})...`);
    const regFactory = new ethers.ContractFactory(PactRegistryJson.abi, PactRegistryJson.bytecode, wallet);
    
    // Use dynamic fee configuration with buffer
    const feeData = await provider.getFeeData();
    let overrides = {};
    if (net.key === "arbitrum") {
      overrides.gasPrice = feeData.gasPrice ? (feeData.gasPrice * BigInt(130)) / BigInt(100) : BigInt(100000000);
    } else {
      // Base EIP-1559 config
      overrides.maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * BigInt(130)) / BigInt(100) : undefined;
      overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * BigInt(130)) / BigInt(100) : undefined;
    }

    const regContract = await regFactory.deploy(overrides);
    console.log(`Sent. Tx Hash: ${regContract.deploymentTransaction().hash}`);
    await regContract.waitForDeployment();
    const regAddress = await regContract.getAddress();
    console.log(`🎉 PactRegistry deployed at: ${regAddress}`);

    // 2. Deploy SessionKeyExecutor (Expected Nonce: ${nonce + 1})
    const nextNonce = await provider.getTransactionCount(wallet.address);
    console.log(`\n[2/2] Deploying SessionKeyExecutor (Expected Nonce: ${nextNonce})...`);
    const execFactory = new ethers.ContractFactory(SessionKeyExecutorJson.abi, SessionKeyExecutorJson.bytecode, wallet);
    const execContract = await execFactory.deploy(overrides);
    console.log(`Sent. Tx Hash: ${execContract.deploymentTransaction().hash}`);
    await execContract.waitForDeployment();
    const execAddress = await execContract.getAddress();
    console.log(`🎉 SessionKeyExecutor deployed at: ${execAddress}`);

    // Save addresses to text files
    const regFile = path.join(__dirname, '..', 'contracts', `PactRegistryAddress_${net.name.replace(/\s+/g, '_')}.txt`);
    fs.writeFileSync(regFile, regAddress, 'utf8');

    const execFile = path.join(__dirname, '..', 'contracts', `SessionKeyExecutorAddress_${net.key}.txt`);
    fs.writeFileSync(execFile, execAddress, 'utf8');

    console.log(`\nSaved addresses for ${net.name} successfully!`);
  }
}

main().catch(console.error);
