const { ethers } = require('ethers');

const OP_RPCS = [
  'https://optimism.llamarpc.com',
  'https://mainnet.optimism.io',
  'https://op-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/optimism'
];

const deployer = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';
const relayer = '0xF7D4f5F87f1A3879B7eF41E15c87D0d6eF7f08c3';

async function main() {
  for (const rpc of OP_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const [depBal, relBal, nonce] = await Promise.all([
        provider.getBalance(deployer),
        provider.getBalance(relayer),
        provider.getTransactionCount(deployer)
      ]);
      console.log(`RPC: ${rpc}`);
      console.log(`  Deployer Balance: ${ethers.formatEther(depBal)} ETH, Nonce: ${nonce}`);
      console.log(`  Relayer Balance:  ${ethers.formatEther(relBal)} ETH`);
      if (depBal > 0n) {
        console.log(`  ✅ FUNDED — proceeding with this RPC`);
        return rpc;
      }
      break;
    } catch (e) {
      console.log(`  RPC ${rpc} failed: ${e.message}`);
    }
  }
}

main().catch(console.error);
