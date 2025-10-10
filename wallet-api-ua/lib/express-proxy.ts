import {
  TeeProxyEndpoint,
  SignDataRequest,
  SignDataResponse,
  SignMessageRequest,
  SignMessageResponse,
  WalletResponse,
} from "@/types/tee";

/**
 * Client-side proxy for TEE API calls
 * @param path - The TEE proxy endpoint path
 * @param init - Optional fetch init options
 * @returns Parsed JSON data from the response
 * @throws Error if response is not ok or contains error information
 */
export async function expressProxy<T = any>(
  path: TeeProxyEndpoint,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
  });

  // Handle response validation and JSON parsing
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    // If the response indicates re-authentication is needed, throw a specific error
    if (data.requiresReauth) {
      const error = new Error(data.error || "Authentication required");
      (error as any).requiresReauth = true;
      throw error;
    }

    // For other errors, throw a generic error
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Sign data with the TEE wallet
 * @param rawDataHash - The hash of the data to sign
 * @param chain - Chain identifier (e.g., "ETH")
 * @returns Signature components (r, s, v)
 */
export async function signData(
  rawDataHash: string,
  chain: string
): Promise<SignDataResponse> {
  const body: SignDataRequest = { raw_data_hash: rawDataHash, chain };
  return await expressProxy<SignDataResponse>(TeeProxyEndpoint.SIGN_DATA, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Sign a message with the TEE wallet
 * @param messageBase64 - The base64-encoded message to sign
 * @param chain - Chain identifier (e.g., "ETH")
 * @returns Signature
 */
export async function signMessage(
  messageBase64: string,
  chain: string
): Promise<SignMessageResponse> {
  const body: SignMessageRequest = { message_base64: messageBase64, chain };
  return await expressProxy<SignMessageResponse>(
    TeeProxyEndpoint.SIGN_MESSAGE,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

/**
 * Get or create a wallet with the TEE
 * @param chain - Chain identifier (e.g., "ETH")
 * @returns Wallet information including public address
 */
export async function getOrCreateWallet(
  chain: string
): Promise<WalletResponse> {
  const body = { chain };
  return await expressProxy<WalletResponse>(TeeProxyEndpoint.WALLET, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
