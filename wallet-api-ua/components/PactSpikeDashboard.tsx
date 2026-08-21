"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { NavigationBar } from "@/components/NavigationBar";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { PlanCard } from "@/components/PlanCard";
import { DepositModal } from "@/components/DepositModal";
import {
  getPlansForMerchant,
  getSubscriptionsForUser,
  getUSDCBalance,
  getETHBalance,
  getRecentProtocolActivity,
  ProtocolEvent,
} from "@/lib/contracts";

export function PactSpikeDashboard() {
  const { publicAddress, userInfo } = useAuth();

  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [eth, setEth] = useState(0);
  const [usdc, setUsdc] = useState(0);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(true);
  const [activity, setActivity] = useState<ProtocolEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [showMerchant, setShowMerchant] = useState(false);
  const [merchantAutoShown, setMerchantAutoShown] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!publicAddress) return;
      setLoading(true);
      try {
        const [arbUsdc, baseUsdc, arbEth, baseEth, arbPlans, basePlans, arbSubs, baseSubs] =
          await Promise.all([
            getUSDCBalance(publicAddress, "arbitrum"),
            getUSDCBalance(publicAddress, "base"),
            getETHBalance(publicAddress, "arbitrum"),
            getETHBalance(publicAddress, "base"),
            getPlansForMerchant(publicAddress, "arbitrum"),
            getPlansForMerchant(publicAddress, "base"),
            getSubscriptionsForUser(publicAddress, "arbitrum"),
            getSubscriptionsForUser(publicAddress, "base"),
          ]);

        setUsdc(parseFloat(arbUsdc) + parseFloat(baseUsdc));
        setEth(parseFloat(arbEth) + parseFloat(baseEth));

        const allPlans = [...arbPlans, ...basePlans];
        setPlans(allPlans);
        setSubscriptions([...arbSubs, ...baseSubs]);

        // Someone who already runs plans gets the merchant view opened for
        // them once; after that their own toggle wins.
        if (!merchantAutoShown) {
          if (allPlans.length > 0) setShowMerchant(true);
          setMerchantAutoShown(true);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    setActivityLoading(true);
    getRecentProtocolActivity(15)
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [publicAddress]);

  // Balances are shown in dollars first. "0.00000 ETH / 0.00 USDC" asks a new
  // user to reason in two units they don't have a feel for yet.
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.ethereum?.usd) setEthPrice(d.ethereum.usd); })
      .catch(() => { /* dollar view falls back to token amounts */ });
  }, []);

  const handleTogglePlan = (id: string) => {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === id ? { ...plan, status: plan.status === "active" ? "paused" : "active" } : plan
      )
    );
  };

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const pastSubs = subscriptions.filter((s) => s.status !== "active");
  const hasPlans = plans.length > 0;
  const pastDue = subscriptions.some((s) => s.status === "past-due");

  const totalUsd = ethPrice !== null ? eth * ethPrice + usdc : null;
  const hasFunds = eth > 0 || usdc > 0;
  const isNewUser = !loading && !hasFunds && activeSubs.length === 0 && !hasPlans;

  const monthlySpend = activeSubs
    .reduce((acc, s) => acc + (parseFloat(String(s.amount).replace(/[^0-9.]/g, "")) || 0), 0)
    .toFixed(2);

  const totalSubscribers = plans.reduce((acc, p) => acc + (p.subscribers || 0), 0);
  const planRevenue = plans
    .reduce((acc, p) => acc + (parseFloat(String(p.revenue).replace(/[^0-9.]/g, "")) || 0), 0)
    .toFixed(2);

  const firstName = userInfo?.name?.split(" ")[0] || null;

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

          {/* Greeting */}
          <div>
            <h1 className="font-space text-3xl font-bold tracking-tight text-forest">
              {firstName ? `Hi, ${firstName}` : "Your account"}
            </h1>
            <p className="font-sans text-sm text-[#3A3A38]/60 mt-1">
              {isNewUser
                ? "Let's get you set up — it takes about a minute."
                : "Subscriptions here renew on their own. Nothing to approve each month."}
            </p>
          </div>

          {/* Past-due warning */}
          {alertVisible && pastDue && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-coral bg-coral/5 border border-coral/20 p-5">
              <div>
                <h5 className="font-space font-bold text-base text-forest">A payment couldn&apos;t go through</h5>
                <p className="font-sans text-sm text-[#3A3A38]/70 mt-0.5">
                  Your balance was too low to cover a subscription. Add funds to keep it active.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setDepositOpen(true)}
                  className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-sm hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Add funds
                </button>
                <button
                  onClick={() => setAlertVisible(false)}
                  className="text-sm text-[#3A3A38]/50 hover:text-forest px-3 py-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Balance — one number, in dollars */}
          <section className="bg-white border border-[#3A3A38]/15 p-7">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <span className="font-sans text-sm text-[#3A3A38]/50 block mb-1">Your balance</span>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-space text-4xl font-bold text-forest leading-none">
                    {loading ? "—" : totalUsd !== null ? `$${totalUsd.toFixed(2)}` : `${eth.toFixed(4)} ETH`}
                  </span>
                  {!loading && (
                    <span className="font-mono text-[11px] text-[#3A3A38]/40">
                      {eth.toFixed(5)} ETH · {usdc.toFixed(2)} USDC
                    </span>
                  )}
                </div>
                {!loading && !hasFunds && (
                  <p className="font-sans text-sm text-[#3A3A38]/50 mt-2">
                    Empty for now — add funds to start subscribing.
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setDepositOpen(true)}
                  className="bg-forest text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Add funds
                </button>
                <Link
                  href="/balance"
                  className="border border-[#3A3A38]/20 text-forest text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-[#F7F7F5] transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          </section>

          {/* First run — a path, not an empty grid */}
          {isNewUser ? (
            <section className="bg-white border border-[#3A3A38]/15">
              <div className="px-7 py-5 border-b border-[#3A3A38]/10">
                <h2 className="font-space text-lg font-bold text-forest">Getting started</h2>
              </div>
              <ol className="divide-y divide-[#3A3A38]/8">
                {[
                  {
                    n: 1,
                    title: "Add funds",
                    body: "Send USDC, USDT, or ETH on Arbitrum or Base. You need a little ETH for network fees.",
                    action: (
                      <button
                        onClick={() => setDepositOpen(true)}
                        className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-sm hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                      >
                        Add funds
                      </button>
                    ),
                  },
                  {
                    n: 2,
                    title: "Subscribe to something",
                    body: "Open a subscribe link from a merchant, and approve the amount and schedule once.",
                    action: (
                      <Link
                        href="/subscribe"
                        className="border border-[#3A3A38]/20 text-forest text-sm font-semibold px-4 py-2 rounded-sm hover:bg-[#F7F7F5] transition-colors whitespace-nowrap"
                      >
                        Browse plans
                      </Link>
                    ),
                  },
                  {
                    n: 3,
                    title: "That's it",
                    body: "Payments run on schedule by themselves. Cancel any time — no email, no waiting.",
                    action: null,
                  },
                ].map((step) => (
                  <li key={step.n} className="flex items-start gap-5 px-7 py-5">
                    <span className="w-7 h-7 rounded-full border border-forest/20 text-forest font-space text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-space text-base font-bold text-forest">{step.title}</h3>
                      <p className="font-sans text-sm text-[#3A3A38]/60 mt-0.5 leading-relaxed">{step.body}</p>
                    </div>
                    {step.action && <div className="flex-shrink-0">{step.action}</div>}
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <>
              {/* Subscriptions */}
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-space text-lg font-bold text-forest">Your subscriptions</h2>
                    {activeSubs.length > 0 && (
                      <p className="font-sans text-sm text-[#3A3A38]/60 mt-0.5">
                        About ${monthlySpend} a month across {activeSubs.length} subscription
                        {activeSubs.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/subscribe"
                    className="font-sans text-sm text-forest font-semibold hover:text-coral transition-colors whitespace-nowrap"
                  >
                    Browse plans →
                  </Link>
                </div>

                {loading ? (
                  <div className="bg-white border border-[#3A3A38]/15 py-12 text-center font-sans text-sm text-[#3A3A38]/40">
                    Loading your subscriptions…
                  </div>
                ) : activeSubs.length === 0 ? (
                  <div className="bg-white border border-[#3A3A38]/15 py-12 px-6 text-center">
                    <p className="font-space text-base font-bold text-forest">No subscriptions yet</p>
                    <p className="font-sans text-sm text-[#3A3A38]/60 mt-1 mb-5">
                      Open a merchant&apos;s subscribe link to set one up.
                    </p>
                    <Link
                      href="/subscribe"
                      className="inline-block bg-forest text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
                    >
                      Browse plans
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {activeSubs.map((sub, i) => (
                      <SubscriptionCard
                        key={i}
                        plan={sub.plan}
                        merchant={sub.merchant}
                        status={sub.status}
                        amount={sub.amount}
                        nextBilling={sub.nextBilling}
                        revokeHref={sub.revokeHref}
                      />
                    ))}
                  </div>
                )}

                {!loading && pastSubs.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer font-sans text-sm text-[#3A3A38]/50 hover:text-forest transition-colors list-none flex items-center gap-2 py-2">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 transition-transform group-open:rotate-90">
                        <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {pastSubs.length} cancelled or past subscription{pastSubs.length === 1 ? "" : "s"}
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4 opacity-75">
                      {pastSubs.map((sub, i) => (
                        <SubscriptionCard
                          key={i}
                          plan={sub.plan}
                          merchant={sub.merchant}
                          status={sub.status}
                          amount={sub.amount}
                          nextBilling={sub.nextBilling}
                          revokeHref={sub.revokeHref}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </section>

              {/* Merchant side — kept out of the way until it's relevant */}
              {hasPlans || showMerchant ? (
                <section className="space-y-4 pt-2">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-space text-lg font-bold text-forest">Plans you offer</h2>
                      {hasPlans && (
                        <p className="font-sans text-sm text-[#3A3A38]/60 mt-0.5">
                          {totalSubscribers} subscriber{totalSubscribers === 1 ? "" : "s"} · ${planRevenue} collected
                        </p>
                      )}
                    </div>
                    <Link
                      href="/setup"
                      className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      New plan
                    </Link>
                  </div>

                  {hasPlans ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {plans.map((plan, i) => (
                        <PlanCard
                          key={plan.id || i}
                          planId={plan.id}
                          network={plan.network}
                          planName={plan.planName}
                          token={plan.token}
                          status={plan.status}
                          price={plan.price}
                          subscribers={plan.subscribers}
                          revenue={plan.revenue}
                          onToggleActive={() => handleTogglePlan(plan.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-[#3A3A38]/15 py-10 px-6 text-center">
                      <p className="font-sans text-sm text-[#3A3A38]/60 mb-4">
                        Create a plan and share a link — payments arrive on their own.
                      </p>
                      <Link
                        href="/setup"
                        className="inline-block bg-forest text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
                      >
                        Create your first plan
                      </Link>
                    </div>
                  )}
                </section>
              ) : (
                <button
                  onClick={() => setShowMerchant(true)}
                  className="w-full text-left bg-white border border-[#3A3A38]/15 px-7 py-5 hover:bg-[#F7F7F5] transition-colors cursor-pointer flex items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-space text-base font-bold text-forest">Offering a service?</h3>
                    <p className="font-sans text-sm text-[#3A3A38]/60 mt-0.5">
                      Charge customers on a schedule and get paid automatically.
                    </p>
                  </div>
                  <span className="font-sans text-sm text-forest font-semibold whitespace-nowrap">Set up →</span>
                </button>
              )}
            </>
          )}

          {/* Live network activity — quiet proof this is really on-chain */}
          <details className="group pt-2">
            <summary className="cursor-pointer font-sans text-sm text-[#3A3A38]/50 hover:text-forest transition-colors list-none flex items-center gap-2 py-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2 transition-transform group-open:rotate-90">
                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Recent activity across Pact
            </summary>

            <div className="border border-[#3A3A38]/15 bg-white overflow-hidden mt-3">
              {activityLoading ? (
                <div className="px-6 py-10 text-center font-sans text-sm text-[#3A3A38]/40">
                  Checking the network…
                </div>
              ) : activity.length === 0 ? (
                <div className="px-6 py-10 text-center font-sans text-sm text-[#3A3A38]/40">
                  No recent activity
                </div>
              ) : (
                activity.map((event, i) => (
                  <div
                    key={event.txHash + i}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-[#3A3A38]/8 last:border-0 hover:bg-[#F7F7F5] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          event.type === "pull" ? "bg-forest" : "bg-[#FF8C69]"
                        }`}
                      />
                      <span className="font-sans text-sm text-forest">
                        {event.type === "pull" ? "Payment collected" : "New subscriber"}
                      </span>
                      <span className="font-mono text-[10px] text-[#3A3A38]/40 truncate">
                        Plan #{event.planId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#3A3A38]/40">
                        {event.network === "arbitrum" ? "Arbitrum" : "Base"}
                      </span>
                      <a
                        href={event.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-xs text-forest/60 hover:text-coral underline underline-offset-2 transition-colors"
                      >
                        Receipt
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </main>

      {publicAddress && (
        <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} address={publicAddress} />
      )}
    </div>
  );
}
