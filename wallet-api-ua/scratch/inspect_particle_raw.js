const { UniversalAccount } = require('@particle-network/universal-account-sdk');
const fs = require('fs');

try {
  const env = fs.readFileSync('.env', 'utf8');
  env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
} catch(e) {}

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
const projectClientKey = process.env.NEXT_PUBLIC_CLIENT_KEY;
const projectAppUuid = process.env.NEXT_PUBLIC_APP_ID;
const ownerAddress = "0x320d034d76c4c79b12850d288bf68044abe7bf2f"; // dummy address

const ua = new UniversalAccount({
  projectId,
  projectClientKey,
  projectAppUuid,
  ownerAddress,
  smartAccountOptions: {
    name: "UNIVERSAL",
    version: "1.0.3",
    ownerAddress,
    useEIP7702: true
  }
});

ua.getPrimaryAssets().then(assets => {
  fs.writeFileSync('scratch/particle_assets_output.json', JSON.stringify(assets, null, 2));
  console.log("Assets written to scratch/particle_assets_output.json");
  process.exit(0);
}).catch(err => {
  console.error("Error calling getPrimaryAssets:", err);
  process.exit(1);
});
