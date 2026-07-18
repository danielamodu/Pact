const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', '@particle-network', 'universal-account-sdk', 'dist', 'index.cjs');
const content = fs.readFileSync(filePath, 'utf8');

const regex = /0x[a-fA-F0-9]{40}/g;
const matches = content.match(regex) || [];
const uniqueMatches = [...new Set(matches)];

console.log("Found addresses in index.cjs:");
uniqueMatches.forEach(addr => console.log(`- ${addr}`));
