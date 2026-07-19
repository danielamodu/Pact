"use client";

import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";
import { useAuth } from "@/contexts/AuthProvider";
import { useState, useEffect } from "react";
import { getUSDCBalance, getETHBalance, withdrawOnchain } from "@/lib/contracts";
import { ethers } from "ethers";

export default function BalanceRevealPage() {
  const { publicAddress } = useAuth();
  const [balances, setBalances] = useState({
    arbitrumUsdc: "0.00",
    arbitrumEth: "0.0000",
    baseUsdc: "0.00",
    baseEth: "0.0000"
  });
  const [loading, setLoading] = useState(true);
  
  const [ethPrice, setEthPrice] = useState<number>(3420); // Fallback price
  const [showUSDForEth, setShowUSDForEth] = useState<boolean>(false);

  // Withdrawal States
  const [selectedNetwork, setSelectedNetwork] = useState<"arbitrum" | "base">("arbitrum");
  const [selectedAsset, setSelectedAsset] = useState<"ETH" | "USDC">("ETH");
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEthPrice() {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        if (res.ok) {
          const data = await res.json();
          if (data.ethereum?.usd) {
            setEthPrice(data.ethereum.usd);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch ETH price, using fallback:", err);
      }
    }
    fetchEthPrice();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicAddress) return;
    setWithdrawing(true);
    setTxHash(null);
    setErrorMsg(null);

    try {
      let amountInUnits = "";
      if (selectedAsset === "ETH") {
        amountInUnits = ethers.parseEther(amount).toString();
      } else {
        amountInUnits = ethers.parseUnits(amount, 6).toString();
      }

      const hash = await withdrawOnchain(
        selectedNetwork,
        recipient,
        selectedAsset,
        amountInUnits
      );
      setTxHash(hash);
      setAmount("");
      
      // Update balances
      setTimeout(async () => {
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
      }, 5000);
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setErrorMsg(err.message || "An unexpected transaction error occurred.");
    } finally {
      setWithdrawing(false);
    }
  };

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
  const totalETHInUSD = (parseFloat(totalETH) * ethPrice).toFixed(2);

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
                <svg viewBox="0 0 400 400" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="290,44 380,200 290,356 110,356 20,200 110,44" fill="#0A1C3A" stroke="#A3D4F5" strokeWidth="24" strokeLinejoin="round"/><polygon points="120,310 180,120 220,120 160,310" fill="#FFFFFF"/><polygon points="180,310 240,120 280,120 220,310" fill="#FFFFFF"/><polygon points="280,120 340,310 300,310 250,160" fill="#28A0F0"/></svg>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Arbitrum</div>
            </div>

            {/* Base Icon Node */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-20">
              <div className="w-16 h-16 bg-white border border-[#1A3C2B] flex items-center justify-center p-3">
                <svg viewBox="0 0 400 400" className="w-8 h-8 text-[#0052FF]" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" rx="80" fill="currentColor"/></svg>
              </div>
              <div className="font-mono text-[9px] text-center mt-2 uppercase">Base</div>
            </div>

            {/* Connecting lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1/2 h-[1px] bg-gradient-to-l from-[#1A3C2B]/40 to-transparent absolute top-1/2 left-0 -translate-y-1/2"></div>
              <div className="w-1/2 h-[1px] bg-gradient-to-r from-[#1A3C2B]/40 to-transparent absolute top-1/2 right-0 -translate-y-1/2"></div>
            </div>

            {/* Center Balance Orb */}
            <div className="relative z-10 cursor-pointer select-none group" onClick={() => setShowUSDForEth(!showUSDForEth)} title="Click to toggle ETH/USD view">
              <div className="w-64 h-64 border border-[#1A3C2B] rounded-full flex flex-col items-center justify-center bg-[#F7F7F5] relative transition-transform duration-200 hover:scale-[1.02]">
                <div className="absolute inset-0 border border-dashed border-[#1A3C2B]/20 rounded-full animate-spin [animation-duration:30s]"></div>
                
                {/* Primary Asset Display */}
                <span className="font-space text-3xl font-bold text-[#1A3C2B] tracking-tighter transition-all duration-300">
                  {loading ? "..." : (showUSDForEth ? `$${totalETHInUSD}` : `${totalETH} ETH`)}
                </span>
                
                {/* Secondary Asset Display */}
                <span className="font-mono text-[10px] text-[#1A3C2B]/60 font-bold uppercase tracking-wider mt-1 transition-all duration-300">
                  {loading ? "..." : (showUSDForEth ? `≈ ${totalETH} ETH` : `≈ $${totalETHInUSD}`)}
                </span>

                <div className="w-12 h-[1px] bg-[#1A3C2B]/10 my-2"></div>
                
                {/* USDC Display */}
                <span className="font-space text-lg font-bold text-[#1A3C2B]/75 tracking-tighter">
                  {loading ? "..." : `${totalUSDC} USDC`}
                </span>
                
                <span className="font-mono text-[8px] tracking-widest uppercase mt-3 opacity-60">
                  Total Assets (Click to toggle)
                </span>
              </div>
            </div>
          </div>

          {/* Network breakdowns */}
          <div className="mt-16 space-y-4 max-w-xl mx-auto mb-16">
            <div className="flex items-center gap-6 p-4 border border-[#3A3A38]/10 bg-white/40">
              <svg viewBox="0 0 400 400" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="290,44 380,200 290,356 110,356 20,200 110,44" fill="#0A1C3A" stroke="#A3D4F5" strokeWidth="24" strokeLinejoin="round"/><polygon points="120,310 180,120 220,120 160,310" fill="#FFFFFF"/><polygon points="180,310 240,120 280,120 220,310" fill="#FFFFFF"/><polygon points="280,120 340,310 300,310 250,160" fill="#28A0F0"/></svg>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold">Arbitrum One</span>
                  <span className="font-mono text-xs font-bold">{loading ? "Scanning..." : `${balances.arbitrumEth} ETH ($${(parseFloat(balances.arbitrumEth) * ethPrice).toFixed(2)}) / ${balances.arbitrumUsdc} USDC`}</span>
                </div>
                <div className="h-1 bg-[#3A3A38]/5 w-full">
                  <div className="h-full bg-[#28A0F0]" style={{ width: `${Math.min(100, Math.max(0, ((parseFloat(balances.arbitrumEth) * 2000 + parseFloat(balances.arbitrumUsdc)) / ((parseFloat(totalETH) * 2000 + parseFloat(totalUSDC)) || 1)) * 100))}%` }}></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-4 border border-[#3A3A38]/10 bg-white/40">
              <svg viewBox="0 0 400 400" className="w-8 h-8 text-[#0052FF]" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" rx="80" fill="currentColor"/></svg>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold">Base Network</span>
                  <span className="font-mono text-xs font-bold">{loading ? "Scanning..." : `${balances.baseEth} ETH ($${(parseFloat(balances.baseEth) * ethPrice).toFixed(2)}) / ${balances.baseUsdc} USDC`}</span>
                </div>
                <div className="h-1 bg-[#3A3A38]/5 w-full">
                  <div className="h-full bg-[#0052FF]" style={{ width: `${Math.min(100, Math.max(0, ((parseFloat(balances.baseEth) * 2000 + parseFloat(balances.baseUsdc)) / ((parseFloat(totalETH) * 2000 + parseFloat(totalUSDC)) || 1)) * 100))}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal Section */}
          <section className="max-w-xl mx-auto mt-16 p-8 border border-[#3A3A38]/20 bg-white/50 relative">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="border-l-4 border-forest pl-4 mb-6">
              <h3 className="font-space text-2xl font-bold uppercase tracking-tight">Withdraw Funds</h3>
              <p className="font-mono text-[9px] tracking-widest uppercase opacity-50">Transfer assets out of your TEE secure account</p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              {txHash && (
                <div className="p-4 border border-mint bg-mint/5 text-forest font-mono text-[11px] break-all">
                  Withdrawal submitted! Transaction hash:
                  <a href={selectedNetwork === "arbitrum" ? `https://arbiscan.io/tx/${txHash}` : `https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="block text-coral hover:underline mt-1 font-bold">
                    {txHash}
                  </a>
                </div>
              )}
              {errorMsg && (
                <div className="p-4 border border-coral bg-coral/5 text-forest font-mono text-[11px]">
                  Error: {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[9px] tracking-wider uppercase opacity-60 mb-2">Network</label>
                  <select
                    value={selectedNetwork}
                    onChange={(e: any) => setSelectedNetwork(e.target.value)}
                    className="w-full bg-paper border border-[#3A3A38]/20 p-3 font-mono text-xs text-forest focus:outline-none"
                  >
                    <option value="arbitrum">Arbitrum One</option>
                    <option value="base">Base Network</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[9px] tracking-wider uppercase opacity-60 mb-2">Asset</label>
                  <select
                    value={selectedAsset}
                    onChange={(e: any) => setSelectedAsset(e.target.value)}
                    className="w-full bg-paper border border-[#3A3A38]/20 p-3 font-mono text-xs text-forest focus:outline-none"
                  >
                    <option value="ETH">ETH</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[9px] tracking-wider uppercase opacity-60 mb-2">Recipient Address (EVM)</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-paper border border-[#3A3A38]/20 p-3 font-mono text-xs text-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] tracking-wider uppercase opacity-60 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-paper border border-[#3A3A38]/20 p-3 pr-16 font-mono text-xs text-forest focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] opacity-50 uppercase">{selectedAsset}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={withdrawing}
                className="w-full bg-forest text-white font-mono text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {withdrawing ? "Processing Withdrawal..." : "Confirm Withdrawal"}
              </button>
            </form>
          </section>

        </section>
      </main>
    </div>
  );
}
