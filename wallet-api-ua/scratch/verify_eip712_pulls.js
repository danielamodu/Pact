const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const PactRegistryJson = require('../contracts/PactRegistry.json');
const SessionKeyExecutorJson = require('../contracts/SessionKeyExecutor.json');

const networks = {
  arbitrum: {
    rpc: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    explorer: "https://arbiscan.io"
  },
  base: {
    rpc: "https://mainnet.base.org",
    chainId: 8453,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
    explorer: "https://basescan.org"
  }
};

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 value) external returns (bool)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function decimals() external view returns (uint8)"
];

async function runTest(networkKey, tokenType) {
  console.log(`\n==================================================`);
  console.log(`Running End-to-End Pull Test: ${networkKey.toUpperCase()} - ${tokenType.toUpperCase()}`);
  console.log(`==================================================`);

  const net = networks[networkKey];
  const provider = new ethers.JsonRpcProvider(net.rpc);

  // Load deployer key (upgraded EOA)
  const keyPath = path.join(__dirname, '..', 'deployer.key');
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const ownerWallet = new ethers.Wallet(privateKey, provider);
  console.log(`Upgraded EOA: ${ownerWallet.address}`);

  // Load relayer key
  try {
    const env = fs.readFileSync('.env', 'utf8');
    env.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
  } catch(e) {}

  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  const relayerWallet = new ethers.Wallet(relayerKey, provider);
  console.log(`Relayer EOA:  ${relayerWallet.address}`);

  // Newly deployed contract addresses
  const registryAddr = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";
  const executorAddr = "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f";

  console.log(`PactRegistry: ${registryAddr}`);
  console.log(`Executor:     ${executorAddr}`);

  const registry = new ethers.Contract(registryAddr, PactRegistryJson.abi, relayerWallet);
  const executor = new ethers.Contract(ownerWallet.address, SessionKeyExecutorJson.abi, relayerWallet);

  // Define pull token details
  let tokenAddress = ethers.ZeroAddress;
  let pullAmount = ethers.parseEther("0.00001"); // default ETH
  let decimals = 18;

  if (tokenType.toLowerCase() === "usdc") {
    tokenAddress = ethers.getAddress(net.usdc.toLowerCase());
    decimals = 6;
    pullAmount = ethers.parseUnits("0.01", 6); // 0.01 USDC
  }

  // 1. Verify EOA is upgraded
  const code = await provider.getCode(ownerWallet.address);
  console.log(`EOA code size: ${code.length}`);
  if (code.toLowerCase() === "0x") {
    console.error("❌ EOA is not upgraded!");
    return;
  }

  // 2. Register/Create a test plan on PactRegistry (Merchant = relayer)
  console.log("\n[1/5] Creating subscription plan on PactRegistry...");
  const planTx = await registry.createPlan(
    `EIP-712 Plan ${tokenType.toUpperCase()}`,
    tokenAddress,
    pullAmount,
    300, // 5 min interval
    relayerWallet.address, // recipient / merchant
    { gasLimit: 200000 }
  );
  const receipt = await planTx.wait();
  
  const event = receipt.logs
    .map(log => {
      try {
        return registry.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(parsed => parsed && parsed.name === "PlanCreated");

  if (!event) {
    throw new Error("PlanCreated event not found in transaction receipt");
  }
  const planId = Number(event.args.planId);
  console.log(`🎉 Plan created! ID: ${planId}`);

  // 3. Subscribe on-chain (Upgraded EOA calls subscribe)
  console.log("\n[2/5] Upgraded EOA subscribing to the plan...");
  const ownerRegistry = new ethers.Contract(registryAddr, PactRegistryJson.abi, ownerWallet);
  const subTx = await ownerRegistry.subscribe(planId, executorAddr, { gasLimit: 200000 });
  await subTx.wait();
  console.log("🎉 Subscribed!");

  // Verify registry active mapping
  const isActive = await registry.isActiveSubscriber(planId, ownerWallet.address);
  console.log(`Registry state - isActiveSubscriber: ${isActive}`);

  // 4. Generate Session Key and sign Scope EIP-712
  console.log("\n[3/5] Generating session key and signing EIP-712 scope...");
  const sessionKey = ethers.Wallet.createRandom();
  console.log(`Session Key: ${sessionKey.address}`);

  const currentNonce = await executor.nonces(ownerWallet.address);
  console.log(`Current Owner Nonce: ${currentNonce}`);

  const domain = {
    name: "Pact Protocol",
    version: "1",
    chainId: net.chainId,
    verifyingContract: ownerWallet.address // EOA is verifyingContract
  };

  const types = {
    SessionKeyScope: [
      { name: "sessionKeyAddress", type: "address" },
      { name: "recipient", type: "address" },
      { name: "maxAmount", type: "uint256" },
      { name: "token", type: "address" },
      { name: "interval", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "planId", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const expiry = Math.floor(Date.now() / 1000) + 86400; // 1 day
  const scopeValue = {
    sessionKeyAddress: sessionKey.address,
    recipient: relayerWallet.address,
    maxAmount: pullAmount,
    token: tokenAddress,
    interval: 300,
    expiry: expiry,
    planId: planId,
    nonce: currentNonce
  };

  const ownerSig = await ownerWallet.signTypedData(domain, types, scopeValue);
  console.log(`Owner EIP-712 Signature: ${ownerSig}`);

  // 5. Sign Pull Execution with Session Key
  console.log("\n[4/5] Session Key signing execution parameters...");
  const executionNonce = await executor.executionNonces(sessionKey.address);
  console.log(`Current Execution Nonce: ${executionNonce}`);

  const executionTypes = {
    PullExecution: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "nonce", type: "uint256" }
    ]
  };

  const executionValue = {
    amount: pullAmount,
    recipient: relayerWallet.address,
    nonce: executionNonce
  };

  const sessionKeySig = await sessionKey.connect(provider).signTypedData(domain, executionTypes, executionValue);
  console.log(`Session Key EIP-712 Signature: ${sessionKeySig}`);

  // 6. Broadcast executePull from relayer
  console.log("\n[5/5] Relayer broadcasting executePull transaction...");
  const scopeParam = {
    sessionKeyAddress: sessionKey.address,
    recipient: relayerWallet.address,
    maxAmount: pullAmount,
    token: tokenAddress,
    interval: 300,
    expiry: expiry,
    planId: planId
  };

  try {
    // Send executePull call to the upgraded EOA contract address
    const executeTx = await executor.executePull(
      pullAmount,
      scopeParam,
      ownerSig,
      sessionKeySig,
      { gasLimit: 500000 }
    );
    console.log(`Sent. Tx Hash: ${executeTx.hash}`);
    const receipt = await executeTx.wait();
    console.log(`🎉 SUCCESS! Pull executed confirmed in block ${receipt.blockNumber}! Status: ${receipt.status}`);
    console.log(`Explorer Link: ${net.explorer}/tx/${executeTx.hash}`);
  } catch (err) {
    console.error("❌ executePull failed:", err.message || err);
    if (err.data) console.error("Revert data:", err.data);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const network = args[0] || "arbitrum";
  const token = args[1] || "eth";

  if (network !== "arbitrum" && network !== "base") {
    console.error("Invalid network. Use 'arbitrum' or 'base'");
    process.exit(1);
  }
  if (token !== "eth" && token !== "usdc") {
    console.error("Invalid token type. Use 'eth' or 'usdc'");
    process.exit(1);
  }

  await runTest(network, token);
}

main().catch(console.error);
