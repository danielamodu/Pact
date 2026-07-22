const { ethers } = require('ethers');

// Generate a fresh random wallet for OP Mainnet deployment
const wallet = ethers.Wallet.createRandom();
console.log("=== Fresh Deployer Wallet for OP Mainnet ===");
console.log(`Address:     ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey}`);
