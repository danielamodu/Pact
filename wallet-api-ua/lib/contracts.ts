import { ethers } from "ethers";
import { getOrCreateWallet } from "./express-proxy";
import { ethereumService } from "./ethereum";
import { getSessionKeyDelegation, isRevokedSessionKey } from "./sessionKey";

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
export const PACT_REGISTRY_ADDRESS = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";

// Deployed SessionKeyExecutor address per network
export const SESSION_KEY_EXECUTOR_ADDRESS: Record<"arbitrum" | "base", string> = {
  arbitrum: "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f",
  base: "0xb804Fe2A839FD11aaAFc24258498e8Ef8476d74f",
};

// Network Configurations
export const NETWORKS = {
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    deployBlock: 485100000
  },
  base: {
    chainId: 8453,
    name: "Base Mainnet",
    rpc: "https://mainnet.base.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
    deployBlock: 487800000
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
 * Helper to query contract events taking network RPC limits into account.
 * Base public gateways limit query range to 10,000 blocks, so we batch it.
 */
async function queryEvents(
  contract: ethers.Contract,
  filter: any,
  networkKey: "arbitrum" | "base"
) {
  const provider = contract.runner as ethers.JsonRpcProvider;
  const config = NETWORKS[networkKey];
  const startBlock = config.deployBlock;
  
  if (networkKey === "arbitrum") {
    // Arbitrum has no range limit on public RPCs, query directly
    return await contract.queryFilter(filter, startBlock);
  } else {
    // Base limits queries to 10,000 block ranges
    const latestBlock = await provider.getBlockNumber();
    const chunkSize = 10000;
    const promises = [];
    
    for (let start = startBlock; start <= latestBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, latestBlock);
      promises.push(contract.queryFilter(filter, start, end));
    }
    
    const results = await Promise.all(promises);
    return results.flat();
  }
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
    const events = await queryEvents(contract, filter, networkKey);
    
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
    const events = await queryEvents(contract, filter, networkKey);

    const seenPlanIds = new Set<string>();
    const subsList = [];
    for (const event of events) {
      if ("args" in event && event.args) {
        const { planId } = event.args as any;
        const pIdStr = planId.toString();
        if (seenPlanIds.has(pIdStr)) continue;
        seenPlanIds.add(pIdStr);
        
        try {
          const plan = await contract.getPlan(planId);

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

          const formattedPrice = ethers.formatUnits(plan.price, tokenDecimals);

          const localDelegation = getSessionKeyDelegation(Number(planId));
          const isRevoked = isRevokedSessionKey(Number(planId)) || (!localDelegation.delegation && !localDelegation.privateKey);
          const statusVal = isRevoked ? ("revoked" as const) : plan.active ? ("active" as const) : ("past-due" as const);

          subsList.push({
            id: planId.toString(),
            plan: plan.name,
            merchant: plan.payoutAddress && plan.payoutAddress !== ethers.ZeroAddress
              ? `${plan.payoutAddress.slice(0, 6)}...${plan.payoutAddress.slice(-4)}`
              : `${networkKey === "arbitrum" ? "Arbitrum" : "Base"} Merchant`,
            status: statusVal,
            amount: `${formattedPrice} ${tokenSymbol}`,
            priceNum: parseFloat(formattedPrice),
            tokenSymbol,
            nextBilling: new Date(Date.now() + Number(plan.intervalSeconds) * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            }),
            revokeHref: `/subscription/${planId.toString()}?network=${networkKey}`
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

  // 1. Encode createPlan function call data
  const data = contract.interface.encodeFunctionData("createPlan", [
    name,
    tokenAddress,
    priceInUnits,
    intervalSeconds,
    payoutAddress
  ]);

  // 2. Submit via TEE Universal Account
  const walletData = await getOrCreateWallet("ETH");
  const fromAddress = walletData.public_address;
  const nonce = await provider.getTransactionCount(fromAddress);
  const feeData = await provider.getFeeData();

  const gasPrice = feeData.gasPrice
    ? (feeData.gasPrice * BigInt(150)) / BigInt(100)
    : BigInt(1000000000);

  const txRequest = {
    to: PACT_REGISTRY_ADDRESS,
    from: fromAddress,
    data,
    nonce,
    gasLimit: BigInt(300000),
    gasPrice,
    chainId: NETWORKS[networkKey].chainId
  };

  const signedTx = await ethereumService.signTransaction(txRequest);
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

  // 1. Fetch TEE wallet address directly
  const walletData = await getOrCreateWallet("ETH");
  const fromAddress = walletData.public_address;
  const nonce = await provider.getTransactionCount(fromAddress);
  const feeData = await provider.getFeeData();

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
    txRequest.gasLimit = BigInt(250000); // 250k gas to handle L2 Arbitrum/Base data overhead
  } else {
    const erc20Contract = new ethers.Contract(config.usdcAddress, ERC20_ABI, provider);
    const data = erc20Contract.interface.encodeFunctionData("transfer", [
      recipientAddress,
      amountInUnits
    ]);
    txRequest.to = config.usdcAddress;
    txRequest.data = data;
    txRequest.gasLimit = BigInt(250000);
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
  const subEvents = await queryEvents(contract, subFilter, networkKey);
  
  const subscribersSet = new Set<string>();
  const subscribersList: Array<{ address: string; blockNumber: number }> = [];

  for (const event of subEvents) {
    if ("args" in event && event.args) {
      const subscriber = event.args[1] as string;
      const localDelegation = getSessionKeyDelegation(Number(planId));
      const revoked = isRevokedSessionKey(Number(planId)) || (!localDelegation.delegation && !localDelegation.privateKey);
      if (!revoked && !subscribersSet.has(subscriber.toLowerCase())) {
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
  const pullEvents = await queryEvents(contract, pullFilter, networkKey);
  
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
