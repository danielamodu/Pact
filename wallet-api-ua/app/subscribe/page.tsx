"use client";

import { useAuth } from "@/contexts/AuthProvider";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ethers } from "ethers";
import { getProvider, PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI } from "@/lib/contracts";
import { getSessionKeyDelegation } from "@/lib/sessionKey";

function SubscribeContent() {
  const { publicAddress } = useAuth();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const network = (searchParams.get("network") as "arbitrum" | "base") || "base";

  const [planData, setPlanData] = useState<{ name: string, price: string, intervalDays: number, merchant: string, payoutAddress: string, token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (planId) {
      async function loadPlan() {
        setLoading(true);
        setError(null);

        let activeNet = network;
        const provider = getProvider(activeNet);
        const contract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, provider);

        try {
          let data = await contract.getPlan(planId);

          // Smart fallback if plan not found on primary network
          if (!data.name || data.payoutAddress === ethers.ZeroAddress) {
            const altNet = activeNet === "arbitrum" ? "base" : "arbitrum";
            const altProvider = getProvider(altNet);
            const altContract = new ethers.Contract(PACT_REGISTRY_ADDRESS, PACT_REGISTRY_ABI, altProvider);
            const altData = await altContract.getPlan(planId);

            if (altData.name && altData.payoutAddress !== ethers.ZeroAddress) {
              data = altData;
              activeNet = altNet;
            } else {
              setError(`Failed to retrieve plan #${planId}. Ensure you are querying the correct network.`);
              setLoading(false);
              return;
            }
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
            payoutAddress: data.payoutAddress,
            token: tokenSymbol
          });
        } catch (err) {
          console.error(err);
          setError(`Failed to retrieve plan #${planId}. Ensure you are querying the correct network.`);
        } finally {
          setLoading(false);
        }
      }
      loadPlan();
    } else {
      setError("NO_PLAN_SELECTED");
      setLoading(false);
    }
  }, [planId, network]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-forest relative">
        <div className="app-ground"></div>
        <NavigationBar />
        <main className="flex-1 flex items-center justify-center p-6 pb-36">
          <div className="text-center py-20 font-mono text-sm opacity-60">
            Loading plan details...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    const isNoPlanSelected = error === "NO_PLAN_SELECTED";

    return (
      <div className="min-h-screen flex flex-col bg-paper text-forest relative">
        <div className="app-ground"></div>
        <NavigationBar />
        <main className="flex-1 flex items-center justify-center p-6 pb-36">
          <div className="relative bg-[#F7F7F5] border border-forest/15 p-10 max-w-lg w-full text-center border-l-4 border-l-forest shadow-lg">

            <div className="w-14 h-14 bg-mint/20 text-forest flex items-center justify-center rounded-full mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <h3 className="font-space text-2xl font-bold tracking-tight text-forest mb-3">
              {isNoPlanSelected ? "No Plan Selected Yet" : "Plan Not Found"}
            </h3>
            <p className="font-sans text-sm text-[#3A3A38]/70 mb-8 leading-relaxed">
              {isNoPlanSelected 
                ? "To subscribe to an enterprise service, use a merchant checkout link or create your first recurring plan." 
                : error}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/setup" className="ui-btn ui-btn-primary">
                Create a Plan
              </Link>
              <Link href="/wallet" className="ui-btn ui-btn-ghost">
                Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const permissionHref = planData
    ? `/permission?planId=${planId}&network=${network}&name=${encodeURIComponent(planData.name)}&price=${encodeURIComponent(planData.price)}&intervalDays=${planData.intervalDays}&token=${encodeURIComponent(planData.token)}&merchant=${encodeURIComponent(planData.merchant)}&payoutAddress=${encodeURIComponent(planData.payoutAddress)}`
    : "/permission";

  return (
    <div className="min-h-screen flex flex-col bg-paper text-forest relative">
      <div className="app-ground"></div>
      <NavigationBar />

      <main className="flex-1 pt-14 pb-28 relative z-10">
        <div className="max-w-[1100px] mx-auto px-10 space-y-8">

          {/* Who's charging you */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-forest/8 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-forest/50 stroke-2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="font-sans text-[15px] text-[#46564E]">
              {planData ? planData.merchant : "Merchant"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* What you're subscribing to */}
            <div className="lg:col-span-3 space-y-6">
              <section className="ui-card-feature p-10 lg:p-12">
                <h1 className="font-space text-[40px] font-bold tracking-tight text-white leading-[1.1]">
                  {planData ? planData.name : "Loading…"}
                </h1>

                <div className="mt-8">
                  <span className="font-sans text-[15px] text-white/60 block mb-2">You&apos;ll pay</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-space text-[64px] font-bold text-white leading-none ui-num">
                      {planData ? planData.price : "—"}
                    </span>
                    <span className="font-space text-2xl font-semibold text-white/80">
                      {planData ? planData.token : ""}
                    </span>
                    <span className="font-sans text-[17px] text-white/60">
                      every {planData ? planData.intervalDays : "—"} days
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-9 pt-7 border-t border-white/15">
                  <div>
                    <span className="font-sans text-sm text-white/50 block mb-1">Network</span>
                    <span className="font-sans text-[15px] font-semibold text-white">
                      {network === "arbitrum" ? "Arbitrum" : "Base"}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans text-sm text-white/50 block mb-1">Renews</span>
                    <span className="font-sans text-[15px] font-semibold text-white">Automatically</span>
                  </div>
                  <div>
                    <span className="font-sans text-sm text-white/50 block mb-1">Cancel</span>
                    <span className="font-sans text-[15px] font-semibold text-white">Any time</span>
                  </div>
                </div>
              </section>

              {/* Reassurance, in plain terms */}
              <section className="ui-card p-8 space-y-5">
                {[
                  {
                    title: "They can never take more",
                    body: "You set a hard cap when you approve. This merchant cannot charge a penny more, or any sooner than the schedule you agreed to.",
                  },
                  {
                    title: "Every payment is on the record",
                    body: "See exactly what you were charged and when, any time, from your dashboard.",
                  },
                  {
                    title: "Cancelling is instant and free",
                    body: "Straight from your dashboard. No emails, no waiting, no permission needed from the merchant.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-forest stroke-2 flex-shrink-0 mt-0.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>
                      <h3 className="font-space text-lg font-bold text-forest">{item.title}</h3>
                      <p className="font-sans text-[15px] text-[#46564E] leading-relaxed mt-0.5">{item.body}</p>
                    </div>
                  </div>
                ))}
              </section>
            </div>

            {/* The ask */}
            <div className="lg:col-span-2 lg:sticky lg:top-8 space-y-4">
              <section className="ui-card p-8">
                {alreadySubscribed ? (
                  <>
                    <span className="ui-pill ui-pill-good mb-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#145233]" />
                      Already subscribed
                    </span>
                    <h2 className="font-space text-2xl font-bold text-forest">You&apos;re all set</h2>
                    <p className="font-sans text-[15px] text-[#46564E] mt-1.5 mb-6 leading-relaxed">
                      You already have an active subscription to this plan.
                    </p>
                    <Link
                      href={`/subscription/${planId}?network=${network}`}
                      className="ui-btn ui-btn-primary w-full"
                    >
                      Manage subscription
                    </Link>
                    <Link href={permissionHref} className="ui-btn ui-btn-ghost w-full mt-2">
                      Renew approval
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="font-space text-2xl font-bold text-forest">Ready to subscribe?</h2>
                    <p className="font-sans text-[15px] text-[#46564E] mt-1.5 mb-6 leading-relaxed">
                      Next you&apos;ll review the exact amount and schedule, then approve it once. No money moves in this step.
                    </p>
                    <Link href={permissionHref} id="cta-subscribe-authorize" className="ui-btn ui-btn-primary w-full">
                      Subscribe
                    </Link>
                  </>
                )}

                <Link href="/" className="ui-btn ui-btn-ghost w-full mt-2">
                  Not now
                </Link>

                <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-[#3A3A38]/10">
                  <span className="font-sans text-sm text-[#66756B]">Your wallet</span>
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${publicAddress ? "bg-forest" : "bg-coral"}`} />
                    <span className="font-sans text-sm font-medium text-forest">
                      {publicAddress ? "Connected" : "Sign in at checkout"}
                    </span>
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>
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
