# Pact Protocol

**Autonomous recurring payments on Web3 — powered by EIP-7702 account delegation and Particle Network Universal Accounts.**

Live app: [pactxbt.vercel.app](https://pactxbt.vercel.app)  
Source: [github.com/danielamodu/Pact](https://github.com/danielamodu/Pact)

---

## What is Pact?

Pact is a trustless, on-chain subscription protocol for Ethereum L2 networks. It solves the core problem with Web3 recurring payments: every billing cycle has historically required a manual wallet signature.

With Pact, a subscriber signs **once** to authorize a scoped session key. A relayer then executes recurring pulls autonomously — within hard cryptographic limits — without the user ever needing to sign again.

> "Set it. Forget it. On-chain."

---

## How It Works

### For Merchants
1. Create a subscription plan on `PactRegistry` (name, token, price, interval, payout address)
2. Share a subscribe link: `/subscribe?planId=X&network=arbitrum`
3. Receive recurring payments automatically

### For Subscribers
1. Log in with Google (Magic TEE wallet created server-side)
2. Click subscribe — Pact checks if your EOA needs an EIP-7702 upgrade
3. If needed, our gas-sponsored relayer submits the Type-4 upgrade transaction for free
4. Sign a scoped `SessionKeyScope` via EIP-712 — this is the only signature you'll ever need
5. Done. The relayer handles all future billing pulls within the bounds you authorized

---

## Architecture

### EIP-7702 Account Delegation
Pact uses [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) (live on Ethereum mainnet since Pectra, May 2025) to temporarily set an EOA's bytecode to point to `SessionKeyExecutor.sol`. This gives a standard wallet smart-contract execution capabilities without requiring full ERC-4337 migration.

The Type-4 upgrade transaction is sponsored by a server-side relayer — users never need ETH upfront for this step.

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

The session key private key is stored in `localStorage`. The relayer uses it to co-sign execution calls without ever having the authority to pull more than `maxAmount` or pay anyone other than the registered merchant.

### Autonomous Execution (Keeper)
`scripts/keeper.mjs` is a lightweight Node.js process that:
1. Scans all `Subscribed` events from `PactRegistry`
2. Fetches each subscriber's stored session key delegation
3. Checks if `interval` has elapsed since the last pull
4. Builds and submits the `executePull` transaction to `SessionKeyExecutor`
5. Logs the pull via `PactRegistry.logPull` for on-chain receipts

Run it as a cron job or keep it running continuously:
```bash
node scripts/keeper.mjs
```

Or trigger a single execution cycle via the API:
```
POST /api/keeper/execute-pulls
Authorization: Bearer <KEEPER_API_SECRET>
```

### Particle Network Universal Accounts
The Magic TEE EOA is the owner of a [Particle Network Universal Account](https://developers.particle.network/universal-accounts/cha/overview), enabling:
- Unified balance across Arbitrum, Base, and 15+ other chains
- Cross-chain subscription funding — subscribe on Arbitrum using funds on Base
- Gas abstraction via primary assets (USDC, ETH, etc.)

### x402 Pay-Per-Call Analytics
`/api/insights/plan-health` is gated behind HTTP 402 micropayments using [Openfort](https://www.openfort.io/). Merchants pay 0.05 USDC per analytics request — dogfooding the protocol's own payment primitive.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Auth | NextAuth v5 + Google OAuth |
| TEE Wallet | Magic TEE API (server-side EOA, keys never exposed) |
| Cross-Chain | Particle Network Universal Account SDK |
| Smart Contracts | Solidity 0.8.20, deployed on Arbitrum One + Base Mainnet |
| Account Delegation | EIP-7702 (Type-4 transactions) |
| Session Permissions | EIP-712 typed data signatures |
| Gas Sponsorship | Custom server-side relayer (Next.js API route) |
| Analytics Paywall | x402 + Openfort backend wallet |
| Networks | Arbitrum One (42161), Base Mainnet (8453) |

---

## Smart Contracts

Both contracts are deployed at the same deterministic address on Arbitrum One and Base Mainnet:

| Contract | Address |
|---|---|
| `PactRegistry` | `0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56` |
| `SessionKeyExecutor` | `0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f` |

- [PactRegistry on Arbiscan](https://arbiscan.io/address/0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56)
- [SessionKeyExecutor on Arbiscan](https://arbiscan.io/address/0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f)
- [PactRegistry on Basescan](https://basescan.org/address/0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56)
- [SessionKeyExecutor on Basescan](https://basescan.org/address/0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f)

---

## Setup

### Prerequisites
- Node.js 18+
- Google OAuth credentials
- Magic TEE API key
- Particle Network project credentials
- Funded relayer wallet (for gas sponsorship)

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

# Openfort (x402 analytics paywall)
OPENFORT_SECRET_KEY=
OPENFORT_BACKEND_WALLET_ID=
OPENFORT_BACKEND_WALLET_ADDRESS=
```

### Install & Run

```bash
npm install
npm run dev
```

### Run the Keeper

```bash
node scripts/keeper.mjs
```

Or set up a cron job to run it every minute:
```
* * * * * cd /path/to/pact/wallet-api-ua && node scripts/keeper.mjs >> keeper.log 2>&1
```

---

## Security Model

- **Private keys never exposed** — Magic TEE derives wallet keys from OAuth tokens inside a Trusted Execution Environment. Your app never sees the key.
- **Session key scoping** — Each session key is cryptographically bound to a specific recipient, amount cap, interval, and expiry. The relayer cannot exceed these bounds.
- **Revocation** — Subscribers can revoke a session key at any time from the dashboard, instantly stopping future pulls.
- **Nonce protection** — Both the scope signature and execution signature include nonces to prevent replay attacks.
- **Interval enforcement** — `SessionKeyExecutor.sol` enforces minimum elapsed time between pulls on-chain, independent of the relayer.

---

## Built For

UXmaxx Hackathon — Particle Network EIP-7702 Track  
July 2025
