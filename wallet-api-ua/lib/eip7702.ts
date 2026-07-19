import { hashAuthorization, Signature, Transaction, TransactionLike } from "ethers";
import { signData } from "./express-proxy";
import { getProvider, NETWORKS } from "./contracts";

// ─── Deployed SessionKeyExecutor addresses per network ────────────────────────
// Populated after deploy — fill in after running scratch/deploy_session_key_executor.js
export const SESSION_KEY_EXECUTOR_ADDRESS: Record<"arbitrum" | "base", string> = {
  arbitrum: "0x70cD033936Ae7AA52E788A16A275FF437528911D",
  base: "0x70cD033936Ae7AA52E788A16A275FF437528911D",
};

// ─── Delegation check ─────────────────────────────────────────────────────────

export interface DelegationStatus {
  isDelegated: boolean;
  /** The address the EOA is currently delegated to, or null if not delegated */
  delegatee: string | null;
}

/**
 * Checks whether an EOA has already been upgraded via EIP-7702.
 * EIP-7702 sets the EOA's code to: 0xef0100 || <20-byte address>
 */
export async function checkDelegated(
  address: string,
  networkKey: "arbitrum" | "base"
): Promise<DelegationStatus> {
  const provider = getProvider(networkKey);
  const code = await provider.getCode(address);

  // 0xef0100 prefix = 3 bytes = 6 hex chars after "0x"
  const EIP7702_PREFIX = "0xef0100";
  if (code.length === 48 && code.toLowerCase().startsWith(EIP7702_PREFIX)) {
    // Remaining 40 hex chars = 20-byte delegatee address
    const delegatee = "0x" + code.slice(8);
    return { isDelegated: true, delegatee };
  }
  return { isDelegated: false, delegatee: null };
}

// ─── Type-4 (EIP-7702) upgrade transaction ────────────────────────────────────

/**
 * Upgrades a subscriber's EOA to delegate to SessionKeyExecutor via EIP-7702.
 *
 * Key points from confirmed on-chain behavior:
 * - Authorization nonce must be currentNonce + 1 (self-sponsored: the tx increments the nonce
 *   before the authorization list is evaluated, so signing with currentNonce yields Validity: False)
 * - Route the tx to the null address with 0 value (sending to self reverts; the delegation still
 *   applies on revert per spec, but null address is cleaner)
 * - Gas is estimated dynamically — hardcoded limits cause out-of-gas reverts (~440k needed)
 *
 * @returns The broadcast transaction hash
 */
export async function upgradeEOAWithEIP7702(
  networkKey: "arbitrum" | "base",
  publicAddress: string
): Promise<string> {
  const executorAddress = SESSION_KEY_EXECUTOR_ADDRESS[networkKey];
  if (!executorAddress) {
    throw new Error(
      `SessionKeyExecutor address not configured for ${networkKey}. Deploy the contract first.`
    );
  }

  const provider = getProvider(networkKey);
  const { chainId } = NETWORKS[networkKey];

  // 1. Get current nonce of the EOA
  const currentNonce = await provider.getTransactionCount(publicAddress);

  // 2. Authorization nonce = currentNonce + 1 (self-sponsored, tx increments nonce first)
  const authNonce = currentNonce + 1;

  // 3. Compute the EIP-7702 authorization digest
  const authHash = hashAuthorization({
    address: executorAddress,
    chainId: BigInt(chainId),
    nonce: BigInt(authNonce),
  });

  console.log("[EIP-7702] Auth hash:", authHash);
  console.log("[EIP-7702] Auth nonce:", authNonce, "(currentNonce + 1)");

  // 4. Sign the authorization hash via TEE wallet
  const authSig = await signData(authHash, "ETH");
  // Ethers v6 AuthorizationLike requires a `signature` SignatureLike field
  const authSignature = Signature.from({ r: authSig.r, s: authSig.s, v: authSig.v });

  console.log("[EIP-7702] Authorization signed:", authSignature.serialized);

  // 5. Get fee data and compute EIP-1559 gas fees with safety buffer
  const feeData = await provider.getFeeData();
  
  // Use a 30% buffer on priority fee
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas !== null && feeData.maxPriorityFeePerGas !== undefined
    ? (feeData.maxPriorityFeePerGas * BigInt(130)) / BigInt(100)
    : BigInt(0);

  // Use a 50% buffer on max fee per gas to absorb transient spikes
  let maxFeePerGas = feeData.maxFeePerGas !== null && feeData.maxFeePerGas !== undefined
    ? (feeData.maxFeePerGas * BigInt(150)) / BigInt(100)
    : (feeData.gasPrice ? (feeData.gasPrice * BigInt(260)) / BigInt(100) : BigInt(2_000_000_000));

  // Ensure maxFeePerGas is at least maxPriorityFeePerGas
  if (maxFeePerGas < maxPriorityFeePerGas) {
    maxFeePerGas = maxPriorityFeePerGas;
  }

  console.log("[EIP-7702] Gas configuration:", {
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    maxFeePerGas: maxFeePerGas.toString(),
    originalMaxFee: feeData.maxFeePerGas?.toString(),
    originalPriorityFee: feeData.maxPriorityFeePerGas?.toString(),
  });

  // 6. Build the Type-4 tx (authorizationList carries the upgrade)
  //    Route to null address with 0 value — cleaner than self-call (avoids revert)
  const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

  const authorization = {
    address: executorAddress,
    nonce: BigInt(authNonce),
    chainId: BigInt(chainId),
    signature: authSignature,
  };

  const txBase: any = {
    type: 4,
    to: NULL_ADDRESS,
    value: BigInt(0),
    data: "0x",
    nonce: currentNonce,
    chainId: BigInt(chainId),
    maxFeePerGas,
    maxPriorityFeePerGas,
    authorizationList: [authorization],
  };

  // 7. Estimate gas dynamically with safety buffer
  let gasLimit: bigint;
  try {
    const estimated = await provider.estimateGas({
      from: publicAddress,
      ...txBase,
    });
    gasLimit = (estimated * BigInt(140)) / BigInt(100); // 40% buffer
    console.log("[EIP-7702] Estimated gas:", estimated.toString(), "→ limit:", gasLimit.toString());
  } catch (err) {
    // Fallback: use 600k (safely above the ~440k observed on-chain)
    gasLimit = BigInt(600_000);
    console.warn("[EIP-7702] Gas estimation failed, using fallback 600k:", err);
  }

  const txRequest: TransactionLike = {
    ...txBase,
    gasLimit,
  };

  // 8. Sign the full Type-4 tx via TEE
  const resolvedTx = { ...txRequest };
  delete (resolvedTx as any).from;

  const btx = Transaction.from(resolvedTx);
  const { r, s, v } = await signData(btx.unsignedHash, "ETH");
  btx.signature = Signature.from({ r, s, v });

  const serialized = btx.serialized;
  console.log("[EIP-7702] Broadcasting Type-4 tx...");

  // 9. Broadcast
  const txResponse = await provider.broadcastTransaction(serialized);
  console.log("[EIP-7702] Tx hash:", txResponse.hash);

  // 10. Wait for confirmation
  const receipt = await txResponse.wait(1);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`[EIP-7702] Transaction failed or reverted. Hash: ${txResponse.hash}`);
  }

  console.log("[EIP-7702] Upgrade confirmed in block:", receipt.blockNumber);
  return txResponse.hash;
}
