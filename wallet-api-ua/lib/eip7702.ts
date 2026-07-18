import { Signature, hashAuthorization } from "ethers";
import { signData } from "./express-proxy";

export type EIP7702Authorization = {
  userOpHash: string;
  signature: string;
};

export type UserOp = {
  userOpHash: string;
  eip7702Auth?: {
    address: string;
    chainId: number;
    nonce: number;
  };
  eip7702Delegated?: boolean;
};

/**
 * Signs an EIP-7702 authorization using the server-side Magic TEE Wallet API.
 * 
 * @param params - The target contract, chain ID, and EOA nonce
 * @returns The signature components
 */
export async function sign7702Authorization(params: {
  contractAddress: string;
  chainId: number;
  nonce: number;
}) {
  console.log("[EIP-7702] Hashing authorization request:", params);
  
  // Calculate keccak256(0x05 || rlp([chain_id, address, nonce]))
  const authHash = hashAuthorization({
    address: params.contractAddress,
    chainId: params.chainId,
    nonce: params.nonce,
  });

  console.log("[EIP-7702] Derived authorization hash:", authHash);

  // Request the TEE wallet proxy to sign the hash
  const response = await signData(authHash, "ETH");
  console.log("[EIP-7702] Received signature from TEE wallet:", response);

  return {
    r: response.r,
    s: response.s,
    v: BigInt(response.v),
    yParity: response.v >= 27 ? (response.v - 27) % 2 : response.v % 2,
  };
}

/**
 * Iterates through UserOperations and generates EIP-7702 authorizations using the Magic TEE wallet.
 * 
 * @param userOps - Array of user operations from Particle Network transaction construction
 * @returns Array of EIP-7702 authorizations with serialized signatures
 */
export async function handleEIP7702Authorizations(
  userOps: UserOp[]
): Promise<EIP7702Authorization[]> {
  const authorizations: EIP7702Authorization[] = [];
  const nonceMap = new Map<number, string>();

  for (const userOp of userOps) {
    if (!!userOp.eip7702Auth && !userOp.eip7702Delegated) {
      let signatureSerialized = nonceMap.get(userOp.eip7702Auth.nonce);
      
      if (!signatureSerialized) {
        // Sign the authorization using Magic TEE
        const authSignature = await sign7702Authorization({
          contractAddress: userOp.eip7702Auth.address,
          chainId: Number(userOp.eip7702Auth.chainId),
          nonce: userOp.eip7702Auth.nonce,
        });

        // Serialize signature components into standard hex signature
        const sig = Signature.from({
          r: authSignature.r,
          s: authSignature.s,
          v: authSignature.v,
        });
        signatureSerialized = sig.serialized;
        nonceMap.set(userOp.eip7702Auth.nonce, signatureSerialized);
      }

      if (signatureSerialized) {
        authorizations.push({
          userOpHash: userOp.userOpHash,
          signature: signatureSerialized,
        });
      }
    }
  }

  return authorizations;
}
