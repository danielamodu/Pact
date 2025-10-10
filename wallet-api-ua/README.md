# Magic API Wallet Demo

A simplified demo of Magic's API Wallet with OAuth authentication, TEE (Trusted Execution Environment) wallet management, and Particle Network Universal Account integration.

## Features

- ✅ **Google OAuth Authentication** via NextAuth.js
- ✅ **Server-side Wallet Management** using Magic's TEE Express API
- ✅ **Universal Account Integration** with Particle Network
- ✅ **EVM Signing Methods**:
  - Personal Sign
  - Sign Typed Data (V1, V3, V4)
  - Sign Transaction
- ✅ **Cross-chain Balance Tracking** via Universal Account
- ✅ **Secure Key Management** - Private keys never leave Magic's TEE

## Architecture

This demo implements a **server-side wallet solution** where:
1. Users authenticate via Google OAuth
2. Magic's TEE creates/manages wallets server-side
3. All signing operations happen through secure API calls
4. Private keys never leave Magic's infrastructure
5. Particle Network's Universal Account provides cross-chain features

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

## Project Structure

```
wallet-api-ua/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth configuration
│   │   └── tee/                   # TEE API proxy routes
│   ├── wallet/                    # Wallet page
│   ├── layout.tsx                 # Root layout with providers
│   └── page.tsx                   # Login page
├── components/
│   ├── AuthButton.tsx             # Google sign-in button
│   ├── Button.tsx                 # Reusable button component
│   ├── EVMSignMethods.tsx         # EVM signing interface
│   └── UserInfo.tsx               # User profile & wallet info
├── contexts/
│   ├── SessionProvider.tsx        # NextAuth session provider
│   └── WalletContext.tsx          # Wallet state management
├── lib/
│   ├── express.ts                 # TEE API client (server-side)
│   ├── express-proxy.ts           # TEE API proxy (client-side)
│   ├── ethereum.ts                # Ethereum signing service
│   ├── wallet.ts                  # Wallet service
│   └── utils.ts                   # Utility functions
├── types/
│   ├── next-auth.d.ts            # NextAuth type extensions
│   ├── particle.ts               # Particle Network types
│   └── tee.ts                    # TEE API types
└── constants/
    └── sign-payloads.ts          # Sample signing payloads
```

## How It Works

### Authentication Flow
1. User clicks "Connect with Google"
2. NextAuth handles OAuth flow
3. ID token stored in session
4. Session validated on protected routes

### Wallet Creation
1. After auth, context calls `/api/tee/wallet`
2. API route validates session
3. Forwards request to Magic TEE API with ID token
4. TEE creates/retrieves wallet
5. Public address returned to client

### Universal Account
1. Initialized with TEE wallet address as owner
2. Fetches smart account addresses (EVM + Solana)
3. Aggregates balance across chains
4. Enables cross-chain operations

### Signing Operations
1. User selects signing method
2. Client prepares payload
3. Calls appropriate `/api/tee/wallet/sign/*` endpoint
4. API route validates session and forwards to TEE
5. TEE signs with private key
6. Signature returned to client

## Security

- ✅ Private keys stored in Magic's TEE
- ✅ All signing happens server-side
- ✅ JWT-based authentication
- ✅ Automatic token refresh
- ✅ Session validation on all API routes

## Learn More

- [Magic Documentation](https://magic.link/docs)
- [Particle Network Docs](https://docs.particle.network/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
