const { ethers } = require('ethers');

const networks = {
  arbitrum: {
    name: "Arbitrum One Mainnet",
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    explorer: "https://arbiscan.io"
  },
  base: {
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    explorer: "https://basescan.org"
  }
};

const eoaAddress = "0x4F31f7C529bf0cD0846E593fc043c552475A839c";

async function main() {
  console.log("=== Finding EIP-7702 Type-4 Upgrade Transactions ===");

  for (const key of Object.keys(networks)) {
    const net = networks[key];
    console.log(`\nScanning ${net.name}...`);

    const provider = new ethers.JsonRpcProvider(net.rpc);
    const nonce = await provider.getTransactionCount(eoaAddress);
    console.log(`Current Nonce on ${net.name}: ${nonce}`);

    // Query latest blocks to find Type-4 transaction or scan recent blocks
    const latestBlock = await provider.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Scan transactions in recent blocks
    let found = false;
    for (let b = latestBlock; b > latestBlock - 500; b--) {
      const block = await provider.getBlock(b, true);
      if (!block || !block.prefetchedTransactions) continue;

      for (const tx of block.prefetchedTransactions) {
        if (tx.from && tx.from.toLowerCase() === eoaAddress.toLowerCase() && tx.type === 4) {
          console.log(`🎉 FOUND TYPE-4 EIP-7702 UPGRADE TX ON ${net.name}!`);
          console.log(`Block: ${b}`);
          console.log(`Tx Hash: ${tx.hash}`);
          console.log(`Explorer Link: ${net.explorer}/tx/${tx.hash}`);
          if (tx.authorizationList) {
            console.log(`Authorization List:`, JSON.stringify(tx.authorizationList, null, 2));
          }
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      console.log(`Scanning via tx search for ${net.name}...`);
    }
  }
}

main().catch(console.error);
