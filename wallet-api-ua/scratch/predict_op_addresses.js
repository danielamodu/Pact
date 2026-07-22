const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const OP_RPC = 'https://mainnet.optimism.io';

// Pre-simulate the deploy to confirm the address we'd get at nonce 0 and nonce 1
const REGISTRY_BYTECODE = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'PactRegistry.json'), 'utf8');
const EXECUTOR_BYTECODE = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'SessionKeyExecutor.json'), 'utf8');

async function main() {
  // Use the fresh OP deployer key
  const privateKey = '0x2f7c30f47ffbcea68fd16d2749f2bcfa50906f98d4ef7561be90c22b1c36a4f8';
  const wallet = new ethers.Wallet(privateKey);
  
  console.log(`OP Deployer Address: ${wallet.address}`);
  
  // Predict contract addresses using CREATE formula: keccak256(rlp([sender, nonce]))
  const nonce0Addr = ethers.getCreateAddress({ from: wallet.address, nonce: 0 });
  const nonce1Addr = ethers.getCreateAddress({ from: wallet.address, nonce: 1 });

  console.log(`\nPredicted PactRegistry address (nonce 0):      ${nonce0Addr}`);
  console.log(`Predicted SessionKeyExecutor address (nonce 1): ${nonce1Addr}`);
  
  console.log(`\nExisting Arbitrum/Base PactRegistry:      0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56`);
  console.log(`Existing Arbitrum/Base SessionKeyExecutor: 0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f`);
  
  const registryMatch = nonce0Addr.toLowerCase() === '0x9db4207da96c5ee738f19b54aa4d49bc0fa64f56';
  const executorMatch = nonce1Addr.toLowerCase() === '0xb804fe2a839fd11aaafc24258498e8ef8476d74f';
  
  console.log(`\nRegistry address matches existing: ${registryMatch ? 'YES' : 'NO - DIFFERENT ADDRESS'}`);
  console.log(`Executor address matches existing: ${executorMatch ? 'YES' : 'NO - DIFFERENT ADDRESS'}`);
}

main().catch(console.error);
