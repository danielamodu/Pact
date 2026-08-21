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
            : "0x50C5725949A6f0C72E6C4A641F240e934e271057";
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
      <div className="app-ground"></div>
      <NavigationBar mode="app" activeItem="plans" />

      {successTxHash && (
        <div className="fixed inset-0 bg-[#3A3A38]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="ui-card max-w-lg w-full p-10 flex flex-col items-center text-center">

            <div className="w-16 h-16 bg-mint/10 border border-mint flex items-center justify-center text-forest rounded-full mb-6">
              <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current stroke-2 fill-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 className="font-space text-3xl font-bold tracking-tight text-forest mb-2">
              Plan Successfully Launched
            </h2>
            <p className="font-sans text-[17px] text-[#46564E] mb-6">
              Your subscription plan contract is live on-chain and ready to accept subscriber flows.
            </p>

            {createdPlanId && (
              <div className="w-full bg-[#9EFFBF]/15 border border-forest/20 p-4 text-left mb-4">
                <span className="block font-sans text-sm text-[#66756B] mb-1">Plan ID</span>
                <span className="font-space text-3xl font-bold text-forest leading-none">#{createdPlanId}</span>
                <p className="font-sans text-sm text-[#66756B] mt-2">
                  Share the link below to start accepting subscribers
                </p>
              </div>
            )}

            {createdPlanId && (
              <div className="w-full bg-[#F7F7F5] border border-[#3A3A38]/10 p-4 text-left mb-4">
                <span className="block font-sans text-sm text-[#66756B] mb-2">Subscribe Link</span>
                <code className="font-mono text-[13px] text-forest break-all block mb-3">
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
                  className="ui-btn ui-btn-ghost ui-btn-sm w-full"
                >
                  {linkCopied ? "Copied!" : "Copy Subscribe Link"}
                </button>
              </div>
            )}

            <div className="w-full bg-[#F7F7F5] border border-[#3A3A38]/10 p-4 font-mono text-[11px] break-all text-left mb-8">
              <span className="block font-sans text-sm text-[#66756B] mb-1">Transaction Hash</span>
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
                  className="flex-1 ui-btn ui-btn-primary"
                >
                  View Plan Dashboard
                </button>
              )}
              <button
                onClick={() => router.push("/wallet")}
                className={`flex-1 ui-btn ${createdPlanId ? "ui-btn-ghost" : "ui-btn-primary"}`}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pt-14 pb-28 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-10">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="font-space text-[44px] font-bold tracking-tight text-forest leading-[1.1]">
              Create a plan
            </h1>
            <p className="font-sans text-[17px] text-[#46564E] mt-1">
              Set your price and schedule, then share the link.
            </p>
          </div>

          {/* Form Container */}
          <div className="max-w-[720px] mx-auto">
            <div className="ui-card p-10">
              {/* Corner Markers */}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Plan name */}
                <div className="space-y-2">
                  <label className="font-sans text-[15px] font-semibold text-forest">
                    Plan name
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Professional Plan"
                    className="ui-field font-sans"
                  />
                  <p className="font-sans text-sm text-[#66756B] mt-1.5">
                    This name will be displayed to subscribers
                  </p>
                </div>

                {/* Payment token */}
                <div className="space-y-4">
                  <label className="font-sans text-[15px] font-semibold text-forest">
                    Payment token
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
                          className={`flex items-center justify-center py-3.5 rounded-xl border cursor-pointer transition-colors font-sans text-[15px] font-semibold ${
                            token === tok ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/15 hover:bg-[#F7F7F5]"
                          }`}
                        >
                          {tok}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="font-sans text-[15px] font-semibold text-forest">
                    Price
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="49.99"
                      className="ui-field font-sans rounded-r-none"
                    />
                    <div className="bg-[#F7F7F5] border border-l-0 border-[#3A3A38]/12 rounded-r-xl px-5 flex items-center">
                      <span className="font-sans text-[15px] font-semibold text-[#46564E]">
                        {token}
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-[#66756B] mt-1.5">
                    {priceInUsd ? `≈ $${priceInUsd} USD per billing cycle` : "Price per billing cycle"}
                  </p>
                </div>

                {/* Billing cycle */}
                <div className="space-y-4">
                  <label className="font-sans text-[15px] font-semibold text-forest">
                    Billing cycle
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
                          className={`flex items-center justify-center py-3.5 rounded-xl border cursor-pointer transition-colors font-sans text-[15px] font-semibold ${
                            cycle === cyc ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/15 hover:bg-[#F7F7F5]"
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
                        className={`flex items-center justify-center py-3.5 rounded-xl border cursor-pointer transition-colors font-sans text-[15px] font-semibold ${
                          cycle === "Custom" ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/15 hover:bg-[#F7F7F5]"
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
                        className="ui-field font-sans rounded-r-none"
                      />
                      <div className="bg-[#F7F7F5] border border-l-0 border-[#3A3A38]/12 rounded-r-xl px-5 flex items-center">
                        <span className="font-sans text-[15px] font-semibold text-[#46564E]">DAYS</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Where payments go */}
                <div className="space-y-2">
                  <label className="font-sans text-[15px] font-semibold text-forest">
                    Where payments go
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={payoutAddress}
                      onChange={(e) => setPayoutAddress(e.target.value)}
                      placeholder="0x7a2C0f8dB8E42Fe5d7f9E9e9e9e9e9e9e9e9c8F"
                      className="ui-field font-mono !text-sm"
                    />
                    {!publicAddress && (
                      <Link
                        href="/login"
                        className="absolute right-2 ui-btn ui-btn-ghost ui-btn-sm"
                      >
                        Connect Wallet
                      </Link>
                    )}
                  </div>
                  <p className="font-sans text-sm text-[#66756B] mt-1.5">
                    Funds will settle to this address. Must be a valid EVM wallet.
                  </p>
                </div>

                {/* Network */}
                <div className="space-y-4">
                  <label className="font-sans text-[15px] font-semibold text-forest">
                    Network
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
                          className={`flex items-center justify-center py-3.5 rounded-xl border cursor-pointer transition-colors font-sans text-[15px] font-semibold ${
                            network === net ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/15 hover:bg-[#F7F7F5]"
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
                      <div className="font-sans text-sm text-[#66756B] mt-1">
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
