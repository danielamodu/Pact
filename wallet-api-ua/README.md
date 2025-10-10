# Magic API Wallet + Particle Universal Accounts Demo

A demo showing how to implement Magic's TEE (Trusted Execution Environment) API Wallet with OAuth authentication, and enhance it with Particle Network's Universal Account for chain abstraction and cross-chain capabilities.

## What This Demo Shows

- **Magic Wallet API Implementation** - Server-side EOA wallet creation and management
- **Universal Account Integration** - Adding Universal Accounts on top of Magic's EOA
- **OAuth-based Authentication** - Using Google ID tokens for wallet derivation
- **Unified Balance** - Unified balance tracking across multiple chains and assets
- **Mint a cross-chain NFT** - Mint a NFT on Avalanche even if you don't hold any funds on Avalanche

> Docs:
>
> [Magic TEE Express API Documentation](https://docs.magic.link/api-wallets/introduction)
>
> [Particle Network Universal Account](https://developers.particle.network/universal-accounts/cha/overview)

## Key Concepts

### Magic Wallet API (TEE Express)
Magic's TEE API creates and manages **EOA (Externally Owned Account)** wallets server-side. The private key is derived from the user's OAuth ID token and stored securely in Magic's Trusted Execution Environment. Your application never has access to the private key.

### Universal Accounts: One Account, One Balance, Any Chain

**The Problem Universal Accounts Solve:**
Traditional blockchain wallets require users to manage separate addresses, balances, and gas tokens on each chain. If for example, you want to interact with a dApp on Avalanche but only have funds on Solana, you need to manually bridge assets and acquire AVAX for gas—a complex, multi-step process.

**How Universal Accounts Work:**
Universal Accounts provide **chain abstraction** by creating a single smart account that:

1. **Unified Balance Across Chains** - Your assets on Ethereum, Base, Solana, Avalanche, and [15+ other chains](https://developers.particle.network/universal-accounts/cha/chains) are treated as one collective balance
2. **Automatic Cross-Chain Operations** - When you submit a transaction on any chain, the system automatically bridges funds from wherever you have them to fulfill your intent
3. **Gas Abstraction** - Pay gas fees using any [primary token](https://developers.particle.network/universal-accounts/cha/chains#primary-assets) you hold, not just the native chain token (e.g., use USDC to pay for Ethereum gas)
4. **Single Account** - One Universal Account that works across all supported EVM chains + Solana

**In This Demo:**
- The **Magic EOA** acts as the "owner" (signer) of the Universal Account
- The **Universal Account** is a smart contract wallet (ERC-4337) deployed across multiple chains
- Users interact with one account, but can access funds and perform operations on any supported chain seamlessly

**Example Flow:**
```
User has $100 USDC on Solana
User wants to mint NFT on Avalanche (costs $5)
→ Universal Account automatically:
  1. Source the required funds from wherever they are
  2. Executes the mint transaction
→ User sees it as one simple action
```

## Prerequisites

Before running this demo, you need:

1. **Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

2. **Magic API Keys**
   - Sign up at [Magic Dashboard](https://dashboard.magic.link/)
   - Get your API key and OIDC Provider ID

3. **Particle Network Credentials**
   - Sign up at [Particle Network Dashboard](https://dashboard.particle.network/)
   - Create a project and get your credentials

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env.local
   ```

3. **Configure environment variables in `.env.local`:**
   ```env
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Magic TEE API
   MAGIC_API_KEY=your_magic_api_key
   OIDC_PROVIDER_ID=your_oidc_provider_id

   # Particle Network Universal Account
   NEXT_PUBLIC_PROJECT_ID=your_particle_project_id
   NEXT_PUBLIC_CLIENT_KEY=your_particle_client_key
   NEXT_PUBLIC_APP_ID=your_particle_app_id

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
   ```

4. **Generate NextAuth secret:**
   ```bash
   openssl rand -base64 32
   ```

## Running the Demo

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### 1. Magic Wallet API Implementation

#### Authentication & Wallet Creation
```
User Login (Google OAuth)
    ↓
NextAuth generates ID token
    ↓
Client calls /api/tee/wallet
    ↓
Server forwards ID token to Magic TEE API
    ↓
Magic derives private key from ID token
    ↓
Returns EOA public address
```

**Key Implementation Details:**

- **ID Token as User Identifier**: Magic uses the Google ID token to deterministically derive the same wallet for a user across sessions
- **Server-side Proxy**: All Magic API calls go through Next.js API routes (`/app/api/tee/*`) to keep the Magic API key secure
- **No Private Key Exposure**: The private key never leaves Magic's TEE infrastructure

**Code Flow:**
1. `contexts/AuthProvider.tsx` - Manages authentication state and triggers wallet creation
2. `lib/express-proxy.ts` - Client-side functions that call your API routes
3. `app/api/tee/wallet/route.ts` - Validates session and forwards to Magic
4. `lib/express.ts` - Server-side client that adds Magic API credentials

### 2. Universal Account Integration

#### Adding Universal Account Layer
Once the Magic EOA is created, the Universal Account SDK wraps it:

```javascript
const ua = new UniversalAccount({
  projectId: PARTICLE_PROJECT_ID,
  projectClientKey: PARTICLE_CLIENT_KEY,
  projectAppUuid: PARTICLE_APP_ID,
  ownerAddress: magicEOAAddress,  // Magic wallet as owner
});
```

**What This Provides:**
- **Universal Account Address** - Contract wallet on EVM chains
- **Unified Balance** - Aggregated balance across all chains in USD
- **Cross-chain Operations** - Future: swaps, bridges, gasless transactions

**Code Location:** `app/wallet/page.tsx` - Initializes UA when Magic wallet address is available

#### Account Hierarchy
```
Google Account (OAuth)
    ↓
Magic EOA (0x123...)           ← Private key in TEE
    ↓ (owner)
Universal Account
    ├── EVM Smart Account (0xabc...)
    └── Solana Smart Account (xyz...)
```

The Magic EOA controls the Universal Account smart contracts through signature-based authorization.

## Security Model

### Magic TEE Security
- **Private keys never exposed** - Keys are generated and stored exclusively in Magic's Trusted Execution Environment
- **Deterministic derivation** - Same OAuth ID token always produces the same wallet
- **Server-side signing** - All cryptographic operations happen in the TEE, not in your application
- **API key protection** - Magic API credentials only used in Next.js API routes (server-side)

### Session Security
- **JWT-based sessions** - NextAuth manages encrypted session tokens
- **Automatic token refresh** - Google OAuth tokens refreshed before expiration
- **Session validation** - All API routes verify authentication before forwarding to Magic
- **Re-auth on error** - Users are signed out if token refresh fails

## API Reference

### Magic TEE Endpoints (via proxy)

**Create/Get Wallet**
```typescript
POST /api/tee/wallet
Body: { chain: "ETH" }
Response: { public_address: "0x..." }
```

**Sign Message**
```typescript
POST /api/tee/wallet/sign/message
Body: { message_base64: "...", chain: "ETH" }
Response: { signature: "0x..." }
```

**Sign Data (Typed Data / Transaction)**
```typescript
POST /api/tee/wallet/sign/data
Body: { raw_data_hash: "0x...", chain: "ETH" }
Response: { r: "0x...", s: "0x...", v: 27 }
```

### Universal Account SDK

**Initialize**
```typescript
const ua = new UniversalAccount({
  projectId: string,
  projectClientKey: string,
  projectAppUuid: string,
  ownerAddress: string,  // Magic EOA address
});
```

**Get Account Info**
```typescript
const options = await ua.getSmartAccountOptions();
// Returns: { ownerAddress, smartAccountAddress, solanaSmartAccountAddress }
```

**Get Unified Balance**
```typescript
const assets = await ua.getPrimaryAssets();
// Returns: { totalAmountInUSD, assets: [...] }
```

## Learn More

- [Magic TEE Express API Documentation](https://docs.magic.link/api-wallets/introduction)
- [Particle Network Universal Account](https://developers.particle.network/universal-accounts/cha/overview)

## License

MIT
