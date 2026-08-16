/**
 * Authorizes the keeper wallet as a caller on PactRegistry.
 *
 * PactRegistry.logPull() and logRevoke() are both `onlyAuthorized`. Until the
 * keeper wallet is authorized, every logPull reverts — and because the keeper
 * swallows that failure as non-critical, plans silently report 0.00 revenue and
 * an empty billing history even when pulls succeed on-chain.
 *
 * Reports current state by default; pass --execute to send the transactions.
 *
 *   node scripts/authorize-keeper.mjs
 *   node scripts/authorize-keeper.mjs --execute
 *
 * Private keys are read from .env and never printed.
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";

try {
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch { /* .env optional */ }

const PACT_REGISTRY_ADDRESS = "0x9Db4207Da96c5ee738F19B54aa4D49Bc0FA64F56";

const NETWORKS = {
  arbitrum: { name: "Arbitrum One", rpc: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io" },
  base:     { name: "Base Mainnet", rpc: process.env.BASE_RPC_URL     || "https://mainnet.base.org",     explorer: "https://basescan.org" },
};

const REGISTRY_ABI = [
  "function owner() external view returns (address)",
  "function authorizedCallers(address) external view returns (bool)",
  "function setAuthorizedCaller(address caller, bool authorized) external",
];

const execute = process.argv.includes("--execute");

/** Finds whichever configured key controls the registry, without revealing it. */
function findOwnerSigner(ownerAddress) {
  const candidates = [
    ["OWNER_PRIVATE_KEY", process.env.OWNER_PRIVATE_KEY],
    ["DEPLOYER_PRIVATE_KEY", process.env.DEPLOYER_PRIVATE_KEY],
    ["RELAYER_PRIVATE_KEY", process.env.RELAYER_PRIVATE_KEY],
    ["KEEPER_RELAYER_PRIVATE_KEY", process.env.KEEPER_RELAYER_PRIVATE_KEY],
  ];

  try {
    const fromFile = readFileSync("deployer.key", "utf8").trim();
    if (fromFile) candidates.push(["deployer.key", fromFile]);
  } catch { /* optional */ }

  for (const [label, key] of candidates) {
    if (!key) continue;
    try {
      const wallet = new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`);
      if (wallet.address.toLowerCase() === ownerAddress.toLowerCase()) {
        return { label, key };
      }
    } catch { /* not a valid key */ }
  }
  return null;
}

async function main() {
  const keeperKey = process.env.KEEPER_RELAYER_PRIVATE_KEY;
  if (!keeperKey) {
    console.error("KEEPER_RELAYER_PRIVATE_KEY is not set in .env — nothing to authorize.");
    process.exit(1);
  }

  const keeperAddress = new ethers.Wallet(keeperKey).address;
  console.log(`Keeper wallet to authorize: ${keeperAddress}`);
  console.log(execute ? "Mode: EXECUTE\n" : "Mode: dry run (pass --execute to send)\n");

  let needsAction = false;

  for (const [key, config] of Object.entries(NETWORKS)) {
    console.log(`--- ${config.name} ---`);
    try {
      const provider = new ethers.JsonRpcProvider(config.rpc);
      const registry = new ethers.Contract(PACT_REGISTRY_ADDRESS, REGISTRY_ABI, provider);

      const owner = await registry.owner();
      const already = await registry.authorizedCallers(keeperAddress);
      const keeperBalance = await provider.getBalance(keeperAddress);

      console.log(`  registry owner   : ${owner}`);
      console.log(`  keeper authorized: ${already}`);
      console.log(`  keeper balance   : ${ethers.formatEther(keeperBalance)} ETH`);

      if (keeperBalance === 0n) {
        console.log("  WARNING: keeper has no ETH — it cannot fund session keys for pulls.");
      }

      if (already) {
        console.log("  Nothing to do.\n");
        continue;
      }

      needsAction = true;

      const signer = findOwnerSigner(owner);
      if (!signer) {
        console.log(`  No configured key matches the owner ${owner}.`);
        console.log("  Set OWNER_PRIVATE_KEY in .env, or run setAuthorizedCaller from that wallet.\n");
        continue;
      }
      console.log(`  owner key source : ${signer.label}`);

      if (!execute) {
        console.log("  Would send: setAuthorizedCaller(keeper, true)\n");
        continue;
      }

      const wallet = new ethers.Wallet(signer.key.startsWith("0x") ? signer.key : `0x${signer.key}`, provider);
      const tx = await registry.connect(wallet).setAuthorizedCaller(keeperAddress, true);
      console.log(`  submitted: ${config.explorer}/tx/${tx.hash}`);

      const receipt = await tx.wait(1);
      if (receipt.status === 1) {
        const confirmed = await registry.authorizedCallers(keeperAddress);
        console.log(`  confirmed. authorized = ${confirmed}\n`);
      } else {
        console.log("  transaction reverted.\n");
      }
    } catch (err) {
      console.log(`  FAILED: ${err.message}\n`);
    }
  }

  if (!execute && needsAction) {
    console.log("Re-run with --execute to apply.");
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
