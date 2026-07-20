"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";
import { NavigationBar } from "@/components/NavigationBar";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { PlanCard } from "@/components/PlanCard";
import { getPlansForMerchant, getSubscriptionsForUser, getUSDCBalance, getETHBalance } from "@/lib/contracts";

export function PactSpikeDashboard() {
  const { publicAddress } = useAuth();
  
  // Interactive / Dynamic States
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>("0.00 USDC");
  const [loading, setLoading] = useState<boolean>(true);
  const [alertVisible, setAlertVisible] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!publicAddress) return;
      setLoading(true);
      try {
        const [arbUsdc, baseUsdc, arbEth, baseEth, arbPlans, basePlans, arbSubs, baseSubs] = await Promise.all([
          getUSDCBalance(publicAddress, "arbitrum"),
          getUSDCBalance(publicAddress, "base"),
          getETHBalance(publicAddress, "arbitrum"),
          getETHBalance(publicAddress, "base"),
          getPlansForMerchant(publicAddress, "arbitrum"),
          getPlansForMerchant(publicAddress, "base"),
          getSubscriptionsForUser(publicAddress, "arbitrum"),
          getSubscriptionsForUser(publicAddress, "base")
        ]);

        const totalUsdc = (parseFloat(arbUsdc) + parseFloat(baseUsdc)).toFixed(2);
        const totalEth = (parseFloat(arbEth) + parseFloat(baseEth)).toFixed(5);
        setBalance(`${totalEth} ETH / ${totalUsdc} USDC`);
        
        // Combine plans and subscriptions
        setPlans([...arbPlans, ...basePlans]);
        setSubscriptions([...arbSubs, ...baseSubs]);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [publicAddress]);

  const handleTogglePlan = (id: string) => {
    // Local toggle for visual feedback
    setPlans(prev =>
      prev.map(plan =>
        plan.id === id
          ? { ...plan, status: plan.status === "active" ? "paused" : "active" }
          : plan
      )
    );
  };

  const hasPlans = plans.length > 0;

  // Calculate dynamic spending
  const totalMonthlySpending = subscriptions
    .filter(sub => sub.status === "active")
    .reduce((acc, sub) => {
      const val = parseFloat(sub.amount.replace(/[^0-9.]/g, "")) || 0;
      return acc + val;
    }, 0)
    .toFixed(2);

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          {/* Alerts Banner */}
          {alertVisible && subscriptions.some(sub => sub.status === "past-due") && (
            <section id="alerts">
              <div className="relative flex flex-col md:flex-row items-center justify-between border border-coral bg-coral/10 p-6 border-l-4">
                <div className="flex items-center gap-4 text-forest">
                  <iconify-icon icon="lucide:alert-triangle" className="text-2xl text-coral"></iconify-icon>
                  <div>
                    <h5 className="font-space font-bold text-lg leading-tight uppercase tracking-tight">1 Subscription Past Due</h5>
                    <p className="font-mono text-xs opacity-70 mt-1">One of your active subscriptions requires attention due to insufficient account balance. Deposit funds to maintain active status.</p>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex gap-4">
                  <Link href="/balance" id="alert-primary-btn" className="bg-forest text-white font-mono text-[10px] tracking-widest uppercase px-6 py-3 rounded-sm">
                    Add Funds
                  </Link>
                  <button onClick={() => setAlertVisible(false)} id="alert-dismiss-btn" className="font-mono text-[10px] tracking-widest uppercase px-4 py-3 opacity-50 cursor-pointer">
                    Dismiss
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Overview Metrics Cards */}
          <section id="overview" className="py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-[#3A3A38]/20 p-8 bg-white/50 relative">
                <span className="font-mono text-[10px] tracking-widest uppercase opacity-50 block mb-4">Active Subscriptions</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-space text-5xl font-bold">{loading ? "..." : String(subscriptions.filter(s => s.status === "active").length).padStart(2, "0")}</h2>
                  <span className="text-[#9EFFBF] font-mono text-xs font-bold">on-chain</span>
                </div>
              </div>
              <div className="border border-[#3A3A38]/20 p-8 bg-white/50 relative">
                <span className="font-mono text-[10px] tracking-widest uppercase opacity-50 block mb-4">Monthly Spending</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-space text-5xl font-bold">${loading ? "..." : totalMonthlySpending}</h2>
                  <span className="font-mono text-xs opacity-50">USDC</span>
                </div>
              </div>
              <div className="border border-[#3A3A38]/20 p-8 bg-white/50 relative">
                <span className="font-mono text-[10px] tracking-widest uppercase opacity-50 block mb-4">Available Balance</span>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-space text-2xl font-bold text-forest leading-tight">{loading ? "..." : balance}</h2>
                </div>
              </div>
            </div>
          </section>

          {/* My Subscriptions List */}
          <section id="subscriptions" className="space-y-8 pb-12 border-b border-[#3A3A38]/10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="border-l-4 border-forest pl-4">
                <h2 className="font-space text-4xl font-bold uppercase tracking-tighter">My Subscriptions</h2>
                <p className="font-mono text-[10px] tracking-widest uppercase opacity-50">Active recurring payments authorized via Pact</p>
              </div>
              <Link href="/subscribe" id="new-sub-link" className="font-mono text-[10px] tracking-widest uppercase bg-forest/5 border border-forest/10 px-6 py-3 hover:bg-white transition-colors">
                Explore Subscription Plans
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-8 text-center font-mono text-xs opacity-50 uppercase tracking-widest">
                  Scanning contract logs...
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="col-span-full py-8 text-center font-mono text-xs opacity-50 uppercase tracking-widest">
                  No active subscriptions found
                </div>
              ) : (
                subscriptions.map((sub, i) => (
                  <SubscriptionCard
                    key={i}
                    plan={sub.plan}
                    merchant={sub.merchant}
                    status={sub.status}
                    amount={sub.amount}
                    nextBilling={sub.nextBilling}
                    revokeHref={sub.revokeHref}
                  />
                ))
              )}
            </div>
          </section>

          {/* Merchant Plans List */}
          <section id="merchant" className="space-y-8 py-12">
            {hasPlans ? (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="border-l-4 border-gold pl-4">
                    <h2 className="font-space text-4xl font-bold uppercase tracking-tighter">My Plans</h2>
                    <p className="font-mono text-[10px] tracking-widest uppercase opacity-50">Subscriptions and services you are offering as a merchant</p>
                  </div>
                  <Link href="/setup" id="create-plan-btn" className="bg-forest text-white font-mono text-[10px] tracking-widest uppercase px-6 py-4 rounded-sm text-center">
                    Create New Plan
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            ) : (
              <div className="border border-[#3A3A38]/20 bg-white/30 p-12 text-center">
                <p className="font-mono text-[10px] opacity-40 uppercase tracking-[0.2em] mb-4">No plans created yet</p>
                <h3 className="font-space text-2xl font-bold mb-8 uppercase tracking-tight">Start accepting on-chain subscriptions</h3>
                <Link href="/setup" id="empty-create-plan-btn" className="inline-block bg-forest text-white font-mono text-[10px] tracking-widest uppercase px-8 py-4 rounded-sm hover:opacity-95 transition-opacity">
                  Create Your First Plan
                </Link>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
