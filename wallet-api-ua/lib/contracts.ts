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
  "function symbol() external view returns (string)"
];

// Deployed PactRegistry address
export const PACT_REGISTRY_ADDRESS = "0xF2cDBAcdcE2D7961C2dE969E28F623ffac617CF5";

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

        plansList.push({
          id: planId.toString(),
          planName: name,
          token: token === NETWORKS[networkKey].usdcAddress ? "USDC" : "USDC",
          status: active ? ("active" as const) : ("paused" as const),
          price: `${ethers.formatUnits(price, 6)} USDC`,
          subscribers: 0, // dynamic subscriber parsing can be done by filtering Subscribed events
          revenue: "$0.00"
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

  // 3. Construct raw transaction payload
  const txRequest = {
    to: PACT_REGISTRY_ADDRESS,
    from: fromAddress,
    data,
    nonce,
    gasLimit: BigInt(300000),
    gasPrice: feeData.gasPrice || BigInt(1000000000), // default 1 Gwei
    chainId: NETWORKS[networkKey].chainId
  };

  // 4. Sign transaction via TEE service
  const signedTx = await ethereumService.signTransaction(txRequest);

  // 5. Broadcast signed transaction to network provider
  const txResponse = await provider.broadcastTransaction(signedTx);
  return txResponse.hash;
}
