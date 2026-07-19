import { ethers } from "ethers";

/**
 * Scope that maps 1:1 to SessionKeyExecutor.SessionKeyScope on-chain.
 * maxAmountStr and expiryISO are explicit string fields required by the
 * contract's formatScopeStatement — they must match exactly.
 */
export interface SessionKeyScope {
  sessionKeyAddress: string; // must be lowercase to match on-chain addressToAsciiString()
  recipient: string;         // must be lowercase
  maxAmount: bigint;         // in wei (uint256)
  interval: number;          // in seconds
  expiry: number;            // Unix timestamp in seconds
  planId: number;
  maxAmountStr: string;      // e.g. "0.01" — used verbatim in scope statement
  expiryISO: string;         // e.g. "2026-08-16T12:00:00.000Z" — used verbatim
}

export interface SessionKeyDelegation {
  scope: SessionKeyScope;
  signature: string; // owner's ETH personal_sign over the scope statement
}

/**
 * Generates a new ephemeral session key (random EOA).
 */
export function generateSessionKey(): ethers.HDNodeWallet {
  return ethers.Wallet.createRandom();
}

/**
 * Formats the scope statement exactly as SessionKeyExecutor.formatScopeStatement() does on-chain.
 *
 * CRITICAL: addresses must be lowercase hex — the Solidity addressToAsciiString() helper
 * outputs lowercase. Signing with a checksummed (mixed-case) address causes a silent
 * signature-recovery failure ("Invalid owner signature") in executePull().
 *
 * Line-by-line match with SessionKeyExecutor.sol:
 *   "Pact Session Key Delegation:\n"
 *   "Session Key: " + lowercase(sessionKeyAddress) + "\n"
 *   "Recipient Merchant: " + lowercase(recipient) + "\n"
 *   "Max Amount: " + maxAmountStr + " ETH\n"    ← " ETH" hardcoded in contract
 *   "Interval: " + interval + " seconds\n"
 *   "Expires At: " + expiryISO + "\n"
 *   "Pact Protocol Security Code: 7702-SESS"    ← no trailing newline
 */
export function formatScopeStatement(scope: SessionKeyScope): string {
  return (
    `Pact Session Key Delegation:\n` +
    `Session Key: ${scope.sessionKeyAddress.toLowerCase()}\n` +
    `Recipient Merchant: ${scope.recipient.toLowerCase()}\n` +
    `Max Amount: ${scope.maxAmountStr} ETH\n` +
    `Interval: ${scope.interval} seconds\n` +
    `Expires At: ${scope.expiryISO}\n` +
    `Pact Protocol Security Code: 7702-SESS`
  );
}

/**
 * Saves the delegated session key info to localStorage.
 * Stored per planId so multiple subscriptions don't overwrite each other.
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
  localStorage.setItem(`${key}_delegation`, JSON.stringify(delegation));
  console.log("[SessionKey] Saved session key delegation for plan:", scope.planId);
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
      delegation = JSON.parse(delegationStr);
    } catch (e) {
      console.error("[SessionKey] Failed to parse session key delegation:", e);
    }
  }

  return { privateKey, delegation };
}

/**
 * Cryptographically verifies a session key delegation using ethers.verifyMessage.
 */
export function verifySessionKeyDelegation(
  ownerAddress: string,
  delegation: SessionKeyDelegation
): boolean {
  try {
    const statement = formatScopeStatement(delegation.scope);
    const recoveredAddress = ethers.verifyMessage(statement, delegation.signature);

    const matchesOwner =
      recoveredAddress.toLowerCase() === ownerAddress.toLowerCase();
    const isExpired = Date.now() / 1000 > delegation.scope.expiry;

    console.log("[SessionKey] Verification:", {
      recovered: recoveredAddress,
      expected: ownerAddress,
      matchesOwner,
      isExpired,
    });

    return matchesOwner && !isExpired;
  } catch (error) {
    console.error("[SessionKey] Verification error:", error);
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
