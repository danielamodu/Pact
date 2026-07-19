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
  console.log("KEYS of assets:", Object.keys(assets));
  // Let's print the structure of one of the fields that is an array
  for (const key of Object.keys(assets)) {
    if (Array.isArray(assets[key])) {
      console.log(`Key ${key} is an array with length ${assets[key].length}`);
      console.log("First element keys:", Object.keys(assets[key][0]));
    }
  }
}).catch(err => {
  console.error("Error calling getPrimaryAssets:", err);
});
