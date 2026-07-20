const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const BASE_RPC = 'https://mainnet.base.org';
const SwapRouterAddress = '0x2626664c2603336E57B271c5C0b26F421741e481'.toLowerCase();
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'.toLowerCase();
const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'.toLowerCase();

const WETH_ABI = [
  "function deposit() external payable",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

const RouterABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

async function main() {
  console.log("=== Swapping WETH for USDC on Base ===");
  const provider = new ethers.JsonRpcProvider(BASE_RPC);

  const keyPath = path.join(__dirname, '..', 'deployer.key');
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Wallet Address: ${wallet.address}`);

  const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);
  const router = new ethers.Contract(SwapRouterAddress, RouterABI, wallet);

  const amount = ethers.parseEther("0.00005");

  // 1. Wrap ETH -> WETH (skipped since we already have WETH balance)
  const wethBal = await weth.balanceOf(wallet.address);
  console.log(`WETH Balance: ${ethers.formatEther(wethBal)}`);

  // 2. Approve Router
  console.log("Approving SwapRouter02...");
  const appTx = await weth.approve(SwapRouterAddress, wethBal, { gasLimit: 100000 });
  await appTx.wait();
  console.log("Router approved!");

  // 3. Swap WETH -> USDC
  console.log("Swapping WETH to USDC...");
  const params = {
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 100, // 0.01% pool on Base
    recipient: wallet.address,
    amountIn: wethBal,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n
  };

  const swapTx = await router.exactInputSingle(params, { gasLimit: 300000 });
  console.log(`Swap Tx Sent. Hash: ${swapTx.hash}`);
  const receipt = await swapTx.wait();
  console.log(`Swap confirmed! Status: ${receipt.status}`);
}

main().catch(console.error);
