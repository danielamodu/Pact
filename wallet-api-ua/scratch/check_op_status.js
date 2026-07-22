const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const OP_RPC = 'https://mainnet.optimism.io';

async function main() {
  const provider = new ethers.JsonRpcProvider(OP_RPC);

  // Check existing deployer wallet's nonce and balance on OP
  const existingDeployer = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';
  const relayer = '0xF7D4f5F87f1A3879B7eF41E15c87D0d6eF7f08c3';
  
  const deployerNonce = await provider.getTransactionCount(existingDeployer);
  const deployerBal = await provider.getBalance(existingDeployer);
  const relayerBal = await provider.getBalance(relayer);
  
  console.log(`=== OP Mainnet Status ===`);
  console.log(`Existing Deployer: ${existingDeployer}`);
  console.log(`Deployer Nonce:    ${deployerNonce}`);
  console.log(`Deployer Balance:  ${ethers.formatEther(deployerBal)} ETH`);
  console.log(`Relayer Balance:   ${ethers.formatEther(relayerBal)} ETH`);
  
  // Predict what the deployer would deploy at current nonce
  const registryAddr = ethers.getCreateAddress({ from: existingDeployer, nonce: deployerNonce });
  const executorAddr = ethers.getCreateAddress({ from: existingDeployer, nonce: deployerNonce + 1 });

  console.log(`\nPredicted PactRegistry at nonce ${deployerNonce}: ${registryAddr}`);
  console.log(`Predicted Executor at nonce ${deployerNonce+1}:   ${executorAddr}`);
  
  const registryMatch = registryAddr.toLowerCase() === '0x9db4207da96c5ee738f19b54aa4d49bc0fa64f56';
  const executorMatch = executorAddr.toLowerCase() === '0xb804fe2a839fd11aaafc24258498e8ef8476d74f';
  console.log(`\nAddresses will match Arbitrum/Base: Registry=${registryMatch}, Executor=${executorMatch}`);
  
  // Check if contracts are already deployed
  const registryCode = await provider.getCode('0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56');
  const executorCode = await provider.getCode('0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f');
  console.log(`\n0x9Db4207... code on OP: ${registryCode.length > 2 ? registryCode.length/2 + ' bytes (ALREADY DEPLOYED)' : 'empty (not deployed)'}`);
  console.log(`0xb804Fe2... code on OP: ${executorCode.length > 2 ? executorCode.length/2 + ' bytes (ALREADY DEPLOYED)' : 'empty (not deployed)'}`);
}

main().catch(console.error);
