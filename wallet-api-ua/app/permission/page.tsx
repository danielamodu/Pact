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
import { generateSessionKey, saveSessionKeyDelegation, SessionKeyScope, getEIP712Domain, EIP712_TYPES } from "@/lib/sessionKey";
import { signData } from "@/lib/express-proxy";
import { ethers } from "ethers";

// ─── Step labels shown in the loading state ───────────────────────────────────
const STEPS = [
  "Connecting wallet",
  "Checking account status",
  "Upgrading account (EIP-7702)",
  "Signing session key",
  "Recording subscription",
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
        setCurrentStep("Connecting wallet");
        await signIn("google", { callbackUrl: window.location.href });
        autoTriggerRef.current = true;
        return;
      }

      setCurrentStep("Connecting wallet");
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
        throw new Error("Your Universal Account needs a small gas balance (~0.0001 ETH) on " + (networkKey === "arbitrum" ? "Arbitrum" : "Base") + " to authorize this subscription.");
      }

      // ── EIP-7702 check ──────────────────────────────────────────────────
      setCurrentStep("Checking account status");
      const delegationStatus = await checkDelegated(publicAddress, networkKey);
      const executorAddress = SESSION_KEY_EXECUTOR_ADDRESS[networkKey];

      if (!executorAddress) {
        throw new Error(`SessionKeyExecutor not deployed on ${networkKey} yet. Contact support.`);
      }

      const alreadyUpgraded =
        delegationStatus.isDelegated &&
        delegationStatus.delegatee?.toLowerCase() === executorAddress.toLowerCase();

      if (!alreadyUpgraded) {
        setCurrentStep("Upgrading account (EIP-7702)");
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
      setCurrentStep("Signing session key");
      const sessionKeyWallet = generateSessionKey();
      const sessionKeyAddress = sessionKeyWallet.address.toLowerCase();

      const intervalSeconds = parseInt(intervalDays) * 86400;
      const expiry = Math.floor(Date.now() / 1000) + intervalSeconds * 12;

      let tokenAddress = ethers.ZeroAddress;
      let decimals = 18;
      if (token.toUpperCase() === "USDC") {
        tokenAddress = networkKey === "arbitrum"
          ? "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
          : "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913";
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

      // ── Record subscription on-chain ────────────────────────────────────
      setCurrentStep("Recording subscription");
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
        setError(`Universal Account balance is 0 ETH on ${network === "arbitrum" ? "Arbitrum" : "Base"}. Please deposit ETH to complete transaction.`);
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
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 flex items-center justify-center pt-28 pb-12">
        <div className="w-full max-w-[680px] px-6 py-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 border border-[#1A3C2B]/20 px-3 py-1 mb-6 bg-white/50">
              <div className="w-2 h-2 bg-[#9EFFBF] rounded-full"></div>
              <span className="font-mono text-[10px] tracking-widest uppercase">
                Authorization Required
              </span>
            </div>
            <h1 className="font-space text-5xl font-bold tracking-tighter leading-[0.9] text-[#1A3C2B] mb-4 uppercase">
              Confirm Payment Permission
            </h1>
            <p className="font-sans text-[#3A3A38]/60 text-base">
              Review the terms you&apos;re agreeing to before initializing the session.
            </p>
          </div>

          {/* Terms Container */}
          <div className="relative bg-[#F7F7F5] border border-[#3A3A38]/20 p-12 mb-8">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="flex gap-8 items-start">
              <div className="w-[1px] h-32 bg-[#1A3C2B] hidden md:block"></div>
              <div className="flex-1">
                <p className="font-space text-2xl font-medium leading-relaxed tracking-tight text-[#1A3C2B]">
                  <span className="font-bold">{planName}</span> can pull up to{" "}
                  <span className="font-bold">{price} {token}</span> every{" "}
                  <span className="font-bold">{intervalDays} days</span>.
                </p>
                <p className="font-space text-2xl font-medium leading-relaxed tracking-tight text-[#1A3C2B] opacity-40 mt-1">
                  Nothing else. Revoke anytime.
                </p>
              </div>
            </div>

            {/* Technical Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#3A3A38]/10 mt-12 border border-[#3A3A38]/10">
              <div className="bg-[#F7F7F5] p-5">
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                  Plan ID
                </span>
                <span className="font-mono text-[10px] text-[#1A3C2B] font-bold truncate block">
                  #{planId} · {network === "arbitrum" ? "Arbitrum" : "Base"}
                </span>
              </div>
              <div className="bg-[#F7F7F5] p-5">
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                  Merchant
                </span>
                <span className="font-mono text-[10px] text-[#1A3C2B] font-bold block truncate">
                  {merchant}
                </span>
              </div>
              <div className="bg-[#F7F7F5] p-5">
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                  Revocation
                </span>
                <span className="font-mono text-[10px] text-[#1A3C2B] font-bold block">
                  Instant, Fee-Free
                </span>
              </div>
            </div>
          </div>

          {/* Already Subscribed Notice */}
          {alreadySubscribed && (
            <div className="mb-6 p-6 bg-[#9EFFBF]/20 border border-forest/20 text-forest space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-forest rounded-full"></div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider">
                  Active Subscription Already Exists
                </p>
              </div>
              <p className="font-sans text-xs opacity-80 leading-relaxed">
                You already have an active subscription for <strong className="font-bold">{planName}</strong>. You can view or manage your active subscription session below.
              </p>
              <div className="pt-1 flex gap-3">
                <Link
                  href={`/subscription/${planId}?network=${network}`}
                  className="bg-forest text-white font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
                >
                  View Active Subscription
                </Link>
              </div>
            </div>
          )}

          {/* Error display with Deposit prompt */}
          {error && (
            <div className="mb-6 p-6 border border-coral bg-coral/5 space-y-4">
              <div>
                <p className="font-mono text-xs text-forest font-bold uppercase tracking-wide mb-1">
                  {isGasError ? "FUNDING REQUIRED" : "Authorization Error"}
                </p>
                <p className="font-mono text-xs text-[#3A3A38]">{error}</p>
              </div>

              {isGasError && publicAddress && (
                <div className="pt-2 border-t border-coral/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <span className="font-mono text-[10px] uppercase opacity-70">
                    Wallet: {publicAddress.slice(0, 6)}...{publicAddress.slice(-4)}
                  </span>
                  <button
                    onClick={() => setIsDepositOpen(true)}
                    className="bg-forest text-white px-5 py-2 font-mono text-xs font-bold uppercase hover:bg-forest/90 transition-colors cursor-pointer w-full sm:w-auto"
                  >
                    Deposit Gas Funds
                  </button>
                </div>
              )}

              <button
                onClick={() => setError(null)}
                className="font-mono text-[10px] uppercase tracking-widest text-coral/70 hover:text-coral underline block"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Checkbox */}
          <div className="flex items-start gap-3 mb-8">
            <input
              type="checkbox"
              id="confirm-terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#1A3C2B] cursor-pointer"
            />
            <label htmlFor="confirm-terms" className="font-mono text-xs uppercase tracking-tight text-[#1A3C2B] cursor-pointer select-none">
              I understand and agree to this authorization
              <span className="block text-[10px] text-[#3A3A38]/50 normal-case mt-0.5">
                I confirm I have reviewed the session parameters and know that I can revoke access directly from the Pact dashboard at any time.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={!isChecked || confirming}
              className={`w-full font-mono text-xs tracking-[0.2em] uppercase py-5 transition-all flex items-center justify-center gap-2 ${
                isChecked && !confirming
                  ? "bg-[#1A3C2B] text-white hover:opacity-95 cursor-pointer shadow-md"
                  : "bg-[#3A3A38]/20 text-[#3A3A38]/40 cursor-not-allowed"
              }`}
            >
              {confirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{currentStep || "Processing..."}</span>
                </>
              ) : (
                alreadySubscribed ? "Update Session Permission" : "Confirm Authorization"
              )}
            </button>

            <Link
              href={cancelHref}
              className="block w-full text-center border border-[#3A3A38]/20 text-[#1A3C2B] font-mono text-xs tracking-[0.2em] uppercase py-5 hover:bg-white transition-all"
            >
              Cancel &amp; Exit
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
          <div className="relative w-full max-w-lg bg-white border border-forest p-10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#9EFFBF] text-forest rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="font-space text-3xl font-bold text-forest uppercase tracking-tight">
                Subscription Authorized!
              </h3>
              <p className="font-sans text-sm text-[#3A3A38]/70">
                Your session permission has been recorded on-chain via EIP-7702.
              </p>
            </div>

            <div className="bg-[#F7F7F5] border border-forest/10 p-6 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-[#3A3A38]/10 pb-2">
                <span className="opacity-50">Plan</span>
                <span className="font-bold text-forest">{planName}</span>
              </div>
              <div className="flex justify-between border-b border-[#3A3A38]/10 pb-2">
                <span className="opacity-50">Rate</span>
                <span className="font-bold">{price} {token} / {intervalDays} Days</span>
              </div>
              <div className="flex justify-between border-b border-[#3A3A38]/10 pb-2">
                <span className="opacity-50">Network</span>
                <span className="font-bold uppercase">{network}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Transaction</span>
                <a
                  href={`${explorerBase}/tx/${successTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest underline font-bold"
                >
                  {successTxHash.slice(0, 8)}...{successTxHash.slice(-6)} ↗
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/subscription/${planId}?network=${network}`}
                className="flex-1 bg-forest text-white font-space text-xs font-bold uppercase py-3.5 px-4 text-center hover:bg-forest/90 transition-colors tracking-normal flex items-center justify-center"
              >
                View Plan Details
              </Link>
              <Link
                href="/wallet"
                className="flex-1 border border-forest/20 text-forest font-space text-xs font-bold uppercase py-3.5 px-4 text-center hover:bg-forest/5 transition-colors tracking-normal flex items-center justify-center"
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
      <div className="min-h-screen bg-paper flex items-center justify-center text-forest font-mono text-sm">
        Loading permission parameters...
      </div>
    }>
      <PermissionContent />
    </Suspense>
  );
}
