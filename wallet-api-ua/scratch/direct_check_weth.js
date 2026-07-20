const { ethers } = require('ethers');
const BASE_RPC = 'https://mainnet.base.org';
const WETH = '0x4200000000000000000000000000000000000006';
const walletAddress = '0x4F31f7C529bf0cD0846E593fc043c552475A839c';

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const abi = [
    "function balanceOf(address account) external view returns (uint256)"
  ];
  const contract = new ethers.Contract(WETH, abi, provider);

  const rawBal = await contract.balanceOf(walletAddress);
  console.log(`WETH Formatted: ${ethers.formatEther(rawBal)}`);
}

main().catch(console.error);
