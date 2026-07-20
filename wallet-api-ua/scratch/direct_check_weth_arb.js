const { ethers } = require('ethers');
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const WETH = '0x82aF49447D8a07e3bd95BD0d56f352415231aa11'.toLowerCase();
const walletAddress = '0x4F31f7C529bf0cD0846E593fc043c552475A839c'.toLowerCase();

async function main() {
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const abi = [
    "function balanceOf(address account) external view returns (uint256)"
  ];
  const contract = new ethers.Contract(ethers.getAddress(WETH), abi, provider);

  const rawBal = await contract.balanceOf(ethers.getAddress(walletAddress));
  console.log(`Arbitrum WETH Formatted: ${ethers.formatEther(rawBal)}`);
}

main().catch(console.error);
