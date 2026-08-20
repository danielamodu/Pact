"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { NavigationBar } from "@/components/NavigationBar";

import { createPlanOnchain, NETWORKS } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

export default function SetupPage() {
  const { publicAddress } = useAuth();
  const router = useRouter();
  
  const [planName, setPlanName] = useState("Professional Plan");
  const [token, setToken] = useState("USDC");
  const [price, setPrice] = useState("49.99");
  const [cycle, setCycle] = useState("Monthly");
  const [customDays, setCustomDays] = useState("14");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [network, setNetwork] = useState<"arbitrum" | "base">("arbitrum");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  useEffect(() => {
    if (publicAddress) {
      setPayoutAddress(publicAddress);
    }
  }, [publicAddress]);

  useEffect(() => {
    async function fetchEthPrice() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        if (res.ok) {
          const data = await res.json();
          if (data.ethereum?.usd) setEthPrice(data.ethereum.usd);
        }
      } catch (err) {
        console.warn("Failed to fetch ETH price:", err);
      }
    }
    fetchEthPrice();
  }, []);

  const priceNum = parseFloat(price);
  const priceInUsd =
    token === "ETH" && ethPrice && !isNaN(priceNum) && priceNum > 0
      ? (priceNum * ethPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessTxHash(null);

    try {
      if (!planName || !planName.trim()) {
        throw new Error("Please enter a plan name.");
      }
      const numPrice = parseFloat(price);
      if (!price || isNaN(numPrice) || numPrice <= 0) {
        throw new Error("Please enter a valid plan price greater than 0.");
      }

      // 1. Fallback payout address to current wallet address if blank or invalid
      const effectivePayout =
        payoutAddress && ethers.isAddress(payoutAddress)
          ? payoutAddress
          : publicAddress && ethers.isAddress(publicAddress)
          ? publicAddress
          : "0x0000000000000000000000000000000000000000";

      // 2. Calculate price in correct decimals (ETH uses 18, USDC/USDT use 6)
      const decimals = token === "ETH" ? 18 : 6;
      const priceInUnits = ethers.parseUnits(price, decimals).toString();

      // 3. Map billing cycle to seconds
      let intervalSeconds = 2592000; // default 30 days
      if (cycle === "Weekly") {
        intervalSeconds = 604800;
      } else if (cycle === "Quarterly") {
        intervalSeconds = 7776000;
      } else if (cycle === "Custom") {
        const days = parseInt(customDays, 10);
        if (!Number.isFinite(days) || days < 1 || days > 365) {
          throw new Error("Custom billing cycle must be between 1 and 365 days.");
        }
        intervalSeconds = days * 86400;
      }

      // 4. Select standard token address for selected network
      let tokenAddress = NETWORKS[network].usdcAddress; // default USDC
      if (token === "USDT") {
        tokenAddress =
          network === "arbitrum"
            ? "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
            : "0x50c5725949A6F0c72E6C4a641F240E934e271057";
      } else if (token === "ETH") {
        tokenAddress = "0x0000000000000000000000000000000000000000";
      }

      // 5. Submit transaction to registry contract via TEE Universal Account
      const { txHash, planId } = await createPlanOnchain(
        network,
        planName,
        tokenAddress,
        priceInUnits,
        intervalSeconds,
        effectivePayout
      );

      setSuccessTxHash(txHash);
      setCreatedPlanId(planId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to launch plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="plans" />

      {successTxHash && (
        <div className="fixed inset-0 bg-[#3A3A38]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="relative bg-paper border border-[#3A3A38]/30 max-w-lg w-full p-10 flex flex-col items-center text-center">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="w-16 h-16 bg-mint/10 border border-mint flex items-center justify-center text-forest rounded-full mb-6">
              <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-2 fill-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-forest mb-2">
              Plan Successfully Launched
            </h2>
            <p className="font-sans text-[#3A3A38]/70 text-sm mb-6">
              Your subscription plan contract is live on-chain and ready to accept subscriber flows.
            </p>

            {createdPlanId && (
              <div className="w-full bg-[#9EFFBF]/15 border border-forest/20 p-4 text-left mb-4">
                <span className="block opacity-40 uppercase tracking-widest text-[9px] mb-1 font-mono">Plan ID</span>
                <span className="font-space text-3xl font-bold text-forest leading-none">#{createdPlanId}</span>
                <p className="font-mono text-[9px] opacity-50 mt-2 uppercase tracking-tight">
                  Share the link below to start accepting subscribers
                </p>
              </div>
            )}

            {createdPlanId && (
              <div className="w-full bg-[#F7F7F5] border border-[#3A3A38]/10 p-4 text-left mb-4">
                <span className="block opacity-40 uppercase tracking-widest text-[9px] mb-2 font-mono">Subscribe Link</span>
                <code className="font-mono text-[10px] text-forest break-all block mb-3">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/subscribe?planId=${createdPlanId}&network=${network}`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/subscribe?planId=${createdPlanId}&network=${network}`
                    );
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="w-full bg-white border border-forest/20 text-forest font-mono text-[9px] font-bold uppercase tracking-widest py-2.5 hover:bg-forest hover:text-white transition-colors cursor-pointer"
                >
                  {linkCopied ? "Copied!" : "Copy Subscribe Link"}
                </button>
              </div>
            )}

            <div className="w-full bg-[#F7F7F5] border border-[#3A3A38]/10 p-4 font-mono text-[11px] break-all text-left mb-8">
              <span className="block opacity-40 uppercase tracking-widest text-[9px] mb-1">Transaction Hash</span>
              <a
                href={network === "arbitrum" ? `https://arbiscan.io/tx/${successTxHash}` : `https://basescan.org/tx/${successTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral hover:underline font-bold"
              >
                {successTxHash}
              </a>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-3">
              {createdPlanId && (
                <button
                  onClick={() => router.push(`/plan/${createdPlanId}?network=${network}`)}
                  className="flex-1 bg-forest text-white font-mono text-xs font-bold uppercase tracking-widest py-4 rounded-sm hover:opacity-90 transition-opacity cursor-pointer"
                >
                  View Plan Dashboard
                </button>
              )}
              <button
                onClick={() => router.push("/wallet")}
                className={`flex-1 font-mono text-xs font-bold uppercase tracking-widest py-4 rounded-sm transition-opacity cursor-pointer ${
                  createdPlanId
                    ? "border border-forest/20 text-forest hover:bg-forest/5"
                    : "bg-forest text-white hover:opacity-90"
                }`}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-24 pb-12 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="font-space text-[48px] font-bold tracking-tight text-[#1A3C2B] leading-[0.9] mb-4">
              Create a Subscription Plan
            </h1>
            <p className="font-sans text-base text-[#3A3A38]/60">
              Define your plan terms and start accepting recurring payments
            </p>
          </div>

          {/* Form Container */}
          <div className="max-w-[720px] mx-auto">
            <div className="relative bg-[#F7F7F5] border border-[#3A3A38]/20 p-10">
              {/* Corner Markers */}
              <div className="corner-marker corner-tl"></div>
              <div className="corner-marker corner-tr"></div>
              <div className="corner-marker corner-bl"></div>
              <div className="corner-marker corner-br"></div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* 01. Plan Name */}
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-widest uppercase text-[#1A3C2B] font-bold">
                    01. Plan Name
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Professional Plan"
                    className="w-full bg-white border border-[#3A3A38]/20 p-4 font-mono text-sm placeholder:text-[#3A3A38]/30 rounded-sm"
                  />
                  <p className="font-mono text-[9px] opacity-50 tracking-tight mt-1">
                    This name will be displayed to subscribers
                  </p>
                </div>

                {/* 02. Payment Token */}
                <div className="space-y-4">
                  <label className="font-mono text-[10px] tracking-widest uppercase text-[#1A3C2B] font-bold">
                    02. Payment Token
                  </label>
                  <div className="flex gap-3">
                    {["USDC", "USDT", "ETH"].map((tok) => (
                      <div key={tok} className="flex-1">
                        <input
                          type="radio"
                          name="token"
                          id={`token-${tok.toLowerCase()}`}
                          className="hidden custom-radio"
                          checked={token === tok}
                          onChange={() => setToken(tok)}
                        />
                        <label
                          htmlFor={`token-${tok.toLowerCase()}`}
                          className={`flex flex-col items-center justify-center p-4 border cursor-pointer hover:bg-[#1A3C2B]/5 transition-colors font-space font-bold uppercase text-sm ${
                            token === tok ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/20"
                          }`}
                        >
                          {tok}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 03. Subscription Price */}
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-widest uppercase text-[#1A3C2B] font-bold">
                    03. Subscription Price
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="49.99"
                      className="flex-1 bg-white border border-[#3A3A38]/20 p-4 font-mono text-sm placeholder:text-[#3A3A38]/30 rounded-sm"
                    />
                    <div className="bg-[#1A3C2B]/5 border border-[#3A3A38]/20 border-l-0 px-6 flex items-center">
                      <span className="font-mono text-[10px] font-bold tracking-widest">
                        {token}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-[9px] opacity-50 tracking-tight mt-1">
                    {priceInUsd ? `≈ $${priceInUsd} USD per billing cycle` : "Price per billing cycle"}
                  </p>
                </div>

                {/* 04. Billing Cycle */}
                <div className="space-y-4">
                  <label className="font-mono text-[10px] tracking-widest uppercase text-[#1A3C2B] font-bold">
                    04. Billing Cycle
                  </label>
                  <div className="flex gap-3">
                    {["Weekly", "Monthly", "Quarterly"].map((cyc) => (
                      <div key={cyc} className="flex-1">
                        <input
                          type="radio"
                          name="cycle"
                          id={`cycle-${cyc.toLowerCase()}`}
                          className="hidden custom-radio"
                          checked={cycle === cyc}
                          onChange={() => setCycle(cyc)}
                        />
                        <label
                          htmlFor={`cycle-${cyc.toLowerCase()}`}
                          className={`flex items-center justify-center p-3 border cursor-pointer font-mono text-[10px] uppercase tracking-widest font-bold ${
                            cycle === cyc ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/20"
                          }`}
                        >
                          {cyc}
                        </label>
                      </div>
                    ))}
                    <div className="flex-1">
                      <input
                        type="radio"
                        name="cycle"
                        id="cycle-custom"
                        className="hidden custom-radio"
                        checked={cycle === "Custom"}
                        onChange={() => setCycle("Custom")}
                      />
                      <label
                        htmlFor="cycle-custom"
                        className={`flex items-center justify-center p-3 border cursor-pointer font-mono text-[10px] uppercase tracking-widest font-bold ${
                          cycle === "Custom" ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/20"
                        }`}
                      >
                        Custom
                      </label>
                    </div>
                  </div>

                  {cycle === "Custom" && (
                    <div className="flex">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="14"
                        className="flex-1 bg-white border border-[#3A3A38]/20 p-4 font-mono text-sm placeholder:text-[#3A3A38]/30 rounded-sm"
                      />
                      <div className="bg-[#1A3C2B]/5 border border-[#3A3A38]/20 border-l-0 px-6 flex items-center">
                        <span className="font-mono text-[10px] font-bold tracking-widest">DAYS</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 05. Payout Address */}
                <div className="space-y-2">
                  <label className="font-mono text-[10px] tracking-widest uppercase text-[#1A3C2B] font-bold">
                    05. Payout Address
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      placeholder="0x7a2C0f8dB8E42Fe5d7f9E9e9e9e9e9e9e9e9c8F"
                      className="w-full bg-white border border-[#3A3A38]/20 p-4 font-mono text-[12px] placeholder:text-[#3A3A38]/30 rounded-sm"
                    />
                    {!publicAddress && (
                      <Link
                        href="/login"
                        className="absolute right-2 px-3 py-1.5 border border-forest text-forest font-mono text-[9px] uppercase tracking-widest hover:bg-forest hover:text-white transition-all"
                      >
                        Connect Wallet
                      </Link>
                    )}
                  </div>
                  <p className="font-mono text-[9px] opacity-50 tracking-tight mt-1">
                    Funds will settle to this address. Must be a valid EVM wallet.
                  </p>
                </div>

                {/* 06. Target Network */}
                <div className="space-y-4">
                  <label className="font-mono text-[10px] tracking-widest uppercase text-[#1A3C2B] font-bold">
                    06. Target Network
                  </label>
                  <div className="flex gap-3">
                    {["arbitrum", "base"].map((net) => (
                      <div key={net} className="flex-1">
                        <input
                          type="radio"
                          name="network"
                          id={`net-${net}`}
                          className="hidden custom-radio"
                          checked={network === net}
                          onChange={() => setNetwork(net as any)}
                        />
                        <label
                          htmlFor={`net-${net}`}
                          className={`flex items-center justify-center p-3 border cursor-pointer font-mono text-[10px] uppercase tracking-widest font-bold ${
                            network === net ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/20"
                          }`}
                        >
                          {net === "arbitrum" ? "Arbitrum One" : "Base Network"}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Preview Section */}
                <div className="pt-8">
                  <h6 className="font-space text-base font-bold text-[#1A3C2B] mb-4">
                    Plan Preview
                  </h6>
                  <div className="border border-[#3A3A38]/10 bg-white/50 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h4 className="font-space text-xl font-bold mb-1 uppercase tracking-tight">
                        {planName || "Professional Plan"}
                      </h4>
                      <p className="font-sans text-xs text-[#3A3A38]/60">
                        Merchant preview state (Target: {network === "arbitrum" ? "Arbitrum" : "Base"})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-space text-3xl font-bold text-[#1A3C2B]">
                        {price || "0.00"} {token} /{" "}
                        {cycle === "Weekly"
                          ? "WK"
                          : cycle === "Monthly"
                          ? "MO"
                          : cycle === "Quarterly"
                          ? "QTR"
                          : `${customDays || "0"}D`}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-50 mt-1">
                        {cycle === "Custom" ? `Every ${customDays || "0"} days` : `${cycle} billing cycle`}
                        {priceInUsd && ` · ≈ $${priceInUsd}`}
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="border border-coral bg-coral/5 p-4 rounded-sm text-center">
                    <p className="font-mono text-xs text-coral font-bold uppercase tracking-tight">Error: {error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-10">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-[#1A3C2B] text-white font-mono text-xs tracking-[0.2em] uppercase px-12 py-5 rounded-sm hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Launching Plan..." : "Create & Launch Plan"}
                  </button>
                </div>

                {/* Helper Text */}
                <div className="text-center mt-8">
                  <p className="font-sans text-sm text-[#3A3A38]/60">
                    By creating a plan, you agree to Pact merchant terms.{" "}
                    <Link href="/terms" className="text-[#FF8C69] hover:underline">
                      View Terms
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
