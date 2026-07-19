import { ethers } from "ethers";
import { getOrCreateWallet } from "./express-proxy";
import { ethereumService } from "./ethereum";

// PactRegistry ABI
export const PACT_REGISTRY_ABI = [
  "function createPlan(string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress) external returns (uint256)",
  "function getPlan(uint256 planId) external view returns (tuple(string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress, bool active))",
  "function setPlanActive(uint256 planId, bool active) external",
  "function subscribe(uint256 planId, address executorContract) external",
  "function nextPlanId() external view returns (uint256)",
  "event PlanCreated(uint256 indexed planId, address indexed merchant, string name, address token, uint256 price, uint256 intervalSeconds, address payoutAddress)",
  "event Subscribed(uint256 indexed planId, address indexed subscriber, address indexed executorContract)",
  "event PullExecuted(uint256 indexed planId, address indexed subscriber, uint256 amount, uint256 timestamp)",
  "event SubscriptionRevoked(uint256 indexed planId, address indexed subscriber)"
];

// Standard ERC20 ABI
export const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 value) external returns (bool)"
];

// Deployed PactRegistry address (same address on both Arbitrum and Base)
export const PACT_REGISTRY_ADDRESS = "0xF2cDBAcdcE2D7961C2dE969E28F623ffac617CF5";

// Deployed SessionKeyExecutor address per network
export const SESSION_KEY_EXECUTOR_ADDRESS: Record<"arbitrum" | "base", string> = {
  arbitrum: "0x70cD033936Ae7AA52E788A16A275FF437528911D",
  base: "0x70cD033936Ae7AA52E788A16A275FF437528911D",
};

// Network Configurations
export const NETWORKS = {
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  },
  base: {
    chainId: 8453,
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913"
  }
};

/**
 * Gets a read-only provider for the specified network
 */
export function getProvider(networkKey: "arbitrum" | "base") {
  const config = NETWORKS[networkKey];
  return new ethers.JsonRpcProvider(config.rpc);
}

/**
 * Fetches standard USDC token balance for a given address
 */
export async function getUSDCBalance(address: string, networkKey: "arbitrum" | "base"): Promise<string> {
  try {
    const provider = getProvider(networkKey);
    const config = NETWORKS[networkKey];
    const contract = new ethers.Contract(config.usdcAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error(`Error fetching USDC balance on ${networkKey}:`, error);
    return "0.00";
  }
}

/**
 * Fetches native ETH balance for a given address
 */
export async function getETHBalance(address: string, networkKey: "arbitrum" | "base"): Promise<string> {
  try {
    const provider = getProvider(networkKey);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`Error fetching ETH balance on ${networkKey}:`, error);
    return "0.00";
  }
}

/**
 * Queries PlanCreated events to fetch all plans created by a specific merchant
 */
export async function getPlansForMerchant(merchantAddress: string, networkKey: "arbitrum" | "base") {
  try {
    const provider = getProvider(networkKey);
    const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);
    
    // Filter PlanCreated events by merchant
    const filter = contract.filters.PlanCreated(null, merchantAddress);
    const events = await contract.queryFilter(filter, -100000); // query last 100,000 blocks
    
    const plansList = [];
    for (const event of events) {
      if ("args" in event && event.args) {
        const { planId, name, token, price, intervalSeconds, payoutAddress } = event.args as any;
        
        // Fetch current active state
        let active = true;
        try {
          const planData = await contract.getPlan(planId);
          active = planData.active;
        } catch (err) {
          console.warn("Could not fetch active state for plan:", planId.toString(), err);
        }

        let tokenSymbol = "USDC";
        let tokenDecimals = 6;
        
        if (token.toLowerCase() === "0x0000000000000000000000000000000000000000" || 
            token.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
          tokenSymbol = "ETH";
          tokenDecimals = 18;
        } else if (token.toLowerCase() === "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" || 
                   token.toLowerCase() === "0x50c5725949a6f0c72e6c4a641f240e934e271057") {
          tokenSymbol = "USDT";
          tokenDecimals = 6;
        }

        plansList.push({
          id: planId.toString(),
          planName: name,
          token: tokenSymbol,
          status: active ? ("active" as const) : ("paused" as const),
          price: `${ethers.formatUnits(price, tokenDecimals)} ${tokenSymbol}`,
          subscribers: 0, // dynamic subscriber parsing can be done by filtering Subscribed events
          revenue: "$0.00",
          network: networkKey
        });
      }
    }
    return plansList;
  } catch (error) {
    console.error(`Error querying plans on ${networkKey}:`, error);
    return [];
  }
}

/**
 * Queries Subscribed events to fetch all active subscriptions for a user
 */
export async function getSubscriptionsForUser(userAddress: string, networkKey: "arbitrum" | "base") {
  try {
    const provider = getProvider(networkKey);
    const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);

    const filter = contract.filters.Subscribed(null, userAddress);
    const events = await contract.queryFilter(filter, -100000);

    const subsList = [];
    for (const event of events) {
      if ("args" in event && event.args) {
        const { planId } = event.args as any;
        
        try {
          const plan = await contract.getPlan(planId);
          subsList.push({
            id: planId.toString(),
            plan: plan.name,
            merchant: networkKey === "arbitrum" ? "Arbitrum Service" : "Base Service",
            status: plan.active ? ("active" as const) : ("past-due" as const),
            amount: `${ethers.formatUnits(plan.price, 6)} USDC`,
            nextBilling: new Date(Date.now() + Number(plan.intervalSeconds) * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            }),
            revokeHref: `/subscription/${planId.toString()}`
          });
        } catch (err) {
          console.error(`Failed to fetch plan info for subscription planId ${planId.toString()}:`, err);
        }
      }
    }
    return subsList;
  } catch (error) {
    console.error(`Error querying subscriptions on ${networkKey}:`, error);
    return [];
  }
}

/**
 * Creates a plan on-chain using the TEE-managed Universal Account signature
 */
export async function createPlanOnchain(
  networkKey: "arbitrum" | "base",
  name: string,
  tokenAddress: string,
  priceInUnits: string,
  intervalSeconds: number,
  payoutAddress: string
): Promise<string> {
  const provider = getProvider(networkKey);
  const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);

  // 1. Encode createPlan data
  const data = contract.interface.encodeFunctionData("createPlan", [
    name,
    tokenAddress,
    priceInUnits,
    intervalSeconds,
    payoutAddress
  ]);

  // 2. Fetch current nonce, gas details, and TEE wallet public address
  const walletData = await getOrCreateWallet("ETH");
  const fromAddress = walletData.public_address;
  const nonce = await provider.getTransactionCount(fromAddress);
  const feeData = await provider.getFeeData();

  // Multiply the estimated gas price by 1.5 (50% safety buffer) to prevent
  // the "max fee per gas less than block base fee" error due to minor fee fluctuations.
  const gasPrice = feeData.gasPrice
    ? (feeData.gasPrice * BigInt(150)) / BigInt(100)
    : BigInt(1000000000); // 1 Gwei default

  // 3. Construct raw transaction payload
  const txRequest = {
    to: PACT_REGISTRY_ADDRESS,
    from: fromAddress,
    data,
    nonce,
    gasLimit: BigInt(300000),
    gasPrice,
    chainId: NETWORKS[networkKey].chainId
  };

  // 4. Sign transaction via TEE service
  const signedTx = await ethereumService.signTransaction(txRequest);

  // 5. Broadcast signed transaction to network provider
  const txResponse = await provider.broadcastTransaction(signedTx);
  return txResponse.hash;
}

/**
 * Executes a withdrawal from the TEE-managed Universal Account to an external recipient address
 */
export async function withdrawOnchain(
  networkKey: "arbitrum" | "base",
  recipientAddress: string,
  asset: "ETH" | "USDC",
  amountInUnits: string
): Promise<string> {
  const provider = getProvider(networkKey);
  const config = NETWORKS[networkKey];
  
  // 1. Fetch TEE wallet address
  const walletData = await getOrCreateWallet("ETH");
  const fromAddress = walletData.public_address;
  const nonce = await provider.getTransactionCount(fromAddress);
  const feeData = await provider.getFeeData();

  // Multiply the estimated gas price by 1.5 (50% safety buffer) to prevent
  // the "max fee per gas less than block base fee" error due to minor fee fluctuations.
  const gasPrice = feeData.gasPrice
    ? (feeData.gasPrice * BigInt(150)) / BigInt(100)
    : BigInt(1000000000); // 1 Gwei default

  const txRequest: any = {
    from: fromAddress,
    nonce,
    gasPrice,
    chainId: config.chainId
  };

  if (asset === "ETH") {
    txRequest.to = recipientAddress;
    txRequest.value = amountInUnits;
    txRequest.data = "0x";
    txRequest.gasLimit = BigInt(21000);
  } else {
    const erc20Contract = new ethers.Contract(config.usdcAddress, ERC20_ABI, provider);
    const data = erc20Contract.interface.encodeFunctionData("transfer", [
      recipientAddress,
      amountInUnits
    ]);
    txRequest.to = config.usdcAddress;
    txRequest.data = data;
    txRequest.gasLimit = BigInt(80000); // Standard transfer takes ~60-65k gas
  }

  // Sign transaction via TEE service
  const signedTx = await ethereumService.signTransaction(txRequest);

  // Broadcast signed transaction to network provider
  const txResponse = await provider.broadcastTransaction(signedTx);
  return txResponse.hash;
}

/**
 * Fetches detailed plan analytics including real subscribers and total revenue
 */
export async function getPlanDetails(planIdStr: string, networkKey: "arbitrum" | "base") {
  const provider = getProvider(networkKey);
  const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);

  const planId = BigInt(planIdStr);
  const plan = await contract.getPlan(planId);

  // Determine token details
  let tokenSymbol = "USDC";
  let tokenDecimals = 6;
  if (plan.token.toLowerCase() === "0x0000000000000000000000000000000000000000" || 
      plan.token.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    tokenSymbol = "ETH";
    tokenDecimals = 18;
  } else if (plan.token.toLowerCase() === "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" || 
             plan.token.toLowerCase() === "0x50c5725949a6f0c72e6c4a641f240e934e271057") {
    tokenSymbol = "USDT";
    tokenDecimals = 6;
  }

  // 1. Fetch Subscribed events for planId
  const subFilter = contract.filters.Subscribed(planId, null, null);
  const subEvents = await contract.queryFilter(subFilter, -100000);
  
  const subscribersSet = new Set<string>();
  const subscribersList: Array<{ address: string; blockNumber: number }> = [];

  for (const event of subEvents) {
    if ("args" in event && event.args) {
      const subscriber = event.args[1] as string;
      if (!subscribersSet.has(subscriber.toLowerCase())) {
        subscribersSet.add(subscriber.toLowerCase());
        subscribersList.push({
          address: subscriber,
          blockNumber: event.blockNumber
        });
      }
    }
  }

  // 2. Fetch PullExecuted events for planId
  const pullFilter = contract.filters.PullExecuted(planId, null, null, null);
  const pullEvents = await contract.queryFilter(pullFilter, -100000);
  
  let totalRevenueUnits = BigInt(0);
  for (const event of pullEvents) {
    if ("args" in event && event.args) {
      const amount = event.args[2] as bigint;
      totalRevenueUnits += amount;
    }
  }

  return {
    name: plan.name,
    token: tokenSymbol,
    price: ethers.formatUnits(plan.price, tokenDecimals),
    intervalDays: Math.round(Number(plan.intervalSeconds) / 86400),
    payoutAddress: plan.payoutAddress,
    active: plan.active,
    subscribersCount: subscribersList.length,
    subscribers: subscribersList,
    totalRevenue: ethers.formatUnits(totalRevenueUnits, tokenDecimals)
  };
}

/**
 * Calls PactRegistry.subscribe(planId, sessionKeyAddress) on-chain via TEE-signed transaction.
 * This is the bookkeeping step — it emits a Subscribed event that the dashboard reads.
 * Must be called AFTER the EIP-7702 upgrade has been confirmed.
 */
export async function subscribeOnchain(
  networkKey: "arbitrum" | "base",
  planId: number,
  sessionKeyAddress: string
): Promise<string> {
  const provider = getProvider(networkKey);
  const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);

  // Encode subscribe(planId, executorContract) — executorContract is the session key address
  const data = contract.interface.encodeFunctionData("subscribe", [
    BigInt(planId),
    sessionKeyAddress,
  ]);

  const walletData = await getOrCreateWallet("ETH");
  const fromAddress = walletData.public_address;
  const nonce = await provider.getTransactionCount(fromAddress);
  const feeData = await provider.getFeeData();

  const gasPrice = feeData.gasPrice
    ? (feeData.gasPrice * BigInt(150)) / BigInt(100) // 50% buffer
    : BigInt(1_000_000_000);

  // Estimate gas for the subscribe call
  let gasLimit: bigint;
  try {
    const estimated = await provider.estimateGas({
      from: fromAddress,
      to: PACT_REGISTRY_ADDRESS,
      data,
      nonce,
      gasPrice,
      chainId: NETWORKS[networkKey].chainId,
    });
    gasLimit = (estimated * BigInt(140)) / BigInt(100); // 40% buffer
  } catch {
    gasLimit = BigInt(200_000); // fallback
  }

  const txRequest = {
    to: PACT_REGISTRY_ADDRESS,
    from: fromAddress,
    data,
    nonce,
    gasLimit,
    gasPrice,
    chainId: NETWORKS[networkKey].chainId,
  };

  const signedTx = await ethereumService.signTransaction(txRequest);
  const txResponse = await provider.broadcastTransaction(signedTx);
  return txResponse.hash;
}
