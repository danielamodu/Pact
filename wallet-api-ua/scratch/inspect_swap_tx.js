const { ethers } = require('ethers');

const BASE_RPC = 'https://mainnet.base.org';
const txHash = '0x392143f3b258691cc8b5b85bac334a3c7e717d3cab93ad588c7172864e45a3d7';

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const receipt = await provider.getTransactionReceipt(txHash);

  console.log(`Receipt Status: ${receipt.status}`);
  console.log("Logs count:", receipt.logs.length);
  for (const log of receipt.logs) {
    console.log(`Log Address: ${log.address}`);
    console.log(`Log Topics: ${JSON.stringify(log.topics)}`);
    console.log(`Log Data: ${log.data}`);
  }
}

main().catch(console.error);
