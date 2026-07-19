import OpenfortModule from "@openfort/openfort-node";
const Openfort = (OpenfortModule as any).default || OpenfortModule;
import { verifyTypedData, getAddress, type Address, type Hex } from "viem";

const apiKey = process.env.OPENFORT_SECRET_KEY;
const walletSecret = process.env.OPENFORT_WALLET_SECRET;
export const BACKEND_WALLET_ID = process.env.OPENFORT_BACKEND_WALLET_ID;
export const BACKEND_WALLET_ADDRESS = process.env.OPENFORT_BACKEND_WALLET_ADDRESS;

export function getOpenfortClient(): any {
  if (!apiKey) {
    throw new Error("OPENFORT_SECRET_KEY is not configured in environment variables.");
  }
  if (!walletSecret) {
    throw new Error("OPENFORT_WALLET_SECRET is not configured in environment variables.");
  }
  return new Openfort(apiKey, { walletSecret });
}

// x402 EIP-712 Types for EIP-3009 TransferWithAuthorization
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
} as const;

export interface PaymentRequirements {
  x402Version: 2;
  scheme: "exact";
  network: "base-sepolia" | "base";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: Address;
  maxTimeoutSeconds: number;
  asset: Address;
  extra?: {
    name?: string;
    version?: string;
  };
}

export interface ExactEvmPayloadAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
}

export interface ExactEvmPayload {
  signature: Hex;
  authorization: ExactEvmPayloadAuthorization;
}

export interface PaymentPayload {
  x402Version: 2;
  scheme: "exact";
  network: "base-sepolia" | "base";
  payload: ExactEvmPayload;
}

// Canonical chain IDs matching networks
export const NETWORK_CHAIN_ID = {
  "base-sepolia": 84532,
  base: 8453,
} as const;

export const USDC_ADDRESSES: Record<number, Address> = {
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

/**
 * Decodes the base64-encoded payment header and parses it into a PaymentPayload.
 */
export function decodeAndParsePaymentHeader(paymentHeader: string): PaymentPayload {
  if (!paymentHeader) {
    throw new Error("Missing PAYMENT-SIGNATURE header.");
  }
  try {
    const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return parsed as PaymentPayload;
  } catch (err) {
    throw new Error("Failed to decode or parse PAYMENT-SIGNATURE header.");
  }
}

/**
 * Verifies an off-chain x402 payment header.
 * Recreates the domain, message, and checks the signature against the payer.
 */
export async function verifyOffChainPayment(
  paymentHeader: string,
  requirements: PaymentRequirements
): Promise<boolean> {
  const payment = decodeAndParsePaymentHeader(paymentHeader);

  // Validate version and scheme
  if (payment.x402Version !== 2 || payment.scheme !== "exact") {
    throw new Error("Unsupported x402 version or payment scheme.");
  }

  // Validate network matches requirements
  if (payment.network !== requirements.network) {
    throw new Error(`Network mismatch. Expected ${requirements.network}, got ${payment.network}`);
  }

  const { authorization, signature } = payment.payload;
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Temporal validation
  if (BigInt(authorization.validBefore) <= BigInt(nowSeconds)) {
    throw new Error("Payment authorization has expired.");
  }
  if (BigInt(authorization.validAfter) > BigInt(nowSeconds)) {
    throw new Error("Payment authorization is not yet valid.");
  }

  // Recipient validation
  if (getAddress(authorization.to) !== getAddress(requirements.payTo)) {
    throw new Error("Payment is not addressed to the correct recipient.");
  }

  // Amount validation
  if (BigInt(authorization.value) < BigInt(requirements.maxAmountRequired)) {
    throw new Error("Payment amount is less than the required amount.");
  }

  // Asset validation
  const chainId = NETWORK_CHAIN_ID[payment.network];
  const expectedAsset = USDC_ADDRESSES[chainId];
  if (getAddress(requirements.asset) !== getAddress(expectedAsset)) {
    throw new Error("Asset address mismatch for the network.");
  }

  // Domain configuration
  const domain = {
    name: requirements.extra?.name || "USD Coin",
    version: requirements.extra?.version || "2",
    chainId,
    verifyingContract: getAddress(requirements.asset),
  };

  const message = {
    from: getAddress(authorization.from),
    to: getAddress(authorization.to),
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
    nonce: authorization.nonce,
  };

  // Perform cryptographic signature recovery and verification
  const isValid = await verifyTypedData({
    address: getAddress(authorization.from),
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message,
    signature,
  });

  if (!isValid) {
    throw new Error("Cryptographic verification failed: invalid signature.");
  }

  return true;
}
