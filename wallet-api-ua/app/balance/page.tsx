"use client";

import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { useAuth } from "@/contexts/AuthProvider";
import { useState, useEffect } from "react";
import { getUSDCBalance, getETHBalance } from "@/lib/contracts";

export default function BalanceRevealPage() {
  const { publicAddress } = useAuth();
  const [balances, setBalances] = useState({
    arbitrumUsdc: "0.00",
    arbitrumEth: "0.0000",
    baseUsdc: "0.00",
    baseEth: "0.0000"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalances() {
      if (!publicAddress) return;
      setLoading(true);
      const [arbUsdc, baseUsdc, arbEth, baseEth] = await Promise.all([
        getUSDCBalance(publicAddress, "arbitrum"),
        getUSDCBalance(publicAddress, "base"),
        getETHBalance(publicAddress, "arbitrum"),
        getETHBalance(publicAddress, "base")
      ]);
      setBalances({
        arbitrumUsdc: arbUsdc,
        arbitrumEth: parseFloat(arbEth).toFixed(5),
        baseUsdc: baseUsdc,
        baseEth: parseFloat(baseEth).toFixed(5)
      });
      setLoading(false);
    }
    fetchBalances();
  }, [publicAddress]);

  const totalUSDC = (parseFloat(balances.arbitrumUsdc) + parseFloat(balances.baseUsdc)).toFixed(2);
  const totalETH = (parseFloat(balances.arbitrumEth) + parseFloat(balances.baseEth)).toFixed(5);

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 pt-24 pb-12">
        <section className="max-w-7xl mx-auto px-6 py-12">
          {/* Top Banner */}
          <div className="text-center mb-16">
            <h1 className="font-space text-5xl font-bold tracking-tighter leading-[0.9] text-[#1A3C2B] uppercase">
              Cross-Chain Liquidity Map
            </h1>
            <p className="font-sans text-[#3A3A38]/60 text-base mt-4 max-w-lg mx-auto">
              Unified credit score scanning across your connected EVM network layers.
            </p>
          </div>

          {/* Core Balance Wheel Visualizer */}
          <div className="relative w-80 h-80 mx-auto mb-20 flex items-center justify-center">
            {/* Ethereum Icon Node */}
            <div className="absolute top-0 left-0">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <iconify-icon icon="simple-icons:ethereum" className="text-3xl text-[#627EEA]"></iconify-icon>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Ethereum</div>
            </div>

            {/* Polygon Icon Node */}
            <div className="absolute top-0 right-0">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <iconify-icon icon="simple-icons:polygon" className="text-3xl text-[#8247E5]"></iconify-icon>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Polygon</div>
            </div>

            {/* Arbitrum Icon Node */}
            <div className="absolute bottom-0 left-0">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <iconify-icon icon="simple-icons:arbitrum" className="text-3xl text-[#28A0F0]"></iconify-icon>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Arbitrum</div>
            </div>

            {/* Base Icon Node */}
            <div className="absolute bottom-0 right-0">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <iconify-icon icon="simple-icons:base" className="text-3xl text-[#0052FF]"></iconify-icon>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Base</div>
            </div>

            {/* Connecting lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[1px] h-1/2 bg-gradient-to-t from-[#1A3C2B]/40 to-transparent absolute top-0 left-1/2 -translate-x-1/2"></div>
              <div className="w-1/2 h-[1px] bg-gradient-to-l from-[#1A3C2B]/40 to-transparent absolute top-1/2 left-0 -translate-y-1/2"></div>
              <div className="w-[1px] h-1/2 bg-gradient-to-b from-[#1A3C2B]/40 to-transparent absolute bottom-0 left-1/2 -translate-x-1/2"></div>
              <div className="w-1/2 h-[1px] bg-gradient-to-r from-[#1A3C2B]/40 to-transparent absolute top-1/2 right-0 -translate-y-1/2"></div>
            </div>

            {/* Center Balance Orb */}
            <div className="relative z-10">
              <div className="w-64 h-64 border border-[#1A3C2B] rounded-full flex flex-col items-center justify-center bg-[#F7F7F5] relative">
                <div className="absolute inset-0 border border-dashed border-[#1A3C2B]/20 rounded-full animate-spin [animation-duration:30s]"></div>
                <span className="font-space text-3xl font-bold text-[#1A3C2B] tracking-tighter">
                  {loading ? "..." : `${totalETH} ETH`}
                </span>
                <span className="font-space text-xl font-bold text-[#1A3C2B]/75 tracking-tighter mt-1">
                  {loading ? "..." : `${totalUSDC} USDC`}
                </span>
                <span className="font-mono text-[9px] tracking-widest uppercase mt-3 opacity-60">
                  Total Assets
                </span>
              </div>
            </div>
          </div>

          {/* Network breakdowns */}
          <div className="mt-16 space-y-4 max-w-xl mx-auto mb-16">
            <div className="flex items-center gap-6 p-4 border border-[#3A3A38]/10 bg-white/40">
              <iconify-icon icon="simple-icons:arbitrum" className="text-2xl text-[#28A0F0]"></iconify-icon>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold">Arbitrum One</span>
                  <span className="font-mono text-xs font-bold">{loading ? "Scanning..." : `${balances.arbitrumEth} ETH / ${balances.arbitrumUsdc} USDC`}</span>
                </div>
                <div className="h-1 bg-[#3A3A38]/5 w-full">
                  <div className="h-full bg-[#28A0F0]" style={{ width: `${Math.min(100, Math.max(0, ((parseFloat(balances.arbitrumEth) * 2000 + parseFloat(balances.arbitrumUsdc)) / ((parseFloat(totalETH) * 2000 + parseFloat(totalUSDC)) || 1)) * 100))}%` }}></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-4 border border-[#3A3A38]/10 bg-white/40">
              <iconify-icon icon="simple-icons:base" className="text-2xl text-[#0052FF]"></iconify-icon>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold">Base Network</span>
                  <span className="font-mono text-xs font-bold">{loading ? "Scanning..." : `${balances.baseEth} ETH / ${balances.baseUsdc} USDC`}</span>
                </div>
                <div className="h-1 bg-[#3A3A38]/5 w-full">
                  <div className="h-full bg-[#0052FF]" style={{ width: `${Math.min(100, Math.max(0, ((parseFloat(balances.baseEth) * 2000 + parseFloat(balances.baseUsdc)) / ((parseFloat(totalETH) * 2000 + parseFloat(totalUSDC)) || 1)) * 100))}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription details confirmation box */}
          <div className="max-w-[640px] mx-auto mb-16">
            <div className="relative border border-[#3A3A38]/20 bg-white/40 p-10">
              <div className="corner-marker corner-tl"></div>
              <div className="corner-marker corner-tr"></div>
              <div className="corner-marker corner-bl"></div>
              <div className="corner-marker corner-br"></div>

              <div className="flex justify-between items-center mb-10 pb-6 border-b border-[#3A3A38]/10">
                <h3 className="font-space text-2xl font-bold">Subscription Ready</h3>
                <div className={`inline-flex items-center gap-2 border px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest ${
                  (parseFloat(totalETH) > 0.0001 || parseFloat(totalUSDC) > 0) ? "border-[#9EFFBF] bg-[#9EFFBF]/10 text-[#1A3C2B]" : "border-coral bg-coral/10 text-coral"
                }`}>
                  <iconify-icon icon={(parseFloat(totalETH) > 0.0001 || parseFloat(totalUSDC) > 0) ? "lucide:check-circle" : "lucide:alert-triangle"}></iconify-icon>
                  {(parseFloat(totalETH) > 0.0001 || parseFloat(totalUSDC) > 0) ? "Sufficient Funds" : "Insufficient Funds"}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[9px] uppercase opacity-40 block mb-1">Merchant Entity</span>
                    <span className="font-space text-lg font-bold">Lume Finance</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase opacity-40 block mb-1">Billing Frequency</span>
                    <span className="font-space text-lg font-bold">Monthly Cycle</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[9px] uppercase opacity-40 block mb-1">Subscription Rate</span>
                    <span className="font-space text-lg font-bold text-[#1A3C2B]">49.99 USDC</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] uppercase opacity-40 block mb-1">Projected Runway</span>
                    <span className="font-space text-lg font-bold text-[#1A3C2B]">56 Months</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Link
              href="/wallet"
              id="cta-activate"
              className="w-full md:w-auto bg-[#1A3C2B] text-white font-mono text-[10px] tracking-[0.2em] uppercase px-12 py-5 rounded-sm hover:opacity-90 transition-opacity text-center cursor-pointer"
            >
              Activate Subscription
            </Link>
            <Link
              href="/permission"
              id="cta-review"
              className="w-full md:w-auto border border-[#3A3A38]/20 bg-white/50 font-mono text-[10px] tracking-[0.2em] uppercase px-12 py-5 rounded-sm hover:bg-white transition-colors text-center cursor-pointer"
            >
              Review Permissions
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
