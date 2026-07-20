const { ethers } = require('ethers');
const PactRegistryJson = require('../contracts/PactRegistry.json');
const SessionKeyExecutorJson = require('../contracts/SessionKeyExecutor.json');

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';

async function estimate(name, rpc) {
  console.log(`\nEstimating on ${name}...`);
  const provider = new ethers.JsonRpcProvider(rpc);
  
  const dummyWallet = ethers.Wallet.createRandom().connect(provider);

  const regFactory = new ethers.ContractFactory(PactRegistryJson.abi, PactRegistryJson.bytecode, dummyWallet);
  const execFactory = new ethers.ContractFactory(SessionKeyExecutorJson.abi, SessionKeyExecutorJson.bytecode, dummyWallet);

  try {
    const regTx = await regFactory.getDeployTransaction();
    const regGas = await provider.estimateGas(regTx);
    console.log(`PactRegistry Deployment Gas: ${regGas.toString()}`);
  } catch (e) {
    console.error("PactRegistry estimation failed:", e.message);
  }

  try {
    const execTx = await execFactory.getDeployTransaction();
    const execGas = await provider.estimateGas(execTx);
    console.log(`SessionKeyExecutor Deployment Gas: ${execGas.toString()}`);
  } catch (e) {
    console.error("SessionKeyExecutor estimation failed:", e.message);
  }
}

async function main() {
  await estimate("Arbitrum", ARBITRUM_RPC);
  await estimate("Base", BASE_RPC);
}

main().catch(console.error);
