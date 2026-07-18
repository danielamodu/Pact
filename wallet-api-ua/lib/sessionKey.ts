import { ethers } from "ethers";

export interface SessionKeyScope {
  sessionKeyAddress: string;
  recipient: string;
  maxAmount: string; // in ether / units
  token: string;      // e.g., "ETH", "USDC"
  interval: number;   // in seconds
  expiry: number;     // timestamp in seconds
  planId: number;     // Plan ID from registry
}

export interface SessionKeyDelegation {
  scope: SessionKeyScope;
  signature: string; // Owner's signature over the scope statement
}

/**
 * Generates a new ephemeral session key (EOA)
 */
export function generateSessionKey(): ethers.HDNodeWallet {
  return ethers.Wallet.createRandom();
}

/**
 * Formats the session key scope into a human-readable statement to be signed by the owner.
 */
export function formatScopeStatement(scope: SessionKeyScope): string {
  return `Pact Session Key Delegation:
Session Key: ${scope.sessionKeyAddress.toLowerCase()}
Recipient Merchant: ${scope.recipient.toLowerCase()}
Max Amount: ${scope.maxAmount} ${scope.token}
Interval: ${scope.interval} seconds
Expires At: ${new Date(scope.expiry * 1000).toISOString()}
Pact Protocol Security Code: 7702-SESS`;
}

/**
 * Saves the delegated session key info to localStorage to simulate a database.
 */
export function saveSessionKeyDelegation(
  privateKey: string,
  scope: SessionKeyScope,
  signature: string
) {
  if (typeof window === "undefined") return;
  
  const delegation: SessionKeyDelegation = { scope, signature };
  localStorage.setItem("pact_session_key_pk", privateKey);
  localStorage.setItem("pact_session_key_delegation", JSON.stringify(delegation));
  console.log("[SessionKey] Saved session key delegation successfully.");
}

/**
 * Retrieves the session key delegation from localStorage.
 */
export function getSessionKeyDelegation(): {
  privateKey: string | null;
  delegation: SessionKeyDelegation | null;
} {
  if (typeof window === "undefined") {
    return { privateKey: null, delegation: null };
  }
  
  const privateKey = localStorage.getItem("pact_session_key_pk");
  const delegationStr = localStorage.getItem("pact_session_key_delegation");
  
  let delegation: SessionKeyDelegation | null = null;
  if (delegationStr) {
    try {
      delegation = JSON.parse(delegationStr);
    } catch (e) {
      console.error("[SessionKey] Failed to parse session key delegation", e);
    }
  }
  
  return { privateKey, delegation };
}

/**
 * Cryptographically verifies if a session key delegation is valid and signed by the smart account owner.
 * 
 * @param ownerAddress - The smart account owner's public address (EOA)
 * @param delegation - The delegation parameters and signature
 * @returns boolean
 */
export function verifySessionKeyDelegation(
  ownerAddress: string,
  delegation: SessionKeyDelegation
): boolean {
  try {
    const statement = formatScopeStatement(delegation.scope);
    const recoveredAddress = ethers.verifyMessage(statement, delegation.signature);
    
    const matchesOwner = recoveredAddress.toLowerCase() === ownerAddress.toLowerCase();
    const isExpired = Date.now() / 1000 > delegation.scope.expiry;
    
    console.log("[SessionKey] Verification results:", {
      recovered: recoveredAddress,
      expected: ownerAddress,
      matchesOwner,
      isExpired,
    });
    
    return matchesOwner && !isExpired;
  } catch (error) {
    console.error("[SessionKey] Verification failed with error:", error);
    return false;
  }
}

/**
 * Clears the session key from localStorage.
 */
export function clearSessionKeyDelegation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pact_session_key_pk");
  localStorage.removeItem("pact_session_key_delegation");
  console.log("[SessionKey] Cleared session key delegation.");
}
