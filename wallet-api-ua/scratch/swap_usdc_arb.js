const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const ARBITRUM_RPC = 'https://arbitrum-one-rpc.publicnode.com';
const SwapRouterAddress = ethers.getAddress('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45');
const WETH_ADDRESS = ethers.getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1');
const USDC_ADDRESS = ethers.getAddress('0xaf88d065e77c8cC2239327C5EDb3A432268e5831');

const WETH_ABI = [
  "function deposit() external payable",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

const RouterABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

async function main() {
  console.log("=== Swapping ETH to USDC on Arbitrum Uniswap V3 ===");
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

  const keyPath = path.join(__dirname, '..', 'deployer.key');
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Wallet Address: ${wallet.address}`);

  const weth = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);
  const router = new ethers.Contract(SwapRouterAddress, RouterABI, wallet);

  const amount = ethers.parseEther("0.00005");

  // 1. Wrap ETH -> WETH
  console.log("Wrapping 0.00005 ETH to WETH...");
  const depTx = await weth.deposit({ value: amount, gasLimit: 200000 });
  await depTx.wait();
  console.log("WETH deposit confirmed!");

  const wethBal = await weth.balanceOf(wallet.address);
  console.log(`WETH Balance: ${ethers.formatEther(wethBal)}`);

  // 2. Approve Router
  console.log("Approving SwapRouter02...");
  const appTx = await weth.approve(SwapRouterAddress, wethBal, { gasLimit: 200000 });
  await appTx.wait();
  console.log("Router approved!");

  // 3. Swap WETH -> USDC
  console.log("Swapping WETH to USDC...");
  const params = {
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 500, // 0.05% pool on Arbitrum
    recipient: wallet.address,
    amountIn: wethBal,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n
  };

  const swapTx = await router.exactInputSingle(params, { gasLimit: 500000 });
  console.log(`Swap Tx Sent. Hash: ${swapTx.hash}`);
  const receipt = await swapTx.wait();
  console.log(`Swap confirmed! Status: ${receipt.status}`);
}

main().catch(console.error);
