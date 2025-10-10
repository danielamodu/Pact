# Quick Start Guide

## 1. Environment Setup

Copy the example environment file:
```bash
cp env.example .env.local
```

Fill in your credentials in `.env.local`:

### Google OAuth (Required)
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

### Magic API (Required)
1. Sign up at https://dashboard.magic.link/
2. Create a new app
3. Get your API Secret Key
4. Get your OIDC Provider ID from the OAuth settings

### Particle Network (Required)
1. Sign up at https://dashboard.particle.network/
2. Create a new project
3. Copy Project ID, Client Key, and App ID

### NextAuth Secret (Required)
Generate a random secret:
```bash
openssl rand -base64 32
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Run the App

```bash
npm run dev
```

Open http://localhost:3000

## 4. Test the Flow

1. **Login**: Click "Connect with Google" and authorize
2. **View Wallet**: See your TEE wallet address and Universal Account addresses
3. **Check Balance**: View your unified balance across chains
4. **Sign Messages**: Test different EVM signing methods:
   - Personal Sign
   - Sign Typed Data (V1, V3, V4)
   - Sign Transaction

## Troubleshooting

### "Module not found" errors
- Make sure all dependencies are installed: `npm install`
- Check that tsconfig.json has the correct path aliases

### Authentication errors
- Verify Google OAuth credentials are correct
- Check that redirect URI matches exactly
- Ensure NEXTAUTH_SECRET is set

### TEE API errors
- Verify Magic API key is correct
- Check OIDC Provider ID matches your Magic app
- Ensure the chain parameter is correct ("ETH" for Ethereum)

### Universal Account errors
- Verify Particle Network credentials
- Check that the wallet address is valid
- Ensure you have the latest SDK version

## Environment Variables Reference

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Magic TEE API
MAGIC_API_KEY=sk_live_your_magic_api_key
OIDC_PROVIDER_ID=your_oidc_provider_id

# Particle Network Universal Account
NEXT_PUBLIC_PROJECT_ID=your_particle_project_id
NEXT_PUBLIC_CLIENT_KEY=your_particle_client_key
NEXT_PUBLIC_APP_ID=your_particle_app_id

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here
```

## Next Steps

- Customize the UI in `components/`
- Add more signing methods in `components/EVMSignMethods.tsx`
- Implement transaction sending
- Add error handling and user feedback
- Deploy to production (update NEXTAUTH_URL)
