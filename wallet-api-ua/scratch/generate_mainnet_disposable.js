const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const wallet = ethers.Wallet.createRandom();
const keyPath = path.join(__dirname, '..', 'deployer.key');

fs.writeFileSync(keyPath, wallet.privateKey, 'utf8');

console.log("\n==================================================");
console.log("Generated fresh disposable Mainnet deployer wallet:");
console.log(`Address: ${wallet.address}`);
console.log("Private key saved to deployer.key");
console.log("==================================================\n");
console.log("Please fund this address on:");
console.log("1. Arbitrum One Mainnet with ~0.001 ETH (approx $3.00)");
console.log("2. Base Mainnet with ~0.001 ETH (approx $3.00)");
console.log("\nOnce funded, let me know, and I will deploy to mainnet.");
