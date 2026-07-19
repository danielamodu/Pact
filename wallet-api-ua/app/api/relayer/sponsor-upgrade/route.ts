import { NextResponse } from "next/server";
import { ethers, Signature } from "ethers";
import { getProvider, SESSION_KEY_EXECUTOR_ADDRESS, NETWORKS } from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { subscriberAddress, nonce, chainId, signature, networkKey } = await req.json();

    if (!subscriberAddress || nonce === undefined || !chainId || !signature || !networkKey) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (networkKey !== "arbitrum" && networkKey !== "base") {
      return NextResponse.json({ error: "Invalid networkKey" }, { status: 400 });
    }

    const netKey = networkKey as "arbitrum" | "base";
    const executorAddress = SESSION_KEY_EXECUTOR_ADDRESS[netKey];
    if (!executorAddress) {
      return NextResponse.json({ error: `Executor address not found for network ${netKey}` }, { status: 500 });
    }

    const provider = getProvider(netKey);
    const expectedChainId = NETWORKS[netKey].chainId;

    if (Number(chainId) !== expectedChainId) {
      return NextResponse.json({ error: `Chain ID mismatch. Expected ${expectedChainId}, got ${chainId}` }, { status: 400 });
    }

    // 1. Reconstruct EIP-7702 authorization digest
    const authHash = ethers.hashAuthorization({
      address: executorAddress,
      chainId: BigInt(chainId),
      nonce: BigInt(nonce)
    });

    // 2. Recover signer address from signature
    const parsedSig = Signature.from(signature);
    const recoveredAddress = ethers.recoverAddress(authHash, parsedSig);

    if (recoveredAddress.toLowerCase() !== subscriberAddress.toLowerCase()) {
      console.error("[Relayer] Signature verification failed:", {
        recovered: recoveredAddress,
        claimed: subscriberAddress,
        authHash,
        signature
      });
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }

    console.log(`[Relayer] Verified signature for subscriber ${subscriberAddress} (nonce: ${nonce})`);

    // 3. Initialize Relayer Wallet
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer private key not configured on server" }, { status: 500 });
    }

    const relayerWallet = new ethers.Wallet(relayerKey, provider);
    const relayerAddress = relayerWallet.address;

    // 4. Check relayer balance
    const balance = await provider.getBalance(relayerAddress);
    if (balance === BigInt(0)) {
      return NextResponse.json({ error: `Relayer wallet (${relayerAddress}) has zero balance. Please fund it.` }, { status: 500 });
    }

    // 5. Get current fee data with safety buffer
    const feeData = await provider.getFeeData();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas !== null && feeData.maxPriorityFeePerGas !== undefined
      ? (feeData.maxPriorityFeePerGas * BigInt(130)) / BigInt(100)
      : BigInt(0);

    let maxFeePerGas = feeData.maxFeePerGas !== null && feeData.maxFeePerGas !== undefined
      ? (feeData.maxFeePerGas * BigInt(150)) / BigInt(100)
      : (feeData.gasPrice ? (feeData.gasPrice * BigInt(260)) / BigInt(100) : BigInt(2_000_000_000));

    if (maxFeePerGas < maxPriorityFeePerGas) {
      maxFeePerGas = maxPriorityFeePerGas;
    }

    // 6. Build Type-4 transaction request
    const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
    const relayerNonce = await provider.getTransactionCount(relayerAddress);

    const authorization = {
      address: executorAddress,
      nonce: BigInt(nonce),
      chainId: BigInt(chainId),
      signature: parsedSig,
    };

    const txBase: any = {
      type: 4,
      to: NULL_ADDRESS,
      value: BigInt(0),
      data: "0x",
      nonce: relayerNonce,
      chainId: BigInt(chainId),
      maxFeePerGas,
      maxPriorityFeePerGas,
      authorizationList: [authorization],
    };

    // 7. Estimate gas
    let gasLimit: bigint;
    try {
      const estimated = await provider.estimateGas({
        from: relayerAddress,
        ...txBase,
      });
      gasLimit = (estimated * BigInt(140)) / BigInt(100);
      console.log(`[Relayer] Estimated gas: ${estimated} -> limit: ${gasLimit}`);
    } catch (err: any) {
      gasLimit = BigInt(600_000);
      console.warn("[Relayer] Gas estimation failed, using fallback 600k:", err.message || err);
    }

    const txRequest = {
      ...txBase,
      gasLimit
    };

    // 8. Sign and broadcast transaction from relayer
    console.log("[Relayer] Signing sponsored Type-4 transaction...");
    const signedTx = await relayerWallet.signTransaction(txRequest);
    
    console.log("[Relayer] Broadcasting sponsored transaction...");
    const txResponse = await provider.broadcastTransaction(signedTx);
    console.log("[Relayer] Broadcasted successfully. Tx hash:", txResponse.hash);

    return NextResponse.json({ hash: txResponse.hash });
  } catch (error: any) {
    console.error("[Relayer] Sponsorship error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
