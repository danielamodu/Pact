"use client";

import { useAuth } from "@/contexts/AuthProvider";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ethers } from "ethers";
import { getProvider, PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI } from "@/lib/contracts";

function SubscribeContent() {
  const { publicAddress } = useAuth();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const network = (searchParams.get("network") as "arbitrum" | "base") || "base";

  const [planData, setPlanData] = useState<{ name: string, price: string, intervalDays: number, merchant: string, payoutAddress: string, token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planId) {
      setLoading(true);
      setError(null);
      const provider = getProvider(network);
      const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);
      
      contract.getPlan(planId).then((data) => {
        if (!data.name || data.payoutAddress === ethers.ZeroAddress) {
          setError(`Plan #${planId} was not found on ${network === "arbitrum" ? "Arbitrum One" : "Base Network"}.`);
          setLoading(false);
          return;
        }

        let tokenSymbol = "USDC";
        let tokenDecimals = 6;
        if (data.token.toLowerCase() === "0x0000000000000000000000000000000000000000" || 
            data.token.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
          tokenSymbol = "ETH";
          tokenDecimals = 18;
        } else if (data.token.toLowerCase() === "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" || 
                   data.token.toLowerCase() === "0x50c5725949a6f0c72e6c4a641f240e934e271057") {
          tokenSymbol = "USDT";
          tokenDecimals = 6;
        }

        setPlanData({
          name: data.name,
          price: ethers.formatUnits(data.price, tokenDecimals),
          intervalDays: Math.round(Number(data.intervalSeconds) / 86400),
          merchant: `${data.payoutAddress.substring(0, 6)}...${data.payoutAddress.substring(38)}`,
          payoutAddress: data.payoutAddress, // full untruncated address for session key scope
          token: tokenSymbol
        });
        setLoading(false);
      }).catch((err) => {
        console.error(err);
        setError(`Failed to retrieve plan #${planId} on ${network === "arbitrum" ? "Arbitrum One" : "Base"}. Ensure you are querying the correct network.`);
        setLoading(false);
      });
    } else {
      setError("NO_PLAN_SELECTED");
      setLoading(false);
    }
  }, [planId, network]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-forest relative">
        <div className="mosaic-bg"></div>
        <NavigationBar />
        <main className="flex-1 flex items-center justify-center p-6 pt-24">
          <div className="text-center py-20 font-mono text-sm opacity-60">
            Querying plan data and resolving secure contracts...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    const isNoPlanSelected = error === "NO_PLAN_SELECTED";

    return (
      <div className="min-h-screen flex flex-col bg-paper text-forest relative">
        <div className="mosaic-bg"></div>
        <NavigationBar />
        <main className="flex-1 flex items-center justify-center p-6 pt-24">
          <div className="relative bg-[#F7F7F5] border border-forest/15 p-10 max-w-lg w-full text-center border-l-4 border-l-forest shadow-lg">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="w-14 h-14 bg-mint/20 text-forest flex items-center justify-center rounded-full mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h3 className="font-space text-2xl font-bold uppercase tracking-tight text-forest mb-3">
              {isNoPlanSelected ? "No Plan Selected Yet" : "Plan Not Found"}
            </h3>
            <p className="font-sans text-sm text-[#3A3A38]/70 mb-8 leading-relaxed">
              {isNoPlanSelected 
                ? "To subscribe to an enterprise service, use a merchant checkout link or create your first recurring plan." 
                : error}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/setup" className="bg-forest text-white font-mono text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-sm hover:opacity-90 transition-opacity">
                Create a Plan
              </Link>
              <Link href="/wallet" className="border border-forest/20 text-forest font-mono text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-sm hover:bg-forest/5 transition-colors">
                Control Center
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col mosaic-bg">
      <NavigationBar />
      <main className="flex-1 pt-24">
        <section className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          
          {/* Left Side: Plan Info */}
          <div className="lg:col-span-8 space-y-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-forest/5 border border-forest/20 flex items-center justify-center rounded-sm">
                <iconify-icon icon="lucide:user" className="text-2xl text-forest/40"></iconify-icon>
              </div>
              <div>
                <h3 className="font-space text-2xl font-bold tracking-tight">
                  {planData ? `Merchant: ${planData.merchant}` : "Merchant"}
                </h3>
              </div>
            </div>

            <h1 className="font-space text-6xl md:text-[80px] leading-[0.9] tracking-tighter text-[#1A3C2B] font-bold mb-8">
              {planData ? planData.name : "Loading Plan..."}
            </h1>

            <p className="font-sans text-xl text-[#3A3A38]/70 max-w-2xl mb-12">
              Authorize a recurring subscription for this plan. Your smart account will automatically handle the recurring payments on the specified interval.
            </p>

            <div className="mb-16">
              <span className="font-mono text-[12px] opacity-40 uppercase block mb-2">
                Subscription Cost
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="font-space text-7xl font-bold text-[#1A3C2B]">
                  {planData ? planData.price : "--"}
                </h2>
                <span className="font-space text-3xl font-medium">
                  {planData ? planData.token : "USDC"} / {planData ? `${planData.intervalDays} DAYS` : "MO"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#3A3A38]/10 border border-[#3A3A38]/10 rounded-sm overflow-hidden">
              <div className="bg-white p-6">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-2">Token</span>
                <span className="font-space text-lg font-bold uppercase">{planData ? planData.token : "USDC"}</span>
              </div>
              <div className="bg-white p-6">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-2">Interval</span>
                <span className="font-space text-lg font-bold uppercase">{planData ? `${planData.intervalDays} Days` : "--"}</span>
              </div>
                <div className="bg-white p-6">
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-2">Network</span>
                  <span className="font-space text-lg font-bold uppercase">{network === "arbitrum" ? "Arbitrum" : "Base"}</span>
                </div>
                <div className="bg-white p-6">
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-2">Renewal</span>
                  <span className="font-space text-lg font-bold uppercase">Automatic</span>
                </div>
              </div>
            </div>

            {/* Right Side: Confirm Card */}
            <div className="lg:col-span-4">
              <div className="relative p-10 border border-[#3A3A38]/20 bg-white">
                {/* Corner Markers */}
                <div className="corner-marker corner-tl"></div>
                <div className="corner-marker corner-tr"></div>
                <div className="corner-marker corner-bl"></div>
                <div className="corner-marker corner-br"></div>

                <div className="space-y-8">
                  <div className="pb-8 border-b border-[#3A3A38]/10">
                    <h4 className="font-space text-xl font-bold mb-4">Confirm Intent</h4>
                    <p className="font-sans text-sm text-[#3A3A38]/60 leading-relaxed">
                      By proceeding, you grant Pact the ability to request session authorization. No funds are moved in this step.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <iconify-icon icon="lucide:shield-check" className="text-[#9EFFBF] text-lg"></iconify-icon>
                      <span className="font-mono text-[10px] uppercase tracking-widest">Revoke Access Anytime</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <iconify-icon icon="lucide:zap" className="text-[#F4D35E] text-lg"></iconify-icon>
                      <span className="font-mono text-[10px] uppercase tracking-widest">Gas-Optimized Pulls</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <iconify-icon icon="lucide:refresh-ccw" className="text-[#FF8C69] text-lg"></iconify-icon>
                      <span className="font-mono text-[10px] uppercase tracking-widest">Direct To Merchant</span>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      href={planData ? `/permission?planId=${planId}&network=${network}&name=${encodeURIComponent(planData.name)}&price=${encodeURIComponent(planData.price)}&intervalDays=${planData.intervalDays}&token=${encodeURIComponent(planData.token)}&merchant=${encodeURIComponent(planData.merchant)}&payoutAddress=${encodeURIComponent(planData.payoutAddress)}` : "/permission"}
                      id="cta-subscribe-authorize"
                      className="block w-full text-center bg-forest text-white font-mono text-xs tracking-[0.2em] uppercase py-5 rounded-sm hover:opacity-95 transition-opacity"
                    >
                      Subscribe &amp; Authorize
                    </Link>
                    <Link
                      href="/"
                      id="cta-learn-more"
                      className="block w-full text-center mt-4 font-mono text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                    >
                      Learn More About Pact
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-8 border border-[#3A3A38]/10 p-6 bg-[#3A3A38]/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${publicAddress ? "bg-mint animate-pulse" : "bg-coral"}`}></div>
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">Wallet Status</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold">
                  {publicAddress ? "Connected" : "Not Connected"}
                </span>
              </div>

            </div>

          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#3A3A38]/10">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-widest text-[#1A3C2B] font-bold">SESSION PARAMETERS</span>
              <h5 className="font-space text-xl font-bold uppercase tracking-tight">Hard Limits</h5>
              <p className="font-sans text-sm text-[#3A3A38]/60">
                Your signed permission defines an immutable spending cap. The protocol physically cannot pull more than the authorized limit.
              </p>
            </div>

            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-widest text-[#1A3C2B] font-bold">FULL TRANSPARENCY</span>
              <h5 className="font-space text-xl font-bold uppercase tracking-tight">Audit Trail</h5>
              <p className="font-sans text-sm text-[#3A3A38]/60">
                Every recurring pull is an on-chain event. Monitor every transaction, success, or decline through your private dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-widest text-[#1A3C2B] font-bold">INSTANT KILLSWITCH</span>
              <h5 className="font-space text-xl font-bold uppercase tracking-tight">One-Click Revoke</h5>
              <p className="font-sans text-sm text-[#3A3A38]/60">
                Pact ensures you remain in control. Cancel your session instantly at any time directly on-chain without merchant consent.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-mono">Loading...</div>}>
      <SubscribeContent />
    </Suspense>
  );
}
