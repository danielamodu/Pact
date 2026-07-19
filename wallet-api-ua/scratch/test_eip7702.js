const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const EXECUTOR_ADDRESS = '0x70cD033936Ae7AA52E788A16A275FF437528911D';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log("=== Testing EIP-7702 Upgrade Logic ===");

  const keyPath = path.join(__dirname, '..', 'deployer.key');
  if (!fs.existsSync(keyPath)) {
    console.error("deployer.key not found");
    process.exit(1);
  }
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();

  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`EOA Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`EOA Balance: ${ethers.formatEther(balance)} ETH`);

  // 1. Get current nonce
  const currentNonce = await provider.getTransactionCount(wallet.address);
  console.log(`Current Nonce: ${currentNonce}`);

  // 2. Auth nonce = currentNonce + 1
  const authNonce = currentNonce + 1;
  const { chainId } = await provider.getNetwork();

  // 3. Compute authorization hash
  const authHash = ethers.hashAuthorization({
    address: EXECUTOR_ADDRESS,
    chainId: chainId,
    nonce: authNonce
  });
  console.log(`Auth Hash: ${authHash}`);

  // 4. Sign the authorization using the EOA private key
  const signingKey = new ethers.SigningKey(privateKey);
  const signature = signingKey.sign(authHash);
  
  // Format authorization object for ethers v6
  const authorization = {
    address: EXECUTOR_ADDRESS,
    nonce: authNonce,
    chainId: chainId,
    signature: ethers.Signature.from({
      r: signature.r,
      s: signature.s,
      v: signature.v
    })
  };

  console.log("Authorization signed successfully");

  // 5. Get fee data with EIP-1559 buffers
  const feeData = await provider.getFeeData();
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas !== null && feeData.maxPriorityFeePerGas !== undefined
    ? (feeData.maxPriorityFeePerGas * 130n) / 100n
    : 0n;

  let maxFeePerGas = feeData.maxFeePerGas !== null && feeData.maxFeePerGas !== undefined
    ? (feeData.maxFeePerGas * 150n) / 100n
    : (feeData.gasPrice ? (feeData.gasPrice * 260n) / 100n : 1000000000n);

  if (maxFeePerGas < maxPriorityFeePerGas) {
    maxFeePerGas = maxPriorityFeePerGas;
  }

  console.log("Fees configured:", {
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    maxFeePerGas: maxFeePerGas.toString()
  });

  // 6. Build the Type-4 Transaction
  const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
  
  const txBase = {
    type: 4,
    to: NULL_ADDRESS,
    value: 0n,
    data: '0x',
    nonce: currentNonce,
    chainId: chainId,
    maxFeePerGas,
    maxPriorityFeePerGas,
    authorizationList: [authorization]
  };

  // 7. Estimate gas dynamically with buffer
  let gasLimit;
  try {
    const estimated = await provider.estimateGas({
      from: wallet.address,
      ...txBase
    });
    gasLimit = (estimated * 140n) / 100n;
    console.log(`Estimated gas: ${estimated.toString()} -> limit: ${gasLimit.toString()}`);
  } catch (err) {
    gasLimit = 600000n;
    console.warn("Gas estimation failed, using fallback 600k", err.message || err);
  }

  const txRequest = {
    ...txBase,
    gasLimit
  };

  // 8. Sign and serialize the transaction using the EOA wallet
  console.log("Signing and serializing EIP-7702 transaction...");
  const signedTx = await wallet.signTransaction(txRequest);
  
  // 9. Broadcast
  console.log("Broadcasting transaction...");
  const txResponse = await provider.broadcastTransaction(signedTx);
  console.log(`Transaction Hash: ${txResponse.hash}`);
  console.log(`Explorer Link: https://arbiscan.io/tx/${txResponse.hash}`);

  console.log("Waiting for block confirmation...");
  const receipt = await txResponse.wait(1);
  console.log(`Transaction confirmed in block ${receipt.blockNumber}! Status: ${receipt.status}`);

  if (receipt.status !== 1) {
    console.error("Transaction reverted!");
    process.exit(1);
  }

  // 10. Verify delegation status via getCode
  console.log("Verifying delegation on-chain via eth_getCode...");
  const code = await provider.getCode(wallet.address);
  console.log(`Target Code: ${code}`);

  const EIP7702_PREFIX = '0xef0100';
  if (code.length === 48 && code.toLowerCase().startsWith(EIP7702_PREFIX)) {
    const delegatee = '0x' + code.slice(8);
    console.log(`🎉 SUCCESS! EOA code successfully delegated to: ${delegatee}`);
    if (delegatee.toLowerCase() === EXECUTOR_ADDRESS.toLowerCase()) {
      console.log("🎉 SUCCESS! Delegated to correct SessionKeyExecutor contract!");
    } else {
      console.warn(`⚠️ Delegated to wrong address: expected ${EXECUTOR_ADDRESS}, got ${delegatee}`);
    }
  } else {
    console.error(`❌ FAILURE! Code does not match EIP-7702 format. Got: ${code}`);
  }
}

main().catch(console.error);
