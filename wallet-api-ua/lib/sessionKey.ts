import { ethers } from "ethers";

export interface SessionKeyScope {
  sessionKeyAddress: string;
  recipient: string;
  maxAmount: bigint;
  token: string;
  interval: number;
  expiry: number;
  planId: number;
}

export interface SessionKeyDelegation {
  scope: SessionKeyScope;
  signature: string; // owner's EIP-712 signature over SessionKeyScope
}

export const EIP712_DOMAIN_NAME = "Pact Protocol";
export const EIP712_DOMAIN_VERSION = "1";

export const EIP712_TYPES = {
  SessionKeyScope: [
    { name: "sessionKeyAddress", type: "address" },
    { name: "recipient", type: "address" },
    { name: "maxAmount", type: "uint256" },
    { name: "token", type: "address" },
    { name: "interval", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "planId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
  PullExecution: [
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "nonce", type: "uint256" },
  ]
};

export function getEIP712Domain(chainId: number, verifyingContract: string) {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

/**
 * Generates a new ephemeral session key (random EOA).
 */
export function generateSessionKey(): ethers.HDNodeWallet {
  return ethers.Wallet.createRandom();
}

/**
 * Saves the delegated session key info to localStorage.
 */
export function saveSessionKeyDelegation(
  privateKey: string,
  scope: SessionKeyScope,
  signature: string
) {
  if (typeof window === "undefined") return;

  const delegation: SessionKeyDelegation = { scope, signature };
  const key = `pact_session_key_plan_${scope.planId}`;
  localStorage.setItem(`${key}_pk`, privateKey);
  localStorage.setItem(`${key}_delegation`, JSON.stringify(delegation, (k, v) => 
    typeof v === "bigint" ? v.toString() : v
  ));
  console.log("[SessionKey] Saved EIP-712 session key delegation for plan:", scope.planId);
}

/**
 * Retrieves the session key delegation for a specific plan from localStorage.
 */
export function getSessionKeyDelegation(planId: number): {
  privateKey: string | null;
  delegation: SessionKeyDelegation | null;
} {
  if (typeof window === "undefined") {
    return { privateKey: null, delegation: null };
  }

  const key = `pact_session_key_plan_${planId}`;
  const privateKey = localStorage.getItem(`${key}_pk`);
  const delegationStr = localStorage.getItem(`${key}_delegation`);

  let delegation: SessionKeyDelegation | null = null;
  if (delegationStr) {
    try {
      const parsed = JSON.parse(delegationStr);
      delegation = {
        scope: {
          ...parsed.scope,
          maxAmount: BigInt(parsed.scope.maxAmount)
        },
        signature: parsed.signature
      };
    } catch (e) {
      console.error("[SessionKey] Failed to parse session key delegation:", e);
    }
  }

  return { privateKey, delegation };
}

/**
 * Cryptographically verifies a session key delegation using ethers.verifyTypedData.
 */
export function verifySessionKeyDelegation(
  ownerAddress: string,
  delegation: SessionKeyDelegation,
  chainId: number,
  verifyingContract: string,
  nonce: number
): boolean {
  try {
    const domain = getEIP712Domain(chainId, verifyingContract);
    const types = { SessionKeyScope: EIP712_TYPES.SessionKeyScope };
    const value = {
      sessionKeyAddress: delegation.scope.sessionKeyAddress,
      recipient: delegation.scope.recipient,
      maxAmount: delegation.scope.maxAmount,
      token: delegation.scope.token,
      interval: delegation.scope.interval,
      expiry: delegation.scope.expiry,
      planId: delegation.scope.planId,
      nonce,
    };

    const recoveredAddress = ethers.verifyTypedData(domain, types, value, delegation.signature);
    const matchesOwner = recoveredAddress.toLowerCase() === ownerAddress.toLowerCase();
    const isExpired = Date.now() / 1000 > delegation.scope.expiry;

    console.log("[SessionKey] EIP-712 Verification:", {
      recovered: recoveredAddress,
      expected: ownerAddress,
      matchesOwner,
      isExpired,
    });

    return matchesOwner && !isExpired;
  } catch (error) {
    console.error("[SessionKey] EIP-712 Verification error:", error);
    return false;
  }
}

/**
 * Clears the session key delegation for a specific plan from localStorage.
 */
export function clearSessionKeyDelegation(planId: number) {
  if (typeof window === "undefined") return;
  const key = `pact_session_key_plan_${planId}`;
  localStorage.removeItem(`${key}_pk`);
  localStorage.removeItem(`${key}_delegation`);
  console.log("[SessionKey] Cleared session key delegation for plan:", planId);
}
