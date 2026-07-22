const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const OP_RPC = 'https://mainnet.optimism.io';
const CHAIN_ID = 10;

async function deploy() {
  const provider = new ethers.JsonRpcProvider(OP_RPC);
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey, provider);

  const bal = await provider.getBalance(wallet.address);
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH`);
  console.log(`Nonce:    ${nonce}`);

  const registryJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts', 'PactRegistry.json'), 'utf8'));
  const executorJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'contracts', 'SessionKeyExecutor.json'), 'utf8'));

  // We need to be at nonce 3 to get 0x9Db4207... and nonce 4 for 0xb804Fe2...
  // Current nonce is 2 - send 1 pad tx (self-transfer 0 ETH)
  if (nonce === 2) {
    console.log('\n[PAD] Sending nonce-2 pad tx to align nonce...');
    const padTx = await wallet.sendTransaction({ to: wallet.address, value: 0n });
    console.log(`Pad tx: ${padTx.hash}`);
    await padTx.wait();
    console.log('Pad confirmed. Nonce now 3.');
  } else if (nonce < 2) {
    console.log(`ERROR: nonce is ${nonce}, expected at least 2. Something is wrong.`);
    process.exit(1);
  } else if (nonce > 3) {
    console.log(`WARN: nonce is ${nonce}, PactRegistry won't land at 0x9Db4207... but deploying anyway.`);
  }

  // 1. Deploy PactRegistry
  console.log('\n[1/2] Deploying PactRegistry...');
  const registryFactory = new ethers.ContractFactory(registryJson.abi, registryJson.bytecode, wallet);
  const registry = await registryFactory.deploy({ gasLimit: 2000000 });
  console.log(`  Tx: ${registry.deploymentTransaction().hash}`);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`  ✅ PactRegistry deployed at: ${registryAddr}`);
  const matchRegistry = registryAddr.toLowerCase() === '0x9db4207da96c5ee738f19b54aa4d49bc0fa64f56';
  console.log(`  Matches Arbitrum/Base address: ${matchRegistry ? 'YES ✅' : 'NO (different address)'}`);

  // 2. Deploy SessionKeyExecutor
  console.log('\n[2/2] Deploying SessionKeyExecutor...');
  const executorFactory = new ethers.ContractFactory(executorJson.abi, executorJson.bytecode, wallet);
  const executor = await executorFactory.deploy({ gasLimit: 2000000 });
  console.log(`  Tx: ${executor.deploymentTransaction().hash}`);
  await executor.waitForDeployment();
  const executorAddr = await executor.getAddress();
  console.log(`  ✅ SessionKeyExecutor deployed at: ${executorAddr}`);
  const matchExecutor = executorAddr.toLowerCase() === '0xb804fe2a839fd11aaafc24258498e8ef8476d74f';
  console.log(`  Matches Arbitrum/Base address: ${matchExecutor ? 'YES ✅' : 'NO (different address)'}`);

  // Save addresses
  fs.writeFileSync(path.join(__dirname, '..', 'contracts', 'PactRegistryAddress_OP_Mainnet.txt'), registryAddr);
  fs.writeFileSync(path.join(__dirname, '..', 'contracts', 'SessionKeyExecutorAddress_op.txt'), executorAddr);
  
  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log(`PactRegistry:      ${registryAddr}  https://optimistic.etherscan.io/address/${registryAddr}`);
  console.log(`SessionKeyExecutor: ${executorAddr}  https://optimistic.etherscan.io/address/${executorAddr}`);
}

deploy().catch(console.error);
