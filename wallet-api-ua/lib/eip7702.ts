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

  // 1. Get current nonce of the EOA (actual current nonce, NOT + 1 because relayer is sender)
  const currentNonce = await provider.getTransactionCount(publicAddress);

  // 2. Compute the EIP-7702 authorization digest
  const authHash = hashAuthorization({
    address: executorAddress,
    chainId: BigInt(chainId),
    nonce: BigInt(currentNonce),
  });

  console.log("[EIP-7702] Auth hash:", authHash);
  console.log("[EIP-7702] Auth nonce (currentNonce):", currentNonce);

  // 3. Sign the authorization hash via TEE wallet
  const authSig = await signData(authHash, "ETH");
  const authSignature = Signature.from({ r: authSig.r, s: authSig.s, v: authSig.v });

  console.log("[EIP-7702] Authorization signed:", authSignature.serialized);
  console.log("[EIP-7702] Posting to relayer for gas sponsorship...");

  // 4. POST the signed authorization to our new server-side relayer API
  const response = await fetch("/api/relayer/sponsor-upgrade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscriberAddress: publicAddress,
      nonce: currentNonce,
      chainId,
      signature: authSignature.serialized,
      networkKey,
    }, (key, value) => typeof value === "bigint" ? value.toString() : value),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `Relayer request failed with status: ${response.status}`);
  }

  const txHash = data.hash;
  console.log("[EIP-7702] Relayer transaction broadcasted successfully. Hash:", txHash);

  // 5. Wait for confirmation
  const txResponse = await provider.getTransaction(txHash);
  if (!txResponse) {
    throw new Error(`Sponsored transaction not found in provider. Hash: ${txHash}`);
  }
  const receipt = await txResponse.wait(1);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`[EIP-7702] Sponsored transaction failed or reverted. Hash: ${txHash}`);
  }

  console.log("[EIP-7702] Sponsored upgrade confirmed in block:", receipt.blockNumber);
  return txHash;
}
