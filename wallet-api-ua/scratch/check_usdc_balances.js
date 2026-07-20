const { ethers } = require('ethers');

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const BASE_RPC = 'https://mainnet.base.org';

const ARB_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913";

const addresses = [
  "0x4F31f7C529bf0cD0846E593fc043c552475A839c", // deployer EOA
  "0xF7D4f5F87f1A3879B7eF41E15c87D0d6eF7f08c3", // relayer
  "0x6a7438A16D907f7f43044384335D9E347a04a68C", // treasury
  "0xF821447c6Bd7c54e5FC2Bd92239F4D8eD73C52f0", // merchant
  "0x320d034d76c4c79b12850d288bf68044abe7bf2f",  // backend wallet
  "0x13c42592354BedAFa7762E9aFFDAfd6f86832Dff"  // Smart Account
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

async function checkUSDC(name, rpc, usdcAddr) {
  console.log(`\n=== USDC balances on ${name} ===`);
  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(ethers.getAddress(usdcAddr.toLowerCase()), ERC20_ABI, provider);

  for (const addr of addresses) {
    try {
      const bal = await contract.balanceOf(ethers.getAddress(addr.toLowerCase()));
      const dec = await contract.decimals();
      const sym = await contract.symbol();
      console.log(`${addr}: ${ethers.formatUnits(bal, dec)} ${sym}`);
    } catch (e) {
      console.log(`${addr}: error querying ${e.message}`);
    }
  }
}

async function main() {
  await checkUSDC("Arbitrum", ARBITRUM_RPC, ARB_USDC);
  await checkUSDC("Base", BASE_RPC, BASE_USDC);
}

main().catch(console.error);
