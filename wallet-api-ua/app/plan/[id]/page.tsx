"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NavigationBar } from "@/components/NavigationBar";
import { getPlanDetails } from "@/lib/contracts";

export default function MerchantPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") as "arbitrum" | "base") || "arbitrum";

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState<{
    name: string;
    token: string;
    price: string;
    intervalDays: number;
    payoutAddress: string;
    active: boolean;
    subscribersCount: number;
    subscribers: Array<{ address: string; blockNumber: number }>;
    totalRevenue: string;
  } | null>(null);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const data = await getPlanDetails(id, network);
        setDetails(data);
      } catch (err) {
        console.error("Failed to load plan details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [id, network]);

  const handleCopyLink = () => {
    const checkoutUrl = `${window.location.origin}/subscribe?planId=${id}&network=${network}`;
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <Link href="/wallet" className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A38]/50 hover:text-forest flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="font-space text-5xl font-bold tracking-tighter leading-none text-forest">
                {loading ? "LOADING PLAN..." : details?.name.toUpperCase()}
              </h1>
              <p className="font-mono text-[10px] uppercase opacity-40">
                Pact Merchant Plan Details & Analytics
              </p>
            </div>

            {!loading && details && (
              <div className={`inline-flex items-center gap-2 border px-3 py-1 ${
                details.active
                  ? "border-[#1A3C2B]/20 bg-[#9EFFBF]/20 text-[#1A3C2B]"
                  : "border-gold/20 bg-gold/10 text-[#a8820a]"
              }`}>
                <div className={`w-2 h-2 rounded-full ${details.active ? "bg-[#1A3C2B]" : "bg-[#a8820a]"}`}></div>
                <span className="font-mono text-[10px] tracking-widest uppercase font-bold">
                  {details.active ? "Active" : "Paused"}
                </span>
              </div>
            )}
          </header>

          {loading ? (
            <div className="text-center py-20 font-mono text-sm opacity-60">
              Querying plan contracts and event logs...
            </div>
          ) : details ? (
            <>
              {/* Details Card */}
              <section id="details-card" className="relative bg-white border border-[#3A3A38]/20 p-10">
                <div className="corner-marker corner-tl"></div>
                <div className="corner-marker corner-tr"></div>
                <div className="corner-marker corner-bl"></div>
                <div className="corner-marker corner-br"></div>

                <div className="grid md:grid-cols-3 gap-8 pb-10 border-b border-[#3A3A38]/10">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                      Subscription Plan
                    </span>
                    <span className="font-space text-xl font-bold uppercase">
                      {details.name}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                      Price per Cycle
                    </span>
                    <span className="font-space text-xl font-bold uppercase text-[#1A3C2B]">
                      {details.price} {details.token}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                      Billing Interval
                    </span>
                    <span className="font-space text-xl font-bold uppercase">
                      {details.intervalDays} Days
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 pt-10">
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                      Target Network
                    </span>
                    <span className="font-mono text-sm font-bold uppercase tracking-tight">
                      {network === "arbitrum" ? "Arbitrum One" : "Base Network"}
                    </span>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                      Payout/Settlement Address
                    </span>
                    <span className="font-mono text-xs font-bold break-all">
                      {details.payoutAddress}
                    </span>
                  </div>
                </div>
              </section>

              {/* Action Band */}
              <section className="flex gap-4">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-forest text-white hover:opacity-90 font-mono text-xs font-bold uppercase tracking-widest py-4 rounded-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
                    {copied ? (
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    ) : (
                      <g strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </g>
                    )}
                  </svg>
                  {copied ? "Link Copied!" : "Copy Customer Checkout Link"}
                </button>
              </section>

              {/* On-Chain Metrics */}
              <section className="grid md:grid-cols-2 gap-8">
                {/* Metric 1 */}
                <div className="bg-white border border-[#3A3A38]/20 p-8 relative">
                  <div className="corner-marker corner-tl"></div>
                  <div className="corner-marker corner-tr"></div>
                  <div className="corner-marker corner-bl"></div>
                  <div className="corner-marker corner-br"></div>
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-1">
                    On-Chain Subscribers
                  </span>
                  <span className="font-space text-4xl font-bold text-forest">
                    {details.subscribersCount}
                  </span>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-[#3A3A38]/20 p-8 relative">
                  <div className="corner-marker corner-tl"></div>
                  <div className="corner-marker corner-tr"></div>
                  <div className="corner-marker corner-bl"></div>
                  <div className="corner-marker corner-br"></div>
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-1">
                    On-Chain Revenue Collected
                  </span>
                  <span className="font-space text-4xl font-bold text-forest">
                    {details.totalRevenue} {details.token}
                  </span>
                </div>
              </section>

              {/* Subscriber List */}
              <section className="bg-white border border-[#3A3A38]/20 p-8 relative">
                <div className="corner-marker corner-tl"></div>
                <div className="corner-marker corner-tr"></div>
                <div className="corner-marker corner-bl"></div>
                <div className="corner-marker corner-br"></div>

                <h3 className="font-space text-2xl font-bold mb-6 uppercase tracking-tight">Active Subscribers</h3>
                
                {details.subscribers.length === 0 ? (
                  <p className="font-mono text-[11px] opacity-40 py-4">No subscribers found on-chain yet.</p>
                ) : (
                  <div className="space-y-4">
                    {details.subscribers.map((sub, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 border-b border-[#3A3A38]/10 last:border-0">
                        <span className="font-mono text-xs font-bold text-forest">
                          {sub.address}
                        </span>
                        <span className="font-mono text-[10px] opacity-40">
                          Block #{sub.blockNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="text-center py-20 font-mono text-sm opacity-60">
              Plan not found.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
