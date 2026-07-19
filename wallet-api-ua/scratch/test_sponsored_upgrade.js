const { ethers } = require('ethers');

const EXECUTOR_ADDRESS = '0x70cD033936Ae7AA52E788A16A275FF437528911D';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log("=== Testing Sponsored EIP-7702 Upgrade ===");

  // 1. Generate a completely empty subscriber wallet (0 ETH)
  const subscriber = ethers.Wallet.createRandom();
  console.log(`Subscriber Address: ${subscriber.address}`);

  // Query balance to prove it is empty (0 ETH)
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const subscriberBalance = await provider.getBalance(subscriber.address);
  console.log(`Subscriber Balance: ${ethers.formatEther(subscriberBalance)} ETH (gasp!)`);
  
  if (subscriberBalance > 0n) {
    console.error("Subscriber wallet must be empty for this test!");
    process.exit(1);
  }

  // 2. Subscriber actual nonce = 0
  const nonce = 0;
  const chainId = 42161; // Arbitrum One Mainnet

  // 3. Compute authorization hash (standard subscriber's nonce = 0, no +1)
  const authHash = ethers.hashAuthorization({
    address: EXECUTOR_ADDRESS,
    chainId: chainId,
    nonce: nonce
  });
  console.log(`Auth Hash: ${authHash}`);

  // 4. Sign the authorization using the subscriber's private key
  const sig = subscriber.signingKey.sign(authHash);
  const signature = ethers.Signature.from({
    r: sig.r,
    s: sig.s,
    v: sig.v
  }).serialized;

  console.log("Subscriber authorization signed. Signature:", signature);

  // 5. Send POST request to the local relayer API endpoint
  console.log("Posting authorization to local sponsored relayer API...");
  try {
    const response = await fetch("http://127.0.0.1:3000/api/relayer/sponsor-upgrade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscriberAddress: subscriber.address,
        nonce: nonce,
        chainId: chainId,
        signature: signature,
        networkKey: "arbitrum"
      })
    });

    const text = await response.text();
    console.log(`Relayer API Status: ${response.status}`);
    
    let result;
    try {
      result = JSON.parse(text);
    } catch(e) {
      console.error("Failed to parse response JSON:", text);
      process.exit(1);
    }

    if (result.error) {
      console.error("Relayer returned error:", result.error);
      process.exit(1);
    }

    const txHash = result.hash;
    console.log(`\n🎉 Relayer transaction broadcasted successfully!`);
    console.log(`Tx Hash: ${txHash}`);
    console.log(`Explorer Link: https://arbiscan.io/tx/${txHash}`);

    // 6. Wait for confirmation
    console.log("Waiting for block confirmation...");
    let txResponse = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
      txResponse = await provider.getTransaction(txHash);
      if (txResponse) break;
      console.log(`Transaction not found yet. Retrying in 2 seconds... (attempt ${attempt}/10)`);
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!txResponse) {
      console.error("Transaction not found in provider after 10 attempts");
      process.exit(1);
    }
    const receipt = await txResponse.wait(1);
    console.log(`Transaction confirmed in block ${receipt.blockNumber}! Status: ${receipt.status}`);

    if (receipt.status !== 1) {
      console.error("Transaction reverted!");
      process.exit(1);
    }

    // 7. Verify delegation status via getCode
    console.log("Verifying delegation on-chain via eth_getCode...");
    const code = await provider.getCode(subscriber.address);
    console.log(`Subscriber Code: ${code}`);

    const EIP7702_PREFIX = '0xef0100';
    if (code.length === 48 && code.toLowerCase().startsWith(EIP7702_PREFIX)) {
      const delegatee = '0x' + code.slice(8);
      console.log(`🎉 SUCCESS! Subscriber EOA successfully delegated to: ${delegatee}`);
      if (delegatee.toLowerCase() === EXECUTOR_ADDRESS.toLowerCase()) {
        console.log("🎉 SUCCESS! Delegated to correct SessionKeyExecutor contract!");
      } else {
        console.warn(`⚠️ Delegated to wrong address: expected ${EXECUTOR_ADDRESS}, got ${delegatee}`);
      }
    } else {
      console.error(`❌ FAILURE! Code does not match EIP-7702 format. Got: ${code}`);
    }

  } catch(err) {
    console.error("Test execution failed:", err.message || err);
    process.exit(1);
  }
}

main().catch(console.error);
