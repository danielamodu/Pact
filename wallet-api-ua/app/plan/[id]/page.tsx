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
  const [embedCopied, setEmbedCopied] = useState(false);
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

  const [insightsData, setInsightsData] = useState<{
    isDemoData: boolean;
    activeSubscribers: number;
    mrr: number;
    churnRate: string;
    averageLtv: number;
    dailyPaymentsSucceeded: number;
    totalRevenue: string;
    token: string;
    unlockedAt: string;
    fetchError?: string | null;
  } | null>(null);
  const [insightsPayer, setInsightsPayer] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [savedWebhookUrl, setSavedWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  const handleUnlockInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const signRes = await fetch("/api/insights/plan-health/pay-signature", { method: "POST", headers: { "Content-Type": "application/json" } });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) throw new Error(signData.error || "Failed to generate payment signature.");

      const dataRes = await fetch(`/api/insights/plan-health?planId=${id}&network=${network}`, {
        headers: { "payment-signature": signData.paymentHeader }
      });
      const data = await dataRes.json();
      if (!dataRes.ok || !data.success) throw new Error(data.error || "Failed to fetch insights.");

      setInsightsData(data.data);
      setInsightsPayer(signData.payerAddress);
    } catch (err: any) {
      setInsightsError(err.message || "Unexpected error.");
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPlanDetails(id, network);
        setDetails(data);

        const whRes = await fetch(`/api/webhooks?planId=${id}&network=${network}`);
        const whJson = await whRes.json();
        if (whJson.webhookUrl) {
          setSavedWebhookUrl(whJson.webhookUrl);
          setWebhookUrl(whJson.webhookUrl);
        }
      } catch (err) {
        console.error("Failed to load plan details:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, network]);

  const handleCopyLink = () => {
    const checkoutUrl = `${window.location.origin}/subscribe?planId=${id}&network=${network}`;
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="${window.location.origin}/embed/${id}?network=${network}" width="280" height="200" frameborder="0" scrolling="no"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl) return;
    setSavingWebhook(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: id, network, webhookUrl }),
      });
      const json = await res.json();
      if (res.ok) {
        setSavedWebhookUrl(webhookUrl);
        setWebhookSaved(true);
        if (json.webhookSecret) setWebhookSecret(json.webhookSecret);
        setTimeout(() => setWebhookSaved(false), 3000);
      }
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleRemoveWebhook = async () => {
    await fetch("/api/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: id, network }),
    });
    setSavedWebhookUrl("");
    setWebhookUrl("");
  };

  const explorerBase = network === "arbitrum" ? "https://arbiscan.io" : "https://basescan.org";

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-20 pb-12">
        {/* Dashboard Header Bar */}
        <div className="border-b border-[#3A3A38]/10 bg-white/60 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-4">
              <Link href="/wallet" className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A38]/50 hover:text-forest flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Dashboard
              </Link>
              <span className="text-[#3A3A38]/20 text-xs">/</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-forest font-bold">
                {loading ? "Loading..." : details?.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                {network === "arbitrum" ? "Arbitrum One" : "Base Mainnet"} · Plan #{id}
              </span>
              {!loading && details && (
                <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 ${details.active ? "border-[#1A3C2B]/20 bg-[#9EFFBF]/20 text-[#1A3C2B]" : "border-gold/20 bg-gold/10 text-[#a8820a]"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${details.active ? "bg-[#1A3C2B]" : "bg-[#a8820a]"}`}></div>
                  <span className="font-mono text-[9px] tracking-widest uppercase font-bold">{details.active ? "Active" : "Paused"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 pt-8 space-y-6">

          {loading ? (
            <div className="text-center py-32 font-mono text-sm opacity-40">Querying plan contracts...</div>
          ) : details ? (
            <>
              {/* Plan Title + Action Buttons */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                  <h1 className="font-space text-4xl xl:text-5xl font-bold tracking-tighter leading-none text-forest uppercase">
                    {details.name}
                  </h1>
                  <p className="font-mono text-[9px] uppercase opacity-30 mt-2">Pact Merchant Plan</p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button onClick={handleCopyLink} className="bg-forest text-white hover:opacity-90 font-mono text-[9px] font-bold uppercase tracking-widest px-5 py-3 rounded-sm transition-all cursor-pointer flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                      {copied ? <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/> : <g strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></g>}
                    </svg>
                    {copied ? "Copied!" : "Copy Subscribe Link"}
                  </button>
                  <button onClick={handleCopyEmbed} className="border border-[#3A3A38]/20 bg-white text-forest hover:bg-[#F7F7F5] font-mono text-[9px] font-bold uppercase tracking-widest px-5 py-3 rounded-sm transition-all cursor-pointer flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2"><polyline points="16 18 22 12 16 6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="8 6 2 12 8 18" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {embedCopied ? "Copied!" : "Embed Code"}
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Active Subscribers", value: String(details.subscribersCount), accent: true },
                  { label: "Price / Cycle", value: `${details.price} ${details.token}`, accent: false },
                  { label: "Billing Interval", value: `${details.intervalDays} days`, accent: false },
                  { label: "Total Revenue", value: `${details.totalRevenue} ${details.token}`, accent: false },
                ].map(({ label, value, accent }) => (
                  <div key={label} className={`relative p-6 border ${accent ? "bg-forest text-white border-forest" : "bg-white border-[#3A3A38]/15"}`}>
                    <div className="corner-marker corner-tl" style={accent ? { background: "#9EFFBF" } : {}}></div>
                    <div className="corner-marker corner-br" style={accent ? { background: "#9EFFBF" } : {}}></div>
                    <span className={`font-mono text-[9px] uppercase tracking-widest block mb-2 ${accent ? "text-white/50" : "opacity-40"}`}>{label}</span>
                    <span className={`font-space text-2xl xl:text-3xl font-bold leading-none ${accent ? "text-white" : "text-forest"}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column — 2/3 width */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Plan Health Insights — x402 Openfort integration */}
                  <div className="bg-white border border-[#3A3A38]/15 relative">
                    <div className="corner-marker corner-tl"></div>
                    <div className="corner-marker corner-tr"></div>
                    <div className="corner-marker corner-bl"></div>
                    <div className="corner-marker corner-br"></div>
                    <div className="flex justify-between items-center px-6 py-5 border-b border-[#3A3A38]/10">
                      <div>
                        <h3 className="font-space text-lg font-bold uppercase tracking-tight">Plan Health Insights</h3>
                        <p className="font-mono text-[9px] uppercase opacity-40 mt-0.5">Powered by Openfort Backend Wallets & x402 Micropayments</p>
                      </div>
                      <div className="border border-[#1A3C2B]/10 bg-[#1A3C2B]/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[#1A3C2B] font-bold flex-shrink-0">
                        0.05 USDC / Call
                      </div>
                    </div>
                    <div className="p-6">
                      {!insightsData ? (
                        <div className="space-y-4">
                          <p className="font-sans text-sm text-[#3A3A38]/70 leading-relaxed">
                            Unlock advanced analytics — MRR forecasting, churn rate, LTV, and payment success rates — via a secure EIP-3009 payment signed automatically by your Openfort backend wallet.
                          </p>
                          <button onClick={handleUnlockInsights} disabled={loadingInsights} className="bg-[#1A3C2B] text-white hover:opacity-90 font-mono text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-sm transition-all cursor-pointer disabled:opacity-50">
                            {loadingInsights ? "PROCESSING X402 PAYMENT..." : "UNLOCK INSIGHTS WITH X402"}
                          </button>
                          {insightsError && <p className="font-mono text-[10px] text-red-600 uppercase tracking-wider bg-red-50 border border-red-200/50 p-3">Error: {insightsError}</p>}
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                            <div className="space-y-1">
                              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Forecasted MRR</span>
                              <span className="font-space text-2xl font-bold text-[#1A3C2B]">${insightsData.mrr}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Churn Rate</span>
                              <span className="font-space text-2xl font-bold text-red-600">{insightsData.churnRate}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Average LTV</span>
                              <span className="font-space text-2xl font-bold">${insightsData.averageLtv}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Payments Succeeded</span>
                              <span className="font-space text-2xl font-bold text-green-600">{insightsData.dailyPaymentsSucceeded}</span>
                            </div>
                            <div className="space-y-1 col-span-2">
                              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Payer Wallet (Openfort)</span>
                              <span className="font-mono text-[10px] font-bold break-all opacity-70">{insightsPayer}</span>
                            </div>
                          </div>
                          {insightsData.fetchError && (
                            <p className="font-mono text-[9px] text-amber-700 bg-amber-50 border border-amber-200/50 p-2 uppercase tracking-wider">⚠ {insightsData.fetchError}</p>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-[#3A3A38]/10">
                            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#1A3C2B]">✓ x402 Payment Verified Off-Chain</span>
                            <span className="font-mono text-[9px] opacity-40">Unlocked: {new Date(insightsData.unlockedAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Subscribers */}
                  <div className="bg-white border border-[#3A3A38]/15 relative">
                    <div className="corner-marker corner-tl"></div>
                    <div className="corner-marker corner-tr"></div>
                    <div className="corner-marker corner-bl"></div>
                    <div className="corner-marker corner-br"></div>
                    <div className="px-6 py-5 border-b border-[#3A3A38]/10 flex items-center justify-between">
                      <h3 className="font-space text-lg font-bold uppercase tracking-tight">Active Subscribers</h3>
                      <span className="font-mono text-[9px] uppercase tracking-widest opacity-40">{details.subscribers.length} on-chain</span>
                    </div>
                    <div className="p-6">
                      {details.subscribers.length === 0 ? (
                        <p className="font-mono text-[11px] opacity-40 py-4">No subscribers found on-chain yet.</p>
                      ) : (
                        <div className="space-y-0">
                          {details.subscribers.map((sub, idx) => (
                            <div key={idx} className="flex justify-between items-center py-3 border-b border-[#3A3A38]/8 last:border-0 gap-4">
                              <a href={`${explorerBase}/address/${sub.address}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-bold text-forest hover:text-coral transition-colors truncate">
                                {sub.address}
                              </a>
                              <span className="font-mono text-[9px] opacity-40 flex-shrink-0">Block #{sub.blockNumber}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Sidebar — 1/3 width */}
                <div className="space-y-6">

                  {/* Plan Configuration */}
                  <div className="bg-white border border-[#3A3A38]/15 relative">
                    <div className="corner-marker corner-tl"></div>
                    <div className="corner-marker corner-br"></div>
                    <div className="px-6 py-5 border-b border-[#3A3A38]/10">
                      <h3 className="font-space text-lg font-bold uppercase tracking-tight">Plan Config</h3>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Network</span>
                        <span className="font-mono text-sm font-bold uppercase">{network === "arbitrum" ? "Arbitrum One" : "Base Network"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Token</span>
                        <span className="font-mono text-sm font-bold uppercase">{details.token}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Payout Address</span>
                        <a href={`${explorerBase}/address/${details.payoutAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] font-bold break-all text-forest hover:text-coral transition-colors leading-relaxed">
                          {details.payoutAddress}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Embed Widget */}
                  <div className="bg-white border border-[#3A3A38]/15">
                    <div className="px-6 py-5 border-b border-[#3A3A38]/10">
                      <h3 className="font-space text-lg font-bold uppercase tracking-tight">Embed Button</h3>
                      <p className="font-mono text-[9px] uppercase opacity-40 mt-0.5">Drop on any website</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="bg-[#F7F7F5] border border-[#3A3A38]/10 p-3 overflow-x-auto rounded-sm">
                        <code className="font-mono text-[9px] text-forest/60 whitespace-nowrap leading-relaxed">
                          {`<iframe src="${typeof window !== "undefined" ? window.location.origin : "https://pactxbt.vercel.app"}/embed/${id}?network=${network}" width="280" height="200" frameborder="0" scrolling="no"></iframe>`}
                        </code>
                      </div>
                      <button onClick={handleCopyEmbed} className="w-full bg-forest text-white font-mono text-[9px] font-bold uppercase tracking-widest py-3 rounded-sm hover:opacity-90 transition-opacity cursor-pointer">
                        {embedCopied ? "Copied!" : "Copy Embed Code"}
                      </button>
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div className="bg-white border-l-4 border-l-forest border border-[#3A3A38]/15">
                    <div className="px-6 py-5 border-b border-[#3A3A38]/10">
                      <h3 className="font-space text-lg font-bold uppercase tracking-tight">Webhook Notifications</h3>
                      <p className="font-mono text-[9px] uppercase opacity-40 mt-0.5">POSTed on every successful pull</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {savedWebhookUrl && (
                        <div className="flex items-center gap-2 bg-[#9EFFBF]/10 border border-[#1A3C2B]/20 p-3 rounded-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1A3C2B] flex-shrink-0"></div>
                          <span className="font-mono text-[9px] break-all flex-1">{savedWebhookUrl}</span>
                          <button onClick={handleRemoveWebhook} className="font-mono text-[9px] text-coral uppercase tracking-widest hover:opacity-70 flex-shrink-0">✕</button>
                        </div>
                      )}
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://yoursite.com/webhooks/pact"
                        className="w-full bg-[#F7F7F5] border border-[#3A3A38]/20 p-3 font-mono text-[10px] placeholder:opacity-30 rounded-sm"
                      />
                      <button
                        onClick={handleSaveWebhook}
                        disabled={savingWebhook || !webhookUrl}
                        className="w-full bg-forest text-white font-mono text-[9px] font-bold uppercase tracking-widest py-3 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
                      >
                        {savingWebhook ? "Saving..." : webhookSaved ? "Saved!" : "Save Webhook"}
                      </button>
                      {webhookSecret && (
                        <div className="bg-amber-50 border border-amber-200 p-4 space-y-2 rounded-sm">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-amber-700 font-bold">Save this secret — won't show again</p>
                          <code className="font-mono text-[10px] text-amber-900 break-all block select-all">{webhookSecret}</code>
                          <p className="font-mono text-[9px] opacity-60">Verify <code>X-Pact-Signature</code> headers.</p>
                        </div>
                      )}
                      <div className="bg-[#F7F7F5] border border-[#3A3A38]/10 p-3 rounded-sm space-y-1">
                        <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">Payload</p>
                        <code className="font-mono text-[9px] opacity-60 block leading-relaxed">{`{ event, planId, network, subscriber, amount, txHash, timestamp }`}</code>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-32 font-mono text-sm opacity-40">Plan not found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
