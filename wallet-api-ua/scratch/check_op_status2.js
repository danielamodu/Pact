const { ethers } = require('ethers');

const OP_RPC = 'https://mainnet.optimism.io';
const deployer = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';
const relayer = '0xF7D4f5F87f1A3879B7eF41E15c87D0d6eF7f08c3';

async function main() {
  const provider = new ethers.JsonRpcProvider(OP_RPC);
  
  const [depBal, relBal, nonce] = await Promise.all([
    provider.getBalance(deployer),
    provider.getBalance(relayer),
    provider.getTransactionCount(deployer)
  ]);
  
  console.log(`Deployer ${deployer}`);
  console.log(`  Balance: ${ethers.formatEther(depBal)} ETH`);
  console.log(`  Nonce:   ${nonce}`);
  console.log(`Relayer  ${relayer}`);
  console.log(`  Balance: ${ethers.formatEther(relBal)} ETH`);
  console.log(`\nDeploying at nonce ${nonce} -> PactRegistry: ${ethers.getCreateAddress({from: deployer, nonce})}`);
  console.log(`Deploying at nonce ${nonce+1} -> SessionKeyExecutor: ${ethers.getCreateAddress({from: deployer, nonce: nonce+1})}`);
  
  // We need deployer at nonce 3 to match 0x9Db4207...
  // Current nonce = 2, so we need 1 pad tx, then deploy registry (nonce 3), then executor (nonce 4)
  const target3 = ethers.getCreateAddress({from: deployer, nonce: 3});
  const target4 = ethers.getCreateAddress({from: deployer, nonce: 4});
  console.log(`\nTarget nonce 3 address: ${target3}`);
  console.log(`Target nonce 4 address: ${target4}`);
  console.log(`Match 0x9Db4207...: ${target3.toLowerCase() === '0x9db4207da96c5ee738f19b54aa4d49bc0fa64f56'}`);
  console.log(`Match 0xb804Fe2...: ${target4.toLowerCase() === '0xb804fe2a839fd11aaafc24258498e8ef8476d74f'}`);
}

main().catch(console.error);
