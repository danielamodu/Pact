const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const BASE_RPC = 'https://mainnet.base.org';
const SwapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'.toLowerCase();
const WETH = '0x4200000000000000000000000000000000000006'.toLowerCase();
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'.toLowerCase();

const RouterABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

async function main() {
  console.log("=== Swapping ETH for USDC on Base Uniswap V3 ===");
  const provider = new ethers.JsonRpcProvider(BASE_RPC);

  const keyPath = path.join(__dirname, '..', 'deployer.key');
  const privateKey = fs.readFileSync(keyPath, 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Wallet Address: ${wallet.address}`);

  const router = new ethers.Contract(SwapRouterAddress, RouterABI, wallet);

  const amountIn = ethers.parseEther("0.00005");
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 min from now

  const params = {
    tokenIn: WETH,
    tokenOut: USDC,
    fee: 500, // 0.05% pool
    recipient: wallet.address,
    deadline: deadline,
    amountIn: amountIn,
    amountOutMinimum: 0n, // no slippage checks for small demo amounts
    sqrtPriceLimitX96: 0n
  };

  console.log("Sending swap transaction...");
  const tx = await router.exactInputSingle(params, {
    value: amountIn,
    gasLimit: 300000
  });

  console.log(`Sent. Tx Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber}! Status: ${receipt.status}`);
}

main().catch(console.error);
