const https = require('https');

const address = "0x6a7438A16D907f7f43044384335D9E347a04a68C";

// Networks and their RPC endpoints
const networks = [
  { name: "Ethereum Sepolia", chainId: 11155111, rpc: "https://ethereum-sepolia-rpc.publicnode.com" },
  { name: "Base Sepolia", chainId: 84532, rpc: "https://sepolia.base.org" },
  { name: "Arbitrum Sepolia", chainId: 421614, rpc: "https://sepolia-rollup.arbitrum.io/rpc" },
  { name: "Optimism Sepolia", chainId: 11155420, rpc: "https://sepolia.optimism.io" },
  { name: "Avalanche Fuji", chainId: 43113, rpc: "https://api.avax-test.network/ext/bc/C/rpc" }
];

// Common USDC testnet contract addresses
const usdcContracts = [
  { name: "Ethereum Sepolia USDC (Circle)", chainId: 11155111, address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" },
  { name: "Ethereum Sepolia USDC (Aave)", chainId: 11155111, address: "0x94a9D4A5637397900e572922799a8f57ac03c4bf" },
  { name: "Base Sepolia USDC (Circle)", chainId: 84532, address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e" },
  { name: "Arbitrum Sepolia USDC (Circle)", chainId: 421614, address: "0x75faf114eafb1BDbe6F0d48477f58b872d686f47" }
];

function rpcCall(url, method, params) {
  const payload = JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 });
  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result || '0x0');
        } catch(e) {
          resolve('0x0');
        }
      });
    });
    req.on('error', () => resolve('0x0'));
    req.write(payload);
    req.end();
  });
}

async function check() {
  console.log(`Checking address: ${address}\n`);

  console.log("--- Native Balances ---");
  for (const net of networks) {
    const balanceHex = await rpcCall(net.rpc, "eth_getBalance", [address, "latest"]);
    const balance = parseInt(balanceHex, 16) / 1e18;
    if (balance > 0) {
      console.log(`✅ ${net.name}: ${balance} ETH`);
    } else {
      console.log(`   ${net.name}: 0 ETH`);
    }
  }

  console.log("\n--- ERC-20 USDC Balances ---");
  for (const usdc of usdcContracts) {
    const net = networks.find(n => n.chainId === usdc.chainId);
    if (!net) continue;
    
    // erc20 balanceOf selector is 0x70a08231
    const data = "0x70a08231" + address.substring(2).padStart(64, '0');
    const balanceHex = await rpcCall(net.rpc, "eth_call", [{ to: usdc.address, data }, "latest"]);
    const balance = parseInt(balanceHex, 16) / 1e6; // USDC has 6 decimals typically
    if (balance > 0) {
      console.log(`✅ ${usdc.name}: ${balance} USDC (${usdc.address})`);
    } else {
      console.log(`   ${usdc.name}: 0 USDC`);
    }
  }
}

check();
