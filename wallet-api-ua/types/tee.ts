export enum TeeEndpoint {
  WALLET = "/v1/wallet",
  SIGN_DATA = "/v1/wallet/sign/data",
  SIGN_MESSAGE = "/v1/wallet/sign/message",
}

export enum TeeProxyEndpoint {
  WALLET = "/api/tee/wallet",
  SIGN_DATA = "/api/tee/wallet/sign/data",
  SIGN_MESSAGE = "/api/tee/wallet/sign/message",
}

export interface WalletResponse {
  public_address: string;
  [k: string]: unknown;
}

export interface SignDataRequest {
  raw_data_hash: string;
  chain: string;
}

export interface SignDataResponse {
  r: string;
  s: string;
  v: number;
}

export interface SignMessageRequest {
  message_base64: string;
  chain: string;
}

export interface SignMessageResponse {
  signature: string;
  [k: string]: unknown;
}
