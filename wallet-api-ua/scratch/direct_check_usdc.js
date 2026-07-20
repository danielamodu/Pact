const { ethers } = require('ethers');

const BASE_RPC = 'https://mainnet.base.org';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const walletAddress = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
  ];
  const contract = new ethers.Contract(USDC, abi, provider);

  const rawBal = await contract.balanceOf(walletAddress);
  const decimals = await contract.decimals();
  console.log(`USDC Raw Balance: ${rawBal.toString()}, Decimals: ${decimals}, Formatted: ${ethers.formatUnits(rawBal, decimals)}`);
}

main().catch(console.error);
