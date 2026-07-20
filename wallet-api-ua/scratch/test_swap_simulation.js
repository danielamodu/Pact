const { ethers } = require('ethers');

const BASE_RPC = 'https://mainnet.base.org';
const SwapRouterAddress = '0x2626664c2603336E57B271c5C0b26F421741e481'.toLowerCase();
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'.toLowerCase();
const USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'.toLowerCase();

const RouterABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const wallet = new ethers.Wallet("0xedb86a6103406ea6601beb2470987c2c1869173b2ca89792ff534b72870e7d08", provider);

  const router = new ethers.Contract(SwapRouterAddress, RouterABI, wallet);
  const amount = ethers.parseEther("0.00005");

  const deadline = Math.floor(Date.now() / 1000) + 600;
  
  // Test both fee tiers: 500 (0.05%) and 100 (0.01%)
  for (const fee of [100, 500, 3000]) {
    console.log(`\nSimulating swap with fee ${fee}...`);
    const params = {
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      fee: fee,
      recipient: wallet.address,
      amountIn: amount,
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n
    };

    try {
      const result = await router.exactInputSingle.staticCall(params);
      console.log(`Success! Result: ${result.toString()}`);
    } catch (e) {
      console.error(`Failed with error:`, e.message || e);
      if (e.data) console.error("Error data:", e.data);
    }
  }
}

main().catch(console.error);
