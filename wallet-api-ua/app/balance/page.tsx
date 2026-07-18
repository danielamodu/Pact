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
            {/* Arbitrum Icon Node */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 z-20">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <iconify-icon icon="simple-icons:arbitrum" className="text-3xl text-[#28A0F0]"></iconify-icon>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Arbitrum</div>
            </div>

            {/* Base Icon Node */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-20">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <img src="https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.svg" alt="Base" className="w-8 h-8" />
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Base</div>
            </div>

            {/* Connecting lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1/2 h-[1px] bg-gradient-to-l from-[#1A3C2B]/40 to-transparent absolute top-1/2 left-0 -translate-y-1/2"></div>
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


        </section>
      </main>
    </div>
  );
}
