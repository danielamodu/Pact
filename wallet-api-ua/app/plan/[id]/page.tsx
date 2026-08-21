"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import { NavigationBar } from "@/components/NavigationBar";
import { getPlanDetails } from "@/lib/contracts";
import { useAuth } from "@/contexts/AuthProvider";
import { signData as signTeeData } from "@/lib/express-proxy";

// EIP-3009 TransferWithAuthorization types — kept local to the client bundle
// rather than imported from lib/openfort.ts, which pulls in the Node-only
// Openfort SDK and would break in the browser.
const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type SubStatus = {
  active: boolean;
  lastPull: string | null;
  nextPull: string | null;
  reason?: string;
};

export default function MerchantPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") as "arbitrum" | "base") || "arbitrum";
  const { publicAddress } = useAuth();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
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
  const [settlementTxHash, setSettlementTxHash] = useState<string | null>(null);
  const [settledBy, setSettledBy] = useState<"openfort" | "relayer" | null>(null);
  const [settlementNetwork, setSettlementNetwork] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Live billing position per subscriber, from the same public status endpoint
  // third-party apps use. Turns the subscriber list from a log dump into
  // "where is each person in their cycle right now".
  const [subStatuses, setSubStatuses] = useState<Record<string, SubStatus>>({});
  // Distinguishes "still loading" from "looked it up and got nothing", so a
  // failing status endpoint shows a neutral fallback instead of a spinner that
  // never resolves.
  const [statusesResolved, setStatusesResolved] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [savedWebhookUrl, setSavedWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  const handleUnlockInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      if (!publicAddress) throw new Error("Wallet not ready — please wait a moment and try again.");

      // 1. x402 challenge — ask the server what payment it requires (HTTP 402)
      const challengeRes = await fetch(`/api/insights/plan-health?planId=${id}&network=${network}`);
      if (challengeRes.status !== 402) {
        const j = await challengeRes.json().catch(() => ({}));
        throw new Error(j.error || "Expected a payment challenge from the server.");
      }
      const challenge = await challengeRes.json();
      const req = challenge.paymentRequirements;

      // 2. Build and sign an EIP-3009 TransferWithAuthorization from the
      // merchant's own Magic TEE wallet — this is a real payment authorization,
      // not a self-signed demo.
      const nowSeconds = Math.floor(Date.now() / 1000);
      const validAfter = nowSeconds - 600;
      const validBefore = nowSeconds + 300;
      const nonce = randomNonce();

      // Chain comes from the server's own payment requirements so the signed
      // domain always matches whatever network the route is configured for.
      const X402_CHAIN_IDS: Record<string, number> = { "base-sepolia": 84532, base: 8453 };
      const x402ChainId = X402_CHAIN_IDS[req.network];
      if (!x402ChainId) throw new Error(`Unsupported payment network: ${req.network}`);

      const domain = {
        name: req.extra?.name || "USD Coin",
        version: req.extra?.version || "2",
        chainId: x402ChainId,
        verifyingContract: req.asset,
      };
      const message = {
        from: publicAddress,
        to: req.payTo,
        value: BigInt(req.maxAmountRequired),
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce,
      };

      const hash = ethers.TypedDataEncoder.hash(domain, TRANSFER_WITH_AUTHORIZATION_TYPES, message);
      const sig = await signTeeData(hash, "ETH");
      const signature = ethers.Signature.from({ r: sig.r, s: sig.s, v: sig.v }).serialized;

      const payload = {
        x402Version: 2,
        scheme: "exact",
        network: req.network,
        payload: {
          signature,
          authorization: {
            from: publicAddress,
            to: req.payTo,
            value: req.maxAmountRequired,
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      };
      const encoded = btoa(JSON.stringify(payload));

      // 3. Retry with proof of payment — server verifies the signature, then
      // broadcasts transferWithAuthorization on-chain to actually settle it.
      const dataRes = await fetch(`/api/insights/plan-health?planId=${id}&network=${network}`, {
        headers: { "payment-signature": encoded }
      });
      const data = await dataRes.json();
      if (!dataRes.ok || !data.success) throw new Error(data.details || data.error || "Failed to fetch insights.");

      setInsightsData(data.data);
      setInsightsPayer(publicAddress);
      setSettlementTxHash(data.settlementTxHash || null);
      setSettledBy(data.settledBy || null);
      setSettlementNetwork(req.network);
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

  // Billing position is fetched after the plan renders so a slow or failing
  // status lookup degrades the subscriber rows rather than blocking the page.
  useEffect(() => {
    const subs = details?.subscribers;
    if (!subs?.length) return;
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        subs.map(async (s) => {
          try {
            const res = await fetch(
              `/api/v1/subscriptions/status?planId=${id}&subscriber=${s.address}&network=${network}`
            );
            if (!res.ok) return null;
            const j = await res.json();
            return [
              s.address.toLowerCase(),
              { active: !!j.active, lastPull: j.lastPull ?? null, nextPull: j.nextPull ?? null, reason: j.reason },
            ] as const;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setSubStatuses(Object.fromEntries(entries.filter(Boolean) as any));
      setStatusesResolved(true);
    })();

    return () => { cancelled = true; };
  }, [details, id, network]);

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

  // ── Billing rhythm ────────────────────────────────────────────────────────
  const DAY_MS = 86_400_000;
  const statusList = Object.values(subStatuses);

  // How far through its current billing cycle a subscriber is (0–1).
  function cycleProgress(s: SubStatus): number | null {
    if (!s.lastPull || !s.nextPull) return null;
    const start = new Date(s.lastPull).getTime();
    const end = new Date(s.nextPull).getTime();
    if (end <= start) return null;
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  }

  function relativeDays(days: number): string {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
  }

  // The plan's next money-in moment: soonest upcoming charge across subscribers.
  const upcoming = statusList
    .filter((s) => s.active && s.nextPull)
    .map((s) => ({ at: new Date(s.nextPull as string).getTime(), progress: cycleProgress(s) }))
    .sort((a, b) => a.at - b.at)[0];

  const daysUntilNextCharge =
    upcoming !== undefined ? Math.ceil((upcoming.at - Date.now()) / DAY_MS) : null;

  const activeCount = statusList.filter((s) => s.active).length;
  const subCount = details?.subscribers.length ?? 0;
  const awaitingFirstCharge = subCount > 0 && statusList.length > 0 && statusList.every((s) => !s.lastPull);

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-[1180px] mx-auto px-6 space-y-6">

          {loading ? (
            <div className="text-center py-32 font-mono text-sm opacity-40">Loading plan...</div>
          ) : details ? (
            <>
              {/* Plan Title + Action Buttons */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                  <Link href="/wallet" className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A38]/50 hover:text-forest flex items-center gap-1.5 mb-3">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Back to Dashboard
                  </Link>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="font-space text-4xl xl:text-5xl font-bold tracking-tighter leading-none text-forest uppercase">
                      {details.name}
                    </h1>
                    <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 self-center ${details.active ? "border-[#1A3C2B]/20 bg-[#9EFFBF]/20 text-[#1A3C2B]" : "border-gold/20 bg-gold/10 text-[#a8820a]"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${details.active ? "bg-[#1A3C2B]" : "bg-[#a8820a]"}`}></div>
                      <span className="font-mono text-[9px] tracking-widest uppercase font-bold">{details.active ? "Active" : "Paused"}</span>
                    </div>
                  </div>
                  <p className="font-mono text-[9px] uppercase opacity-30">{network === "arbitrum" ? "Arbitrum One" : "Base Mainnet"} · Plan #{id}</p>
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

              {/* ── Billing pulse: what this plan is actually doing right now ── */}
              <section className="relative bg-forest text-white p-8 sm:p-10">
                <div className="corner-marker corner-tl" style={{ background: "#9EFFBF" }}></div>
                <div className="corner-marker corner-tr" style={{ background: "#9EFFBF" }}></div>
                <div className="corner-marker corner-bl" style={{ background: "#9EFFBF" }}></div>
                <div className="corner-marker corner-br" style={{ background: "#9EFFBF" }}></div>

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 block mb-3">
                      {subCount === 0
                        ? "No subscribers yet"
                        : awaitingFirstCharge
                        ? "Awaiting first charge"
                        : daysUntilNextCharge !== null
                        ? "Next charge"
                        : "Subscribers"}
                    </span>

                    {subCount === 0 ? (
                      <>
                        <p className="font-space text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
                          Share your link to<br className="hidden sm:block" /> get your first subscriber
                        </p>
                        <p className="font-mono text-[10px] text-white/50 mt-3">
                          Payments start the moment someone subscribes — no action needed from you.
                        </p>
                      </>
                    ) : awaitingFirstCharge ? (
                      <>
                        <p className="font-space text-4xl sm:text-5xl font-bold leading-none tracking-tight">
                          {details.price} {details.token}
                        </p>
                        <p className="font-mono text-[10px] text-white/50 mt-3">
                          {activeCount} subscriber{activeCount === 1 ? "" : "s"} authorized · first pull runs automatically
                        </p>
                      </>
                    ) : daysUntilNextCharge !== null ? (
                      <>
                        <p className="font-space text-4xl sm:text-5xl font-bold leading-none tracking-tight capitalize">
                          {relativeDays(daysUntilNextCharge)}
                        </p>
                        <p className="font-mono text-[10px] text-white/50 mt-3">
                          {activeCount} active · {details.price} {details.token} every {details.intervalDays} days
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-space text-4xl sm:text-5xl font-bold leading-none tracking-tight">
                          {subCount} subscriber{subCount === 1 ? "" : "s"}
                        </p>
                        <p className="font-mono text-[10px] text-white/50 mt-3">
                          {statusesResolved
                            ? `${details.price} ${details.token} every ${details.intervalDays} days`
                            : "Loading billing schedule…"}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex gap-10 flex-shrink-0">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/40 block mb-1.5">Collected</span>
                      <span className="font-space text-2xl font-bold text-[#9EFFBF]">{details.totalRevenue} {details.token}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/40 block mb-1.5">Per cycle</span>
                      <span className="font-space text-2xl font-bold">{details.price} {details.token}</span>
                    </div>
                  </div>
                </div>

                {/* Cycle progress — only meaningful once a cycle is underway */}
                {upcoming?.progress != null && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="h-1 w-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#9EFFBF] transition-all duration-700"
                        style={{ width: `${Math.round(upcoming.progress * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 font-mono text-[9px] uppercase tracking-widest text-white/40">
                      <span>Cycle started</span>
                      <span>{Math.round(upcoming.progress * 100)}% elapsed</span>
                      <span>Charge</span>
                    </div>
                  </div>
                )}
              </section>

              {/* ── Subscribers + Insights ───────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Subscribers — each row shows real billing position */}
                <div className="bg-white border border-[#3A3A38]/15 relative">
                  <div className="corner-marker corner-tl"></div>
                  <div className="corner-marker corner-br"></div>
                  <div className="px-6 py-5 border-b border-[#3A3A38]/10 flex items-center justify-between">
                    <h3 className="font-space text-lg font-bold uppercase tracking-tight">Subscribers</h3>
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                      {subCount} on-chain
                    </span>
                  </div>
                  <div className="p-6">
                    {subCount === 0 ? (
                      <div className="py-10 text-center space-y-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest opacity-30">Nobody has subscribed yet</p>
                        <button
                          onClick={handleCopyLink}
                          className="font-mono text-[9px] uppercase tracking-widest text-forest border border-forest/20 px-4 py-2.5 hover:bg-forest hover:text-white transition-colors cursor-pointer"
                        >
                          {copied ? "Copied!" : "Copy subscribe link"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {details.subscribers.map((sub, idx) => {
                          const st = subStatuses[sub.address.toLowerCase()];
                          const progress = st ? cycleProgress(st) : null;
                          const days = st?.nextPull
                            ? Math.ceil((new Date(st.nextPull).getTime() - Date.now()) / DAY_MS)
                            : null;

                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex justify-between items-center gap-4">
                                <a
                                  href={`${explorerBase}/address/${sub.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs font-bold text-forest hover:text-coral transition-colors truncate"
                                >
                                  {sub.address.slice(0, 10)}…{sub.address.slice(-8)}
                                </a>
                                {st ? (
                                  <span className={`font-mono text-[9px] uppercase tracking-widest font-bold flex-shrink-0 flex items-center gap-1.5 ${st.active ? "text-forest" : "text-coral"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${st.active ? "bg-forest" : "bg-coral"}`} />
                                    {st.active ? "Active" : st.reason === "Payment overdue" ? "Overdue" : "Cancelled"}
                                  </span>
                                ) : statusesResolved ? (
                                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-30 flex-shrink-0">Subscribed</span>
                                ) : (
                                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-30 flex-shrink-0">Checking…</span>
                                )}
                              </div>

                              {progress != null ? (
                                <>
                                  <div className="h-[3px] w-full bg-[#3A3A38]/8 overflow-hidden">
                                    <div
                                      className="h-full bg-forest/70 transition-all duration-700"
                                      style={{ width: `${Math.round(progress * 100)}%` }}
                                    />
                                  </div>
                                  <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                                    Next charge {days !== null ? relativeDays(days) : "—"}
                                  </p>
                                </>
                              ) : (
                                <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                                  {st && !st.lastPull ? "Awaiting first charge" : `Joined at block #${sub.blockNumber}`}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Health Insights — real x402 settlement via EIP-3009 */}
                <div className="bg-white border border-[#3A3A38]/15 relative">
                  <div className="corner-marker corner-tl"></div>
                  <div className="corner-marker corner-br"></div>
                  <div className="flex justify-between items-start gap-4 px-6 py-5 border-b border-[#3A3A38]/10">
                    <div>
                      <h3 className="font-space text-lg font-bold uppercase tracking-tight">Plan Health Insights</h3>
                      <p className="font-mono text-[9px] uppercase opacity-40 mt-0.5">Pay-per-call analytics, settled on Base</p>
                    </div>
                    <div className="border border-[#1A3C2B]/10 bg-[#1A3C2B]/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-[#1A3C2B] font-bold flex-shrink-0">
                      0.05 USDC
                    </div>
                  </div>
                  <div className="p-6">
                    {!insightsData ? (
                      <div className="space-y-4">
                        <p className="font-sans text-sm text-[#3A3A38]/70 leading-relaxed">
                          Forecast MRR, churn, and lifetime value. You&apos;ll approve a 0.05 USDC payment with your own wallet, settled on-chain via x402.
                        </p>
                        <button onClick={handleUnlockInsights} disabled={loadingInsights} className="w-full bg-[#1A3C2B] text-white hover:opacity-90 font-mono text-[10px] font-bold uppercase tracking-widest py-3.5 rounded-sm transition-all cursor-pointer disabled:opacity-50">
                          {loadingInsights ? "Settling payment…" : "Unlock Insights"}
                        </button>
                        {insightsError && <p className="font-mono text-[10px] text-red-600 uppercase tracking-wider bg-red-50 border border-red-200/50 p-3">{insightsError}</p>}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-5">
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
                        </div>
                        {insightsData.fetchError && (
                          <p className="font-mono text-[9px] text-amber-700 bg-amber-50 border border-amber-200/50 p-2 uppercase tracking-wider">⚠ {insightsData.fetchError}</p>
                        )}
                        <div className="pt-4 border-t border-[#3A3A38]/10 space-y-1.5">
                          {settlementTxHash ? (
                            <a
                              href={`${settlementNetwork === "base-sepolia" ? "https://sepolia.basescan.org" : "https://basescan.org"}/tx/${settlementTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#1A3C2B] hover:text-coral transition-colors block"
                            >
                              {settledBy === "openfort"
                                ? "✓ Settled by Openfort backend wallet — view tx"
                                : "✓ Settled on-chain — view tx"}
                            </a>
                          ) : (
                            <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-[#1A3C2B]">✓ Payment verified</span>
                          )}
                          <span className="font-mono text-[9px] opacity-40 block">
                            Paid from {insightsPayer.slice(0, 10)}…{insightsPayer.slice(-6)} · {new Date(insightsData.unlockedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Share & Setup: touched once, so it stays out of the way ── */}
              <section className="bg-white border border-[#3A3A38]/15">
                <button
                  onClick={() => setSetupOpen((v) => !v)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F7F7F5] transition-colors text-left"
                >
                  <div>
                    <h3 className="font-space text-lg font-bold uppercase tracking-tight">Share &amp; Setup</h3>
                    <p className="font-mono text-[9px] uppercase opacity-40 mt-0.5">
                      Embed button · webhooks{savedWebhookUrl ? " (1 active)" : ""} · payout details
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-4 h-4 fill-none stroke-current stroke-2 flex-shrink-0 transition-transform ${setupOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {setupOpen && (
                  <div className="border-t border-[#3A3A38]/10 p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Plan config */}
                    <div className="space-y-5">
                      <h4 className="font-mono text-[9px] uppercase tracking-widest text-forest font-bold">Plan Details</h4>
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">Network</span>
                        <span className="font-mono text-sm font-bold uppercase">{network === "arbitrum" ? "Arbitrum One" : "Base Mainnet"}</span>
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

                    {/* Embed */}
                    <div className="space-y-4">
                      <h4 className="font-mono text-[9px] uppercase tracking-widest text-forest font-bold">Embed Button</h4>
                      <p className="font-mono text-[9px] opacity-40 leading-relaxed">Drop this on any website to let visitors subscribe directly.</p>
                      <div className="bg-[#F7F7F5] border border-[#3A3A38]/10 p-3 overflow-x-auto rounded-sm">
                        <code className="font-mono text-[9px] text-forest/60 whitespace-nowrap leading-relaxed">
                          {`<iframe src="${typeof window !== "undefined" ? window.location.origin : "https://www.pact.rest"}/embed/${id}?network=${network}" width="280" height="200" frameborder="0" scrolling="no"></iframe>`}
                        </code>
                      </div>
                      <button onClick={handleCopyEmbed} className="w-full bg-forest text-white font-mono text-[9px] font-bold uppercase tracking-widest py-3 rounded-sm hover:opacity-90 transition-opacity cursor-pointer">
                        {embedCopied ? "Copied!" : "Copy Embed Code"}
                      </button>
                    </div>

                    {/* Webhooks */}
                    <div className="space-y-4">
                      <h4 className="font-mono text-[9px] uppercase tracking-widest text-forest font-bold">Payment Notifications</h4>
                      <p className="font-mono text-[9px] opacity-40 leading-relaxed">We POST to your URL every time a payment succeeds.</p>
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
                          <p className="font-mono text-[9px] uppercase tracking-widest text-amber-700 font-bold">Save this secret — won&apos;t show again</p>
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
                )}
              </section>
            </>
          ) : (
            <div className="text-center py-32 font-mono text-sm opacity-40">Plan not found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
