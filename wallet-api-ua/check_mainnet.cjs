const { ethers } = require('ethers');
const address = '0x6a7438A16D907f7f43044384335D9E347a04a68C';
const networks = [
  { name: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc' },
  { name: 'Base Mainnet', rpc: 'https://mainnet.base.org' }
];
async function check() {
  for (const net of networks) {
    const provider = new ethers.JsonRpcProvider(net.rpc);
    try {
      const bal = await provider.getBalance(address);
      console.log(net.name + ' ETH: ' + ethers.formatEther(bal));
    } catch(e) {
      console.log(net.name + ' error: ' + e.message);
    }
  }
}
check();
