"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NavigationBar } from "@/components/NavigationBar";
import { getPlanDetails, getPullHistory, revokeOnchain, PullHistoryEntry } from "@/lib/contracts";
import { getSessionKeyDelegation, clearSessionKeyDelegation, isRevokedSessionKey } from "@/lib/sessionKey";
import { useAuth } from "@/contexts/AuthProvider";
import { ethers } from "ethers";

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") || "arbitrum") as "arbitrum" | "base";
  const { publicAddress } = useAuth();

  const [plan, setPlan] = useState<any>(null);
  const [delegationInfo, setDelegationInfo] = useState<any>(null);
  const [pullHistory, setPullHistory] = useState<PullHistoryEntry[]>([]);
  const [receipts, setReceipts] = useState<Array<{
    id: string; amount: string; token: string; txHash: string; createdAt: string; read: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeTxHash, setRevokeTxHash] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const planIdNum = parseInt(id);
        const fetchedPlan = await getPlanDetails(id, network);
        setPlan(fetchedPlan);

        const localDelegation = getSessionKeyDelegation(planIdNum);
        let resolved = localDelegation;

        // localStorage is per-device. Fall back to the server-side delegation store
        // so a cleared browser or a second device still sees the subscription.
        if (!localDelegation.delegation) {
          try {
            const res = await fetch(`/api/subscriptions?planId=${id}&network=${network}`);
            const json = await res.json();
            const remote = json.subscriptions?.[0];
            if (remote) {
              resolved = {
                privateKey: null,
                delegation: {
                  scope: {
                    sessionKeyAddress: remote.sessionKeyAddress,
                    recipient: remote.recipient,
                    maxAmount: BigInt(remote.maxAmount ?? 0),
                    token: remote.token,
                    interval: Number(remote.interval),
                    expiry: Number(remote.expiry),
                    planId: Number(remote.planId),
                  },
                  signature: "",
                },
              };
            }
          } catch (err) {
            console.warn("Could not recover delegation from server:", err);
          }
        }

        setDelegationInfo(resolved);

        if (isRevokedSessionKey(planIdNum) || !resolved.delegation) {
          setRevoked(true);
        }

        if (publicAddress) {
          const history = await getPullHistory(id, publicAddress, network);
          setPullHistory(history);

          try {
            const res = await fetch(`/api/notifications?subscriber=${publicAddress}`);
            const json = await res.json();
            if (json.notifications) {
              setReceipts(json.notifications.filter((n: any) => n.planId === id));
            }
          } catch (err) {
            console.warn("Could not load payment receipts:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load subscription details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, network, publicAddress]);

  const handleRevoke = async () => {
    const planIdNum = parseInt(id);
    const sessionKeyAddress = delegationInfo?.delegation?.scope?.sessionKeyAddress;

    if (!sessionKeyAddress) {
      setRevokeError("No active session key found for this subscription.");
      return;
    }

    setRevoking(true);
    setRevokeError(null);

    try {
      // 1. On-chain revocation is the authoritative step — it flips
      //    revokedSessionKeys[sessionKey] so executePull can never succeed again.
      const txHash = await revokeOnchain(network, sessionKeyAddress);
      setRevokeTxHash(txHash);

      // 2. Drop the delegation so the keeper stops attempting pulls entirely.
      try {
        await fetch("/api/keeper/store-delegation", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: id, network }),
        });
      } catch (err) {
        // On-chain revocation already blocks pulls, so this is not fatal.
        console.warn("Failed to remove delegation from keeper store:", err);
      }

      // 3. Only now clear local state — otherwise the UI would claim the
      //    subscription was cancelled while the keeper kept pulling.
      clearSessionKeyDelegation(planIdNum);
      setRevoked(true);
      setShowModal(false);
    } catch (err: any) {
      console.error("[Revoke] Failed:", err);
      setRevokeError(err?.message || "We couldn't cancel that — your subscription is still active. Please try again.");
    } finally {
      setRevoking(false);
    }
  };

  const formatAddr = (addr?: string) => {
    if (!addr || addr === ethers.ZeroAddress) return "—";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="app-ground"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <Link href="/wallet" className="font-sans text-sm text-[#66756B]">
                ← Back to Dashboard
              </Link>
              <h1 className="font-space text-5xl font-bold tracking-tighter leading-none text-forest">
                {plan ? plan.name : `Plan #${id}`}
              </h1>
              <p className="font-sans text-sm text-[#66756B]">
                Pact Subscription Session Detail ({network === "arbitrum" ? "Arbitrum One" : "Base Network"})
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 border px-3 py-1 ${
              revoked
                ? "border-coral/20 bg-coral/10 text-coral"
                : "border-[#1A3C2B]/20 bg-[#9EFFBF]/20 text-[#1A3C2B]"
            }`}>
              <div className={`w-2 h-2 rounded-full ${revoked ? "bg-coral" : "bg-[#1A3C2B]"}`}></div>
              <span className="font-sans text-sm text-[#66756B]">
                {revoked ? "Cancelled" : "Active"}
              </span>
            </div>
          </header>

          {loading ? (
            <div className="ui-card p-12 text-center font-mono text-sm opacity-60">
              Loading dynamic session details from chain...
            </div>
          ) : (
            <>
              {/* Details Card */}
              <section id="details-card" className="relative ui-card p-10">

                <div className="grid md:grid-cols-3 gap-8 pb-10 border-b border-[#3A3A38]/10">
                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Subscription Plan
                    </span>
                    <span className="font-space text-xl font-bold">
                      {plan?.name || `Plan #${id}`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Amount per Cycle
                    </span>
                    <span className="font-space text-xl font-bold text-[#1A3C2B]">
                      {plan ? `${plan.price} ${plan.token}` : "—"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Billing Interval
                    </span>
                    <span className="font-space text-xl font-bold">
                      {plan ? `${plan.intervalDays} Days` : "30 Days"}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 pt-10">
                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Most They Can Charge
                    </span>
                    <span className="font-mono text-sm font-bold uppercase tracking-tight">
                      {plan ? `${plan.price} ${plan.token}` : "—"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Merchant Payout Address
                    </span>
                    <span className="font-mono text-sm font-bold uppercase tracking-tight text-[#1A3C2B] truncate block">
                      {formatAddr(plan?.payoutAddress)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      On-Chain Status
                    </span>
                    <span className="font-mono text-sm font-bold uppercase tracking-tight">
                      {plan?.active ? "Active Plan" : "Paused"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Session Details */}
              <section id="permission-terms" className="ui-card p-8 border-l-4 border-l-forest">
                <h3 className="font-space text-2xl font-bold mb-4">
                  What You Approved
                </h3>
                <p className="font-sans text-lg text-[#3A3A38]/80 leading-relaxed mb-10">
                  This merchant can charge up to {plan?.price} {plan?.token} every {plan?.intervalDays} days — nothing more, nothing sooner. Cancel anytime.
                </p>

                <div className="grid md:grid-cols-3 gap-8 border-t border-[#3A3A38]/10 pt-8">
                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Payment Key
                    </span>
                    <span className="font-sans text-sm text-[#66756B]">
                      {formatAddr(delegationInfo?.delegation?.scope?.sessionKeyAddress)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Charges Every
                    </span>
                    <span className="font-sans text-sm text-[#66756B]">
                      {plan?.intervalDays} Days
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-sans text-sm text-[#66756B]">
                      Approval Expires
                    </span>
                    <span className="font-sans text-sm text-[#66756B]">
                      {revoked
                        ? "Cancelled"
                        : delegationInfo?.delegation?.scope?.expiry 
                          ? new Date(delegationInfo.delegation.scope.expiry * 1000).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "No Active Session"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Billing History */}
              <section id="billing-history" className="ui-card p-8">
                <div className="mb-8">
                  <h3 className="font-space text-2xl font-bold">Billing History</h3>
                  <p className="font-sans text-sm text-[#66756B]">
                    On-chain pull receipts — verified on {network === "arbitrum" ? "Arbitrum One" : "Base"}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="font-sans text-sm text-[#66756B]">
                      <tr>
                        <th className="pb-4 font-normal">Date</th>
                        <th className="pb-4 font-normal">Amount</th>
                        <th className="pb-4 font-normal">Status</th>
                        <th className="pb-4 font-normal">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {pullHistory.length > 0 ? (
                        pullHistory.map((entry) => (
                          <tr key={entry.txHash} className="hover:bg-[#F7F7F5] transition-colors border-b border-[#3A3A38]/10">
                            <td className="py-5">{entry.date}</td>
                            <td className="py-5 font-bold">{entry.amount} {entry.token}</td>
                            <td className="py-5">
                              <span className="bg-[#9EFFBF] text-[#1A3C2B] px-2 py-0.5 font-bold text-[9px]">
                                ✓ SETTLED
                              </span>
                            </td>
                            <td className="py-5">
                              <a
                                href={entry.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1A3C2B] underline underline-offset-2 hover:opacity-70 transition-opacity"
                              >
                                {entry.txHash.slice(0, 8)}...{entry.txHash.slice(-6)}
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-[#3A3A38]/40">
                            {loading ? "Loading on-chain history..." : "No pulls recorded yet — subscription is active and will execute automatically."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Keeper-issued payment receipts */}
              {receipts.length > 0 && (
                <section id="payment-receipts" className="ui-card p-8">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-space text-2xl font-bold">Payment Receipts</h3>
                      <p className="font-sans text-sm text-[#66756B]">
                        Recorded by the keeper at execution time
                      </p>
                    </div>
                    {receipts.some((r) => !r.read) && (
                      <button
                        onClick={async () => {
                          await fetch("/api/notifications", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ subscriber: publicAddress }),
                          });
                          setReceipts((prev) => prev.map((r) => ({ ...r, read: true })));
                        }}
                        className="font-sans text-sm text-[#66756B]"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-0">
                    {receipts.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-4 py-4 border-b border-[#3A3A38]/10 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {!r.read && <div className="w-2 h-2 rounded-full bg-coral flex-shrink-0"></div>}
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold block">
                              {r.amount} {r.token} charged
                            </span>
                            <span className="font-sans text-sm text-[#66756B] opacity-40">
                              {new Date(r.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <a
                          href={`${network === "arbitrum" ? "https://arbiscan.io" : "https://basescan.org"}/tx/${r.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-forest underline underline-offset-2 hover:opacity-70 flex-shrink-0"
                        >
                          {r.txHash.slice(0, 8)}...{r.txHash.slice(-6)} ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* On-chain revocation receipt */}
              {revokeTxHash && (
                <section className="ui-card p-8 border-l-4 border-l-mint space-y-2">
                  <h3 className="font-space text-xl font-bold text-forest tracking-tight">
                    Subscription Cancelled
                  </h3>
                  <p className="font-sans text-sm text-[#3A3A38]/70">
                    Confirmed on-chain — this merchant can no longer charge you.
                  </p>
                  <a
                    href={`${network === "arbitrum" ? "https://arbiscan.io" : "https://basescan.org"}/tx/${revokeTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-forest underline underline-offset-2 break-all inline-block pt-1"
                  >
                    {revokeTxHash} ↗
                  </a>
                </section>
              )}

              {/* Revoke Section */}
              {!revoked && (
                <section id="revoke-access" className="ui-card p-8 border-l-4 border-l-coral">
                  <div className="max-w-xl space-y-4">
                    <h3 className="font-space text-2xl font-bold text-[#FF8C69]">
                      Cancel This Subscription
                    </h3>
                    <p className="font-sans text-lg text-[#3A3A38]/80">
                      This merchant will immediately lose the ability to charge you. It's instant and free.
                    </p>
                    <div className="flex gap-3 bg-[#F4D35E]/10 border border-[#F4D35E]/40 p-4 rounded-sm">
                      <span className="text-[#a8820a] flex-shrink-0 font-bold">!</span>
                      <p className="font-sans text-sm text-[#3A3A38]/80 leading-relaxed">
                        <strong className="font-bold">This also pauses your other Pact subscriptions.</strong>{" "}
                        Cancelling resets the security counter on your account, which safely stops every
                        other subscription too — nothing can be charged without your say-so. You'll just
                        need to re-approve the ones you want to keep.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={() => setShowModal(true)}
                        id="revoke-access-btn"
                        className="w-full max-w-md bg-[#FF8C69] text-white font-sans text-sm text-[#66756B]"
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Revocation Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="ui-card w-full max-w-md p-8">
            <h4 className="font-space text-xl font-bold text-forest tracking-tight mb-4">
              Are you sure?
            </h4>
            <p className="font-sans text-sm text-[#3A3A38]/70 leading-relaxed mb-4">
              We'll record this on-chain. Once it confirms, this merchant permanently loses the ability to charge you.
            </p>

            <div className="bg-gold/10 border border-gold/30 p-4 mb-6">
              <p className="font-sans text-sm text-[#66756B]">
                Your other subscriptions pause too
              </p>
              <p className="font-sans text-xs text-[#3A3A38]/70 leading-relaxed">
                Cancelling resets the security counter on your account, which safely stops every other
                Pact subscription as well. Nothing can be charged without your approval — you&apos;ll just
                need to re-approve the ones you want to keep.
              </p>
            </div>

            {revokeError && (
              <div className="border border-coral bg-coral/5 p-4 mb-6">
                <p className="font-sans text-sm text-[#66756B]">
                  Couldn&apos;t Cancel
                </p>
                <p className="font-mono text-[10px] text-[#3A3A38] break-words">{revokeError}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex-1 bg-coral text-white font-sans text-sm text-[#66756B]"
              >
                {revoking ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cancelling
                  </>
                ) : (
                  "Yes, Cancel"
                )}
              </button>
              <button
                onClick={() => { setShowModal(false); setRevokeError(null); }}
                disabled={revoking}
                className="flex-1 border border-[#3A3A38]/20 text-forest font-sans text-sm text-[#66756B]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
