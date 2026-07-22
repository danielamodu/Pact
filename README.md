# Pact Protocol

**Autonomous recurring payments on Web3 — powered by EIP-7702 account delegation and Particle Network Universal Accounts.**

Live app: [pactxbt.vercel.app](https://pactxbt.vercel.app)  
Source: [github.com/danielamodu/Pact](https://github.com/danielamodu/Pact)

---

## What is Pact?

Pact is a trustless, on-chain subscription protocol for Ethereum L2 networks. It solves the core problem with Web3 recurring payments: every billing cycle has historically required a manual wallet signature.

With Pact, a subscriber signs **once** to authorize a scoped session key. An autonomous keeper then executes recurring pulls — within hard cryptographic limits — without the user ever needing to sign again.

> "Set it. Forget it. On-chain."

---

## How It Works

### For Merchants
1. Create a subscription plan on `PactRegistry` (name, token, price, interval, payout address)
2. Share a subscribe link: `/subscription/PLAN_ID?network=arbitrum`
3. Register a webhook to receive signed `pull.executed` events for each payment
4. Receive recurring payments automatically — no action required per billing cycle

### For Subscribers
1. Log in with Google (Magic TEE wallet created server-side, keys never exposed)
2. Click subscribe — Pact generates an ephemeral session key and signs an EIP-7702 authorization
3. Sign a scoped `SessionKeyScope` via EIP-712 — the only signature you'll ever need
4. Done. The autonomous keeper handles all future billing pulls within the limits you authorized

### For External Apps (Spotify-style Integration)
External apps add Pact as a payment method without touching any contracts:
1. Create a plan → get a `planId`
2. Redirect users to Pact's subscribe URL or embed the iframe widget
3. Register a webhook URL to receive payment events
4. Check subscription status via the public API: `GET /api/v1/subscriptions/status?planId=X&subscriber=0x...`

---

## Architecture

### EIP-7702 Account Delegation

Pact uses [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) (live since Ethereum Pectra, May 2025) to set an EOA's bytecode to point to `SessionKeyExecutor.sol`. This gives a standard wallet smart-contract execution capabilities without requiring full ERC-4337 migration or a new wallet address.

The Type-4 upgrade transaction is sponsored by a server-side relayer — subscribers never pay gas for this step.

### Session Keys (EIP-712)

After the EIP-7702 upgrade, a subscriber signs a `SessionKeyScope` struct:

```
SessionKeyScope {
  sessionKeyAddress  // ephemeral EOA generated client-side
  recipient          // merchant payout address — hard-locked
  maxAmount          // spend cap per cycle
  token              // USDC, USDT, or ETH
  interval           // minimum seconds between pulls
  expiry             // auto-expires after N billing cycles
  planId             // which plan this scope is for
  nonce              // replay protection
}
```

The session key is cryptographically bound to these limits. The keeper can never pull more than `maxAmount`, pay anyone other than the registered merchant, or pull faster than `interval` seconds — all enforced on-chain by `SessionKeyExecutor.sol`.

The session key private key is encrypted with AES-256-GCM before storage in the Pact database.

### Autonomous Keeper

The keeper runs every 5 minutes via Vercel Cron and cron-job.org (as a fallback). It is an API route — no separate process to maintain.

For each stored delegation it:
1. Reads all active delegations from Neon PostgreSQL
2. Checks revocation, expiry, and interval elapsed on-chain
3. Verifies subscriber token balance before attempting
4. Funds the session key wallet with gas if needed
5. Submits `executePull()` from the session key wallet (not the relayer) to satisfy the on-chain `msg.sender == scope.sessionKeyAddress` check
6. Logs each pull on-chain via `PactRegistry`
7. Fires a signed webhook (`X-Pact-Signature: sha256=...`) to the merchant's registered URL

Trigger a manual cycle:

```
POST /api/keeper/execute-pulls
Authorization: Bearer <KEEPER_API_SECRET>
```

### Magic TEE Wallet

Each user gets a server-side EOA derived from their Google OAuth ID token inside Magic's Trusted Execution Environment. The private key is never exposed to the application — all signing happens in the TEE via the Magic API.

Subscribers can authorize subscriptions without installing MetaMask or any external wallet. Login with Google → you have a self-custodied on-chain wallet.

### Particle Network Universal Accounts

The Magic TEE EOA is linked to a [Particle Network Universal Account](https://developers.particle.network/universal-accounts/cha/overview), enabling:

- Unified balance display across Arbitrum, Base, and 15+ other chains
- Gas abstraction via primary assets (USDC, ETH, etc.)
- Foundation for cross-chain subscription funding

### x402 Pay-Per-Call Analytics

`/api/insights/plan-health` is gated behind HTTP 402 micropayments using [Openfort](https://www.openfort.io/). Merchants pay 0.05 USDC per analytics request via an EIP-3009 payment signed automatically by an Openfort backend wallet.

### Webhooks

Merchants register a webhook URL per plan. On each successful pull, Pact posts a signed event:

```json
{
  "event": "pull.executed",
  "planId": "4",
  "network": "arbitrum",
  "subscriber": "0x...",
  "amount": "9990000",
  "txHash": "0x...",
  "timestamp": "2026-07-22T18:00:00.000Z"
}
```

Every request includes `X-Pact-Signature: sha256=<HMAC-SHA256>` for verification.

### Embeddable Subscribe Button

Drop an iframe into any webpage:

```html
<iframe
  src="https://pactxbt.vercel.app/embed/PLAN_ID?network=NETWORK"
  width="320" height="120"
  style="border:none;border-radius:8px"
></iframe>
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Auth | NextAuth v5 + Google OAuth |
| TEE Wallet | Magic TEE API (server-side EOA, keys never exposed) |
| Universal Account | Particle Network UA SDK |
| Smart Contracts | Solidity 0.8.20, Arbitrum One + Base Mainnet |
| Account Delegation | EIP-7702 (Type-4 transactions) |
| Session Permissions | EIP-712 typed data signatures |
| Session Key Storage | Neon PostgreSQL (AES-256-GCM encrypted) |
| Keeper | Vercel Cron + cron-job.org (API route, no separate process) |
| Webhooks | HMAC-SHA256 signed payloads (`X-Pact-Signature`) |
| Gas Sponsorship | Custom server-side relayer (Next.js API route) |
| Analytics Paywall | x402 + Openfort backend wallet |
| Networks | Arbitrum One (42161), Base Mainnet (8453) |

---

## Smart Contracts

Both contracts are deployed at the same deterministic address on Arbitrum One and Base Mainnet:

| Contract | Address |
|---|---|
| `PactRegistry` | [`0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56`](https://arbiscan.io/address/0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56) |
| `SessionKeyExecutor` | [`0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f`](https://arbiscan.io/address/0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f) |

Verified on Basescan:
- [PactRegistry on Base](https://basescan.org/address/0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56)
- [SessionKeyExecutor on Base](https://basescan.org/address/0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f)

---

## Live Demo Plans

Two subscription plans are live on Arbitrum One:

| Plan | ID | Price | Network |
|---|---|---|---|
| How to Cook | `4` | 0.00001 ETH / 30 days | Arbitrum One |
| Learn to Code | `5` | 0.000001 ETH / 30 days | Arbitrum One |

Subscribe directly: `/subscription/4?network=arbitrum`

---

## Setup

### Prerequisites
- Node.js 18+
- Google OAuth credentials
- Magic TEE API key
- Particle Network project credentials
- Funded relayer wallet (for gas sponsorship)
- Neon PostgreSQL database

### Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Magic TEE API
MAGIC_API_KEY=
OIDC_PROVIDER_ID=

# Particle Network
NEXT_PUBLIC_PROJECT_ID=
NEXT_PUBLIC_CLIENT_KEY=
NEXT_PUBLIC_APP_ID=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Relayer (gas sponsor wallet)
RELAYER_PRIVATE_KEY=

# Keeper (autonomous pull execution)
KEEPER_RELAYER_PRIVATE_KEY=
KEEPER_API_SECRET=

# Database (Neon PostgreSQL — session key delegation store)
DATABASE_URL=

# Session key encryption (AES-256-GCM, 32-byte hex)
ENCRYPTION_KEY=

# Openfort (x402 analytics paywall)
OPENFORT_SECRET_KEY=
OPENFORT_BACKEND_WALLET_ID=
OPENFORT_BACKEND_WALLET_ADDRESS=
```

### Install & Run

```bash
cd wallet-api-ua
npm install
npm run dev
```

The keeper runs automatically on Vercel Cron every 5 minutes. For local testing, trigger it manually:

```bash
curl -X POST http://localhost:3000/api/keeper/execute-pulls \
  -H "Authorization: Bearer <KEEPER_API_SECRET>"
```

---

## Security Model

- **Private keys never exposed** — Magic TEE derives wallet keys from OAuth tokens inside a Trusted Execution Environment. Your app never sees the key.
- **Session key encryption** — Session key private keys are encrypted with AES-256-GCM (per-key random IV + auth tag) before being stored in the database.
- **Session key scoping** — Each session key is cryptographically bound to a specific recipient, amount cap, interval, and expiry. The keeper cannot exceed these bounds.
- **On-chain interval enforcement** — `SessionKeyExecutor.sol` enforces minimum elapsed time between pulls independently of the keeper.
- **Revocation** — Subscribers can revoke a session key at any time from the dashboard, instantly stopping future pulls.
- **Nonce protection** — Both the scope signature and execution signature include nonces to prevent replay attacks.
- **Signed webhooks** — Every `pull.executed` webhook is signed with HMAC-SHA256 so merchant servers can verify it came from Pact.
