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

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "8e0b60ba-6c33-4293-bfb8-f33f8d889114";
const projectClientKey = process.env.NEXT_PUBLIC_CLIENT_KEY || "c27MqU6j4lNYOhOXUsU29A8met2N9KsJli0Ic55u";
const projectAppUuid = process.env.NEXT_PUBLIC_APP_ID || "01bc1045-ed39-44c4-b1f2-ecfa8aff3be4";
const ownerAddress = "0x320d034d76c4c79b12850d288bf68044abe7bf2f"; // dummy address

const ua = new UniversalAccount({
  projectId,
  projectClientKey,
  projectAppUuid,
  ownerAddress,
  smartAccountOptions: {
    name: "BICONOMY",
    version: "2.0.0",
    ownerAddress,
    useEIP7702: true
  }
});

console.log("UniversalAccount instance properties & methods:");
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(ua));
console.log(methods);
