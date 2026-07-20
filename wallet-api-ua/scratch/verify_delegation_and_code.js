const { ethers } = require('ethers');

const networks = {
  arbitrum: {
    name: "Arbitrum One Mainnet",
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    chainId: 42161
  },
  base: {
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    chainId: 8453
  }
};

const targetExecutor = "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f".toLowerCase();
const eoaAddress = "0x4F31f7C529bf0cD0846E593fc043c552475A839c".toLowerCase();

async function main() {
  console.log("==================================================");
  console.log("Checking EIP-7702 Delegation Code & Validity");
  console.log(`EOA: ${eoaAddress}`);
  console.log(`Target Executor: ${targetExecutor}`);
  console.log("==================================================\n");

  for (const key of Object.keys(networks)) {
    const net = networks[key];
    console.log(`--- Chain: ${net.name} (Chain ID: ${net.chainId}) ---`);

    const provider = new ethers.JsonRpcProvider(net.rpc);
    
    // 1. Query eth_getCode
    const code = await provider.getCode(ethers.getAddress(eoaAddress));
    console.log(`Raw eth_getCode output: ${code}`);
    console.log(`Code byte length: ${(code.length - 2) / 2}`);

    // Parse EIP-7702 delegation format: 0xef0100 + 20-byte target address
    if (code.startsWith('0xef0100')) {
      const delegatedAddress = '0x' + code.slice(8).toLowerCase();
      console.log(`Delegated Target Address: ${delegatedAddress}`);
      
      const isTargetMatched = delegatedAddress === targetExecutor;
      console.log(`Delegation Match Target: ${isTargetMatched ? 'VALID (MATCHES NEW EXECUTOR)' : 'INVALID'}`);

      // 2. Query target contract bytecode to confirm non-empty implementation
      const executorCode = await provider.getCode(ethers.getAddress(delegatedAddress));
      const isImplementationValid = executorCode.length > 2;
      console.log(`Target Implementation Code Size: ${(executorCode.length - 2) / 2} bytes`);
      console.log(`Authorization Validity Status: ${isTargetMatched && isImplementationValid ? 'TRUE' : 'FALSE'}\n`);
    } else {
      console.log(`NOT AN EIP-7702 DELEGATED ACCOUNT! Code: ${code}\n`);
    }
  }
}

main().catch(console.error);
