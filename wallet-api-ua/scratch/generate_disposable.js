const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const wallet = ethers.Wallet.createRandom();
const keyPath = path.join(__dirname, '..', 'deployer.key');

fs.writeFileSync(keyPath, wallet.privateKey, 'utf8');

console.log("\n==================================================");
console.log("Generated fresh disposable deployer wallet:");
console.log(`Address: ${wallet.address}`);
console.log("Private key saved to deployer.key");
console.log("==================================================\n");
console.log("Please fund this address with a small amount of Sepolia ETH.");
console.log("Once funded, let me know, and I will run the deployment script.");
