"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { NavigationBar } from "@/components/NavigationBar";
import { useAuth } from "@/contexts/AuthProvider";
import { getProvider, subscribeOnchain, SESSION_KEY_EXECUTOR_ADDRESS } from "@/lib/contracts";
import { checkDelegated, upgradeEOAWithEIP7702 } from "@/lib/eip7702";
import { generateSessionKey, formatScopeStatement, saveSessionKeyDelegation, SessionKeyScope } from "@/lib/sessionKey";
import { ethereumService } from "@/lib/ethereum";
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

  // After OAuth redirect back to this page, auto-trigger the flow if checkbox was checked
  const autoTriggerRef = useRef(false);

  const cancelHref = planId
    ? `/subscribe?planId=${planId}&network=${network}`
    : "/";

  // ── Confirm handler ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setError(null);
    setConfirming(true);

    try {
      // ── 1. Auth: trigger Google OAuth if not logged in ──────────────────
      if (!isAuthenticated) {
        setCurrentStep("Connecting wallet");
        // callbackUrl returns the user to this exact page (with all params) after login
        await signIn("google", { callbackUrl: window.location.href });
        // signIn triggers a full page redirect — execution stops here for new users.
        // The useEffect below picks up the flow once they return authenticated.
        autoTriggerRef.current = true;
        return;
      }

      // ── 2. Wait for publicAddress (TEE wallet) to resolve ───────────────
      setCurrentStep("Connecting wallet");
      if (!publicAddress) {
        // AuthProvider fetches it async after authentication — retry after short delay
        throw new Error("Wallet address not yet available. Please wait a moment and try again.");
      }

      const networkKey = network;
      const chainId = networkKey === "arbitrum" ? 42161 : 8453;
      const provider = getProvider(networkKey);
      const explorerBase = networkKey === "arbitrum" ? "https://arbiscan.io" : "https://basescan.org";

      // ── 3. Check if EOA already upgraded via EIP-7702 ───────────────────
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
        // ── 4. EIP-7702 upgrade ─────────────────────────────────────────
        setCurrentStep("Upgrading account (EIP-7702)");
        const upgradeTxHash = await upgradeEOAWithEIP7702(networkKey, publicAddress);
        console.log(`[Permission] EIP-7702 upgrade tx: ${explorerBase}/tx/${upgradeTxHash}`);

        // Verify delegation was applied
        const postUpgradeStatus = await checkDelegated(publicAddress, networkKey);
        if (
          !postUpgradeStatus.isDelegated ||
          postUpgradeStatus.delegatee?.toLowerCase() !== executorAddress.toLowerCase()
        ) {
          throw new Error(
            `EIP-7702 upgrade transaction confirmed but delegation not applied. ` +
            `Check Arbiscan Authorizations tab for tx ${upgradeTxHash}.`
          );
        }
        console.log("[Permission] EIP-7702 delegation verified ✅");
      } else {
        console.log("[Permission] Account already delegated to SessionKeyExecutor, skipping upgrade.");
      }

      // ── 5. Generate session key and sign scope statement ────────────────
      setCurrentStep("Signing session key");
      const sessionKeyWallet = generateSessionKey();
      const sessionKeyAddress = sessionKeyWallet.address.toLowerCase();

      const intervalSeconds = parseInt(intervalDays) * 86400;
      const expiry = Math.floor(Date.now() / 1000) + intervalSeconds * 12; // 12 billing cycles
      const expiryISO = new Date(expiry * 1000).toISOString();

      // Parse price to wei (maxAmount). Token is ETH so use parseEther.
      // maxAmountStr must match how the contract's formatScopeStatement reconstructs it.
      const maxAmountStr = price; // e.g. "0.01"
      const maxAmountWei = ethers.parseEther(maxAmountStr);

      const scope: SessionKeyScope = {
        sessionKeyAddress,
        recipient: payoutAddress.toLowerCase(),
        maxAmount: maxAmountWei,
        interval: intervalSeconds,
        expiry,
        planId: parseInt(planId),
        maxAmountStr,
        expiryISO,
      };

      const statement = formatScopeStatement(scope);
      console.log("[Permission] Scope statement:\n", statement);

      // Sign via TEE wallet (personalSign = eth_sign with Ethereum prefix)
      const ownerSignature = await ethereumService.personalSign(statement);
      console.log("[Permission] Owner signature:", ownerSignature);

      // Save delegation to localStorage
      saveSessionKeyDelegation(sessionKeyWallet.privateKey, scope, ownerSignature);

      // ── 6. Record subscription on PactRegistry ──────────────────────────
      setCurrentStep("Recording subscription");
      const subscribeTxHash = await subscribeOnchain(networkKey, parseInt(planId), sessionKeyAddress);
      console.log(`[Permission] Subscribe tx: ${explorerBase}/tx/${subscribeTxHash}`);

      // ── 7. Navigate to balance ──────────────────────────────────────────
      setCurrentStep("Done");
      router.push("/balance");

    } catch (err: unknown) {
      console.error("[Permission] Confirm failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setConfirming(false);
      setCurrentStep(null);
    }
  };

  // After OAuth redirect back — auto-trigger if user is now authenticated
  useEffect(() => {
    if (isAuthenticated && publicAddress && !authLoading && isChecked && !confirming && !error) {
      // Only auto-trigger once on the first authenticated mount after OAuth
      const didReturn = typeof window !== "undefined" &&
        document.referrer.includes("accounts.google.com");
      if (didReturn) {
        handleConfirm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, publicAddress, authLoading]);

  const stepIndex = currentStep ? STEPS.indexOf(currentStep) : -1;

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 flex items-center justify-center pt-24 pb-12">
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

          {/* Error display */}
          {error && (
            <div className="mb-6 p-5 border border-coral bg-coral/5">
              <p className="font-mono text-[11px] text-forest font-bold uppercase tracking-wide mb-1">
                Authorization Failed
              </p>
              <p className="font-mono text-[11px] text-[#3A3A38] break-all">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 font-mono text-[10px] uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Signing progress */}
          {confirming && currentStep && (
            <div className="mb-6 p-5 border border-[#1A3C2B]/20 bg-[#F7F7F5]">
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-3">
                Authorizing...
              </p>
              <div className="space-y-2">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      i < stepIndex
                        ? "bg-[#9EFFBF]"
                        : i === stepIndex
                          ? "bg-[#1A3C2B] animate-pulse"
                          : "bg-[#3A3A38]/20"
                    }`} />
                    <span className={`font-mono text-[11px] ${
                      i === stepIndex ? "text-[#1A3C2B] font-bold" : "opacity-40"
                    }`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consent Section */}
          {!confirming && (
            <div className="space-y-6 mb-10 px-2">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="consent-check"
                  className="custom-checkbox mt-1"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                />
                <label htmlFor="consent-check" className="cursor-pointer">
                  <span className="block font-mono text-[12px] uppercase tracking-widest text-[#1A3C2B] mb-1">
                    I understand and agree to this authorization
                  </span>
                  <span className="block font-sans text-sm text-[#3A3A38]/60">
                    I confirm I have reviewed the session parameters and know that I can revoke access directly from the Pact dashboard at any time.
                  </span>
                </label>
              </div>
              <p className="font-mono text-[10px] text-[#3A3A38]/40 uppercase tracking-tight">
                Notice: You will not be charged until the first billing cycle begins. Gas costs for the account upgrade are covered by Pact. You'll only pay when your subscription actually bills.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              id="cta-confirm-permission"
              onClick={handleConfirm}
              disabled={!isChecked || confirming}
              className={`w-full text-center font-mono text-xs tracking-[0.2em] uppercase py-5 rounded-sm transition-all ${
                isChecked && !confirming
                  ? "bg-[#1A3C2B] text-white hover:opacity-95 cursor-pointer"
                  : "bg-forest/20 text-forest/40 cursor-not-allowed"
              }`}
            >
              {confirming
                ? currentStep === "Done"
                  ? "Redirecting..."
                  : "Authorizing..."
                : isAuthenticated
                  ? "Confirm Authorization"
                  : "Sign in & Authorize"}
            </button>

            {!confirming && (
              <a
                href={cancelHref}
                id="cta-cancel-permission"
                className="w-full border border-[#3A3A38]/20 text-[#1A3C2B] font-mono text-xs tracking-[0.2em] uppercase py-5 rounded-sm text-center hover:bg-white transition-all"
              >
                Cancel &amp; Exit
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PermissionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-mono text-sm opacity-60">Loading...</div>}>
      <PermissionContent />
    </Suspense>
  );
}
