"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { DepositModal } from "@/components/DepositModal";
import { useAuth } from "@/contexts/AuthProvider";
import { getProvider, subscribeOnchain, SESSION_KEY_EXECUTOR_ADDRESS } from "@/lib/contracts";
import { checkDelegated, upgradeEOAWithEIP7702 } from "@/lib/eip7702";
import { generateSessionKey, saveSessionKeyDelegation, getSessionKeyDelegation, SessionKeyScope, getEIP712Domain, EIP712_TYPES } from "@/lib/sessionKey";
import { signData } from "@/lib/express-proxy";
import { ethers } from "ethers";

// ─── Step labels shown in the loading state ───────────────────────────────────
const STEPS = [
  "Connecting your account",
  "Checking your account",
  "Setting up your account (one time)",
  "Creating your payment permission",
  "Enabling automatic billing",
  "Confirming your subscription",
  "Done",
] as const;

type Step = typeof STEPS[number];

function PermissionContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, publicAddress } = useAuth();
  const searchParams = useSearchParams();

  // ── Plan data from URL params ─────────────────────────────────────────────
  const planId = searchParams.get("planId") || "";
  const network = (searchParams.get("network") || "arbitrum") as "arbitrum" | "base";
  const planName = searchParams.get("name") || "This Plan";
  const price = searchParams.get("price") || "—";
  const intervalDays = searchParams.get("intervalDays") || "30";
  const token = searchParams.get("token") || "ETH";
  const merchant = searchParams.get("merchant") || "—";
  const payoutAddress = searchParams.get("payoutAddress") || merchant;

  const [isChecked, setIsChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isGasError, setIsGasError] = useState(false);

  // Success state for completed subscription
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  useEffect(() => {
    if (planId) {
      const planIdNum = parseInt(planId);
      const delegation = getSessionKeyDelegation(planIdNum);
      if (delegation.delegation && delegation.delegation.scope.expiry > Date.now() / 1000) {
        setAlreadySubscribed(true);
      }
    }
  }, [planId]);

  const autoTriggerRef = useRef(false);

  const cancelHref = planId
    ? `/subscribe?planId=${planId}&network=${network}`
    : "/";

  // ── Confirm handler ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setError(null);
    setIsGasError(false);
    setConfirming(true);

    try {
      if (!isAuthenticated) {
        setCurrentStep("Connecting your account");
        await signIn("google", { callbackUrl: window.location.href });
        autoTriggerRef.current = true;
        return;
      }

      setCurrentStep("Connecting your account");
      if (!publicAddress) {
        throw new Error("Wallet address not yet available. Please wait a moment and try again.");
      }

      const networkKey = network;
      const chainId = networkKey === "arbitrum" ? 42161 : 8453;
      const provider = getProvider(networkKey);
      const explorerBase = networkKey === "arbitrum" ? "https://arbiscan.io" : "https://basescan.org";

      // ── Balance check: Ensure user has gas ──────────────────────────────
      const gasBalance = await provider.getBalance(publicAddress);
      if (gasBalance === BigInt(0)) {
        setIsGasError(true);
        setIsDepositOpen(true);
        throw new Error("You'll need a small amount of ETH on " + (networkKey === "arbitrum" ? "Arbitrum" : "Base") + " to confirm this subscription — under $1 covers it. Add funds below, then tap Confirm again.");
      }

      // ── EIP-7702 check ──────────────────────────────────────────────────
      setCurrentStep("Checking your account");
      const delegationStatus = await checkDelegated(publicAddress, networkKey);
      const executorAddress = SESSION_KEY_EXECUTOR_ADDRESS[networkKey];

      if (!executorAddress) {
        throw new Error(`SessionKeyExecutor not deployed on ${networkKey} yet. Contact support.`);
      }

      const alreadyUpgraded =
        delegationStatus.isDelegated &&
        delegationStatus.delegatee?.toLowerCase() === executorAddress.toLowerCase();

      if (!alreadyUpgraded) {
        setCurrentStep("Setting up your account (one time)");
        const upgradeTxHash = await upgradeEOAWithEIP7702(networkKey, publicAddress);

        const postUpgradeStatus = await checkDelegated(publicAddress, networkKey);
        if (
          !postUpgradeStatus.isDelegated ||
          postUpgradeStatus.delegatee?.toLowerCase() !== executorAddress.toLowerCase()
        ) {
          throw new Error(
            `EIP-7702 upgrade transaction confirmed but delegation not applied.`
          );
        }
      }

      // ── Generate session key & sign EIP-712 ─────────────────────────────
      setCurrentStep("Creating your payment permission");
      const sessionKeyWallet = generateSessionKey();
      const sessionKeyAddress = sessionKeyWallet.address.toLowerCase();

      const intervalSeconds = parseInt(intervalDays) * 86400;
      const expiry = Math.floor(Date.now() / 1000) + intervalSeconds * 12;

      let tokenAddress = ethers.ZeroAddress;
      let decimals = 18;
      if (token.toUpperCase() === "USDC") {
        tokenAddress = networkKey === "arbitrum"
          ? "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
          : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
        decimals = 6;
      } else if (token.toUpperCase() === "USDT") {
        tokenAddress = networkKey === "arbitrum"
          ? "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
          : "0x50c5725949a6f0c72e6c4a641f240e934e271057";
        decimals = 6;
      }

      const maxAmountWei = ethers.parseUnits(price, decimals);

      const scope: SessionKeyScope = {
        sessionKeyAddress,
        recipient: payoutAddress.toLowerCase(),
        maxAmount: maxAmountWei,
        token: tokenAddress.toLowerCase(),
        interval: intervalSeconds,
        expiry,
        planId: parseInt(planId),
      };

      const executorContract = new ethers.Contract(executorAddress, [
        "function nonces(address) external view returns (uint256)"
      ], provider);
      const currentNonce = await executorContract.nonces(publicAddress);

      const domain = getEIP712Domain(chainId, publicAddress);
      const types = { SessionKeyScope: EIP712_TYPES.SessionKeyScope };
      const value = {
        sessionKeyAddress: scope.sessionKeyAddress,
        recipient: scope.recipient,
        maxAmount: scope.maxAmount,
        token: scope.token,
        interval: scope.interval,
        expiry: scope.expiry,
        planId: scope.planId,
        nonce: currentNonce,
      };

      const hash = ethers.TypedDataEncoder.hash(domain, types, value);
      const authSig = await signData(hash, "ETH");
      const ownerSignature = ethers.Signature.from({ r: authSig.r, s: authSig.s, v: authSig.v }).serialized;

      saveSessionKeyDelegation(sessionKeyWallet.privateKey, scope, ownerSignature);

      // ── Persist delegation server-side for keeper execution ─────────────
      // This is required, not optional: without a stored delegation the keeper
      // has nothing to execute and the subscription silently never bills. Fail
      // here, before the on-chain subscribe, so no gas is spent on a
      // subscription that could never renew.
      setCurrentStep("Enabling automatic billing");
      try {
        const storeRes = await fetch("/api/keeper/store-delegation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privateKey: sessionKeyWallet.privateKey,
            ownerSignature,
            subscriberAddress: publicAddress,
            planId,
            network: networkKey,
            scope: {
              sessionKeyAddress: scope.sessionKeyAddress,
              recipient: scope.recipient,
              maxAmount: scope.maxAmount.toString(),
              token: scope.token,
              interval: scope.interval,
              expiry: scope.expiry,
              planId: scope.planId,
            },
          }),
        });

        const storeJson = await storeRes.json().catch(() => ({}));
        if (!storeRes.ok || !storeJson.success) {
          throw new Error(
            storeJson.error || `Keeper registration failed (HTTP ${storeRes.status}).`
          );
        }
        console.log("[Permission] Delegation stored server-side for keeper.");
      } catch (storeErr: unknown) {
        const detail = storeErr instanceof Error ? storeErr.message : String(storeErr);
        throw new Error(
          `We couldn't enable automatic billing for this subscription, so it would never renew on its own. Nothing was created and you weren't charged — please try again. (${detail})`
        );
      }

      // ── Record subscription on-chain ────────────────────────────────────
      setCurrentStep("Confirming your subscription");
      const subscribeTxHash = await subscribeOnchain(networkKey, parseInt(planId), sessionKeyAddress);
      console.log(`[Permission] Subscribe tx: ${explorerBase}/tx/${subscribeTxHash}`);

      setCurrentStep("Done");
      setSuccessTxHash(subscribeTxHash);
    } catch (err: unknown) {
      console.error("[Permission] Confirm failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("insufficient funds") || msg.toLowerCase().includes("has 0 want")) {
        setIsGasError(true);
        setIsDepositOpen(true);
        setError(`You'll need a small amount of ETH on ${network === "arbitrum" ? "Arbitrum" : "Base"} to confirm this — under $1 covers it. Add funds below, then tap Confirm again.`);
      } else {
        setError(msg);
      }
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && publicAddress && !authLoading && isChecked && !confirming && !error && !successTxHash) {
      const didReturn = typeof window !== "undefined" &&
        document.referrer.includes("accounts.google.com");
      if (didReturn) {
        handleConfirm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, publicAddress, authLoading]);

  const stepIndex = currentStep ? STEPS.indexOf(currentStep) : -1;
  const explorerBase = network === "arbitrum" ? "https://arbiscan.io" : "https://basescan.org";

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="app-ground"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-14 pb-28 relative z-10">
        <div className="w-full max-w-[720px] mx-auto px-10 space-y-6">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="ui-pill ui-pill-good mb-5">
              <div className="w-2 h-2 bg-[#9EFFBF] rounded-full"></div>
              <span className="font-sans text-sm text-[#66756B]">
                One approval, then it runs itself
              </span>
            </div>
            <h1 className="font-space text-[44px] font-bold tracking-tight leading-[1.1] text-forest mb-3">
              Approve this subscription
            </h1>
            <p className="font-sans text-[17px] text-[#46564E]">
              Here&apos;s exactly what you&apos;re approving. Take a second to check it over.
            </p>
          </div>

          {/* Terms Container */}
          <div className="ui-card p-10">

            <div className="flex gap-8 items-start">
              <div className="w-1 self-stretch bg-mint rounded-full hidden md:block"></div>
              <div className="flex-1">
                <p className="font-space text-2xl font-medium leading-relaxed tracking-tight text-[#1A3C2B]">
                  <span className="font-bold">{planName}</span> can charge up to{" "}
                  <span className="font-bold">{price} {token}</span> every{" "}
                  <span className="font-bold">{intervalDays} days</span>.
                </p>
                <p className="font-sans text-[17px] text-[#66756B] mt-2">
                  Nothing else. Cancel any time.
                </p>
              </div>
            </div>

            {/* Technical Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 pt-8 border-t border-[#3A3A38]/10">
              <div className="bg-[#F7F7F5] rounded-xl p-4">
                <span className="font-sans text-sm text-[#66756B]">
                  Plan ID
                </span>
                <span className="font-sans text-[15px] font-semibold text-forest truncate block mt-0.5">
                  #{planId} · {network === "arbitrum" ? "Arbitrum" : "Base"}
                </span>
              </div>
              <div className="bg-[#F7F7F5] rounded-xl p-4">
                <span className="font-sans text-sm text-[#66756B]">
                  Merchant
                </span>
                <span className="font-mono text-[13px] text-forest block truncate mt-0.5">
                  {merchant}
                </span>
              </div>
              <div className="bg-[#F7F7F5] rounded-xl p-4">
                <span className="font-sans text-sm text-[#66756B]">
                  Cancelling
                </span>
                <span className="font-sans text-[15px] font-semibold text-forest block mt-0.5">
                  Instant, Free
                </span>
              </div>
            </div>
          </div>

          {/* Already Subscribed Notice */}
          {alreadySubscribed && (
            <div className="ui-card p-6 border-l-4 border-mint text-forest space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-forest rounded-full"></div>
                <p className="font-space text-lg font-bold">
                  Active Subscription Already Exists
                </p>
              </div>
              <p className="font-sans text-[15px] text-[#46564E] leading-relaxed">
                You already have an active subscription for <strong className="font-bold">{planName}</strong>. You can view or manage your active subscription session below.
              </p>
              <div className="pt-1 flex gap-3">
                <Link
                  href={`/subscription/${planId}?network=${network}`}
                  className="ui-btn ui-btn-primary"
                >
                  View Active Subscription
                </Link>
              </div>
            </div>
          )}

          {/* Error display with Deposit prompt */}
          {error && (
            <div className="ui-card p-6 border-l-4 border-coral space-y-4">
              <div>
                <p className="font-space text-lg font-bold text-forest mb-1">
                  {isGasError ? "You need a little ETH first" : "Something went wrong"}
                </p>
                <p className="font-sans text-[15px] text-[#46564E]">{error}</p>
              </div>

              {isGasError && publicAddress && (
                <div className="pt-2 border-t border-coral/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <span className="font-mono text-[13px] text-[#66756B]">
                    Wallet: {publicAddress.slice(0, 6)}...{publicAddress.slice(-4)}
                  </span>
                  <button
                    onClick={() => setIsDepositOpen(true)}
                    className="ui-btn ui-btn-primary"
                  >
                    Add funds
                  </button>
                </div>
              )}

              <button
                onClick={() => setError(null)}
                className="font-sans text-sm text-[#66756B]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Checkbox */}
          <div className="ui-card p-6 flex items-start gap-4">
            <input
              type="checkbox"
              id="confirm-terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#1A3C2B] cursor-pointer flex-shrink-0"
            />
            <label htmlFor="confirm-terms" className="font-sans text-[17px] font-semibold text-forest cursor-pointer select-none">
              I understand and agree to this authorization
              <span className="block font-sans text-[15px] font-normal text-[#46564E] mt-1 leading-relaxed">
                I&apos;ve reviewed the amount and schedule above, and I know I can cancel anytime from my dashboard.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={!isChecked || confirming}
              className={`ui-btn ui-btn-primary w-full`}
            >
              {confirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{currentStep || "Processing..."}</span>
                </>
              ) : (
                alreadySubscribed ? "Update Approval" : "Approve & Subscribe"
              )}
            </button>

            <Link
              href={cancelHref}
              className="ui-btn ui-btn-ghost w-full"
            >
              Not now
            </Link>
          </div>
        </div>
      </main>

      {/* Deposit Modal */}
      {publicAddress && (
        <DepositModal
          isOpen={isDepositOpen}
          onClose={() => setIsDepositOpen(false)}
          address={publicAddress}
        />
      )}

      {/* Success Modal with Redirect to Subscribed Plan */}
      {successTxHash && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="ui-card w-full max-w-lg p-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#9EFFBF] text-forest rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="font-space text-3xl font-bold text-forest tracking-tight">
                You're subscribed
              </h3>
              <p className="font-sans text-[17px] text-[#46564E]">Your approval is recorded on-chain. Payments run on schedule from here.
              </p>
            </div>

            <div className="bg-[#F7F7F5] rounded-xl p-6 space-y-3 font-sans text-[15px]">
              <div className="flex justify-between border-b border-[#3A3A38]/10 pb-2">
                <span className="text-[#66756B]">Plan</span>
                <span className="font-semibold text-forest">{planName}</span>
              </div>
              <div className="flex justify-between border-b border-[#3A3A38]/10 pb-2">
                <span className="text-[#66756B]">Rate</span>
                <span className="font-semibold text-forest">{price} {token} / {intervalDays} days</span>
              </div>
              <div className="flex justify-between border-b border-[#3A3A38]/10 pb-2">
                <span className="text-[#66756B]">Network</span>
                <span className="font-semibold text-forest">{network === "arbitrum" ? "Arbitrum" : "Base"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66756B]">Transaction</span>
                <a
                  href={`${explorerBase}/tx/${successTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest underline underline-offset-2 font-semibold hover:text-coral transition-colors"
                >
                  {successTxHash.slice(0, 8)}...{successTxHash.slice(-6)} ↗
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/subscription/${planId}?network=${network}`}
                className="flex-1 ui-btn ui-btn-primary"
              >
                View subscription
              </Link>
              <Link
                href="/wallet"
                className="flex-1 ui-btn ui-btn-ghost"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PermissionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center text-forest font-sans text-[17px]">
        Loading permission parameters...
      </div>
    }>
      <PermissionContent />
    </Suspense>
  );
}
