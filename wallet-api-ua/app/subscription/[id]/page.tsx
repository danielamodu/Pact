"use client";

import { useState, use } from "react";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showModal, setShowModal] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const handleRevoke = () => {
    setRevoked(true);
    setShowModal(false);
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
              {/* Back to Dashboard */}
              <Link href="/wallet" className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A38]/50 hover:text-forest flex items-center gap-2">
                <iconify-icon icon="lucide:arrow-left"></iconify-icon>
                Back to Dashboard
              </Link>
              <h1 className="font-space text-5xl font-bold tracking-tighter leading-none text-forest">
                LUME FINANCE
              </h1>
              <p className="font-mono text-[10px] uppercase opacity-40">
                Pact Subscription Session Detail
              </p>
            </div>

            <div className={`inline-flex items-center gap-2 border px-3 py-1 ${
              revoked
                ? "border-coral/20 bg-coral/10 text-coral"
                : "border-[#1A3C2B]/20 bg-[#9EFFBF]/20 text-[#1A3C2B]"
            }`}>
              <div className={`w-2 h-2 rounded-full ${revoked ? "bg-coral" : "bg-[#1A3C2B]"}`}></div>
              <span className="font-mono text-[10px] tracking-widest uppercase font-bold">
                {revoked ? "REVOKED" : "Active"}
              </span>
            </div>
          </header>

          {/* Details Card */}
          <section id="details-card" className="relative bg-white border border-[#3A3A38]/20 p-10">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="grid md:grid-cols-3 gap-8 pb-10 border-b border-[#3A3A38]/10">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Subscription Level
                </span>
                <span className="font-space text-xl font-bold uppercase">
                  Professional Plan
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Amount per Cycle
                </span>
                <span className="font-space text-xl font-bold uppercase text-[#1A3C2B]">
                  49.99 USDC
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Billing Interval
                </span>
                <span className="font-space text-xl font-bold uppercase">
                  Monthly (30 days)
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 pt-10">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Authorized Amount Cap
                </span>
                <span className="font-mono text-sm font-bold uppercase tracking-tight">
                  $49.99 USDC
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Next Billing Date
                </span>
                <span className="font-mono text-sm font-bold uppercase tracking-tight text-[#1A3C2B]">
                  {revoked ? "N/A" : "Nov 24, 2024"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Subscription Started
                </span>
                <span className="font-mono text-sm font-bold uppercase tracking-tight">
                  Sep 24, 2024
                </span>
              </div>
            </div>
          </section>

          {/* Session Details */}
          <section id="permission-terms" className="bg-white border border-[#3A3A38]/20 p-8 border-l-[4px] border-l-[#1A3C2B]">
            <h3 className="font-space text-2xl font-bold mb-4">
              Session Permission Details
            </h3>
            <p className="font-sans text-lg text-[#3A3A38]/80 leading-relaxed mb-10">
              Lume Finance can pull up to $49.99 USDC every 30 days. Nothing else. Revoke anytime.
            </p>

            <div className="grid md:grid-cols-3 gap-8 border-t border-[#3A3A38]/10 pt-8">
              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Session ID
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-tight">
                  0xA7c6f461...902
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Authorized Date
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-tight">
                  Sep 24, 2024
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block">
                  Valid Until
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-tight">
                  Jan 15, 2025
                </span>
              </div>
            </div>
          </section>

          {/* Billing History */}
          <section id="billing-history" className="bg-white border border-[#3A3A38]/20 p-8">
            <div className="mb-8">
              <h3 className="font-space text-2xl font-bold">Billing History</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-40 mt-1">
                All pulls for this subscription
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="font-mono text-[9px] uppercase tracking-widest opacity-40 border-b border-[#3A3A38]/20">
                  <tr>
                    <th className="pb-4 font-normal">Date</th>
                    <th className="pb-4 font-normal">Amount</th>
                    <th className="pb-4 font-normal">Status</th>
                    <th className="pb-4 font-normal">Transaction</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="hover:bg-[#F7F7F5] transition-colors border-b border-[#3A3A38]/10">
                    <td className="py-5">Oct 24, 2024</td>
                    <td className="py-5">49.99 USDC</td>
                    <td className="py-5">
                      <span className="bg-[#9EFFBF] text-[#1A3C2B] px-2 py-0.5 font-bold">
                        ✓ SUCCESS
                      </span>
                    </td>
                    <td className="py-5 text-[#1A3C2B] underline opacity-80">0x7b...3f2</td>
                  </tr>
                  <tr className="hover:bg-[#F7F7F5] transition-colors border-b border-[#3A3A38]/10">
                    <td className="py-5">Sep 24, 2024</td>
                    <td className="py-5">49.99 USDC</td>
                    <td className="py-5">
                      <span className="bg-[#9EFFBF] text-[#1A3C2B] px-2 py-0.5 font-bold">
                        ✓ SUCCESS
                      </span>
                    </td>
                    <td className="py-5 text-[#1A3C2B] underline opacity-80">0x4a...8e1</td>
                  </tr>
                  <tr className="hover:bg-[#F7F7F5] transition-colors border-b border-[#3A3A38]/10">
                    <td className="py-5">Aug 24, 2024</td>
                    <td className="py-5">49.99 USDC</td>
                    <td className="py-5">
                      <span className="bg-coral text-white px-2 py-0.5 font-bold">
                        ✗ DECLINED
                      </span>
                    </td>
                    <td className="py-5 opacity-30 tracking-widest">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Revoke Section */}
          {!revoked && (
            <section id="revoke-access" className="bg-[#FF8C69]/5 border border-[#3A3A38]/20 p-8 border-l-[4px] border-l-[#FF8C69]">
              <div className="max-w-xl space-y-4">
                <h3 className="font-space text-2xl font-bold text-[#FF8C69]">
                  Cancel This Subscription
                </h3>
                <p className="font-sans text-lg text-[#3A3A38]/80">
                  Once revoked, Lume Finance will no longer be able to pull funds. This action is immediate and permanent.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setShowModal(true)}
                    id="revoke-access-btn"
                    className="w-full max-w-md bg-[#FF8C69] text-white font-mono text-[10px] font-bold tracking-widest uppercase py-5 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Revocation Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="relative w-full max-w-md bg-[#F7F7F5] border border-[#3A3A38]/20 p-8 shadow-2xl">
            <h4 className="font-space text-xl font-bold text-forest uppercase tracking-tight mb-4">
              Are you sure?
            </h4>
            <p className="font-sans text-sm text-[#3A3A38]/70 leading-relaxed mb-8">
              This will permanently delete the on-chain session permission. The merchant will lose access to auto-settlement.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleRevoke}
                className="flex-1 bg-coral text-white font-mono text-[10px] tracking-widest uppercase py-4 hover:opacity-95 transition-opacity"
              >
                Yes, Revoke
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-[#3A3A38]/20 text-forest font-mono text-[10px] tracking-widest uppercase py-4 hover:bg-white transition-all"
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
