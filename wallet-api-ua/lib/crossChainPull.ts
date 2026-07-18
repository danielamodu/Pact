import { CHAIN_ID, type UniversalAccount, type ITransaction } from "@particle-network/universal-account-sdk";
import { ethers } from "ethers";

export interface PullTransactionParams {
  /** The destination chain ID (e.g., 42161 for Arbitrum) */
  destChainId: number;
  /** The destination token address (ZeroAddress for native ETH) */
  tokenAddress: string;
  /** The amount to pull in unit string (e.g., "10000000000000000" for 0.01 ETH) */
  amount: string;
  /** The merchant recipient address */
  receiverAddress: string;
  /** The Universal Account instance */
  universalAccount: UniversalAccount;
}

export interface PullTransactionResult {
  transaction: ITransaction;
  description: string;
}

/**
 * Creates a cross-chain pull transaction utilizing Particle Universal Account's 
 * createTransferTransaction.
 * 
 * The SDK will locate the user's primary assets across all supported chains,
 * calculate the bridging/swap path, and consolidate them into the destination
 * asset on Arbitrum.
 */
export async function createPullTransaction(
  params: PullTransactionParams
): Promise<PullTransactionResult> {
  const { destChainId, tokenAddress, amount, receiverAddress, universalAccount } = params;

  console.log("[CrossChainPull] Building pull transaction:", {
    destChainId,
    tokenAddress,
    amount,
    receiverAddress,
  });

  // Map destination chain to Particle SDK's CHAIN_ID enum
  // For Arbitrum Sepolia (42161 / ARBITRUM_MAINNET_ONE)
  let uaChainId = destChainId;
  if (destChainId === 42161) {
    uaChainId = CHAIN_ID.ARBITRUM_MAINNET_ONE;
  } else if (destChainId === 8453) {
    uaChainId = CHAIN_ID.BASE_MAINNET;
  } else if (destChainId === 1) {
    uaChainId = CHAIN_ID.ETHEREUM_MAINNET;
  }

  const transaction = await universalAccount.createTransferTransaction({
    token: {
      chainId: uaChainId,
      address: tokenAddress || ethers.ZeroAddress,
    },
    amount,
    receiver: receiverAddress,
  });

  const description = `Cross-chain pull of ${ethers.formatEther(amount)} ETH to ${receiverAddress}`;
  console.log("[CrossChainPull] Transaction compiled successfully. RootHash:", transaction.rootHash);

  return {
    transaction,
    description,
  };
}
