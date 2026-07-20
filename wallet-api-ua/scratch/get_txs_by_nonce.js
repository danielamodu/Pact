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
  console.log("=== Querying Nonce History for EOA ===");

  for (const key of Object.keys(networks)) {
    const net = networks[key];
    console.log(`\n==================================================`);
    console.log(`Scanning Nonces on ${net.name}...`);
    console.log(`==================================================`);

    const provider = new ethers.JsonRpcProvider(net.rpc);
    const count = await provider.getTransactionCount(eoaAddress);
    console.log(`Total Nonces: ${count}`);

    // Fetch transaction by reading logs or searching recent transactions
    // Since ethers doesn't allow getTransactionBySenderAndNonce directly on public RPCs without tx hash,
    // let's query the logs/events emitted by or involving our address or contract address!
    
    // Check PactRegistry and SessionKeyExecutor logs for our EOA address
    const registryAddr = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";
    const executorAddr = "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f";

    const latestBlock = await provider.getBlockNumber();
    console.log(`Latest Block: ${latestBlock}`);

    // Query logs where eoaAddress is topic
    const topic0s = [
      ethers.id("Subscribed(uint256,address,address)"),
      ethers.id("PullExecuted(uint256,address,uint256,uint256)"),
      ethers.id("PlanCreated(uint256,address,string,address,uint256,uint256,address)")
    ];

    const filter = {
      fromBlock: latestBlock - 5000,
      toBlock: latestBlock,
      address: [registryAddr, executorAddr]
    };

    const logs = await provider.getLogs(filter);
    console.log(`Found ${logs.length} logs on ${net.name}:`);
    for (const l of logs) {
      console.log(`Block: ${l.blockNumber}, TxHash: ${l.transactionHash}`);
    }
  }
}

main().catch(console.error);
