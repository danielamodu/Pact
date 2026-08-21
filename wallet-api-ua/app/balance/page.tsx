"use client";

import { NavigationBar } from "@/components/NavigationBar";
import { DepositModal } from "@/components/DepositModal";
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
  const [depositOpen, setDepositOpen] = useState(false);

  const [ethPrice, setEthPrice] = useState<number>(3420); // Fallback price

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

  const [uaAssets, setUaAssets] = useState<any>(null);
  const [loadingUa, setLoadingUa] = useState<boolean>(false);

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

  useEffect(() => {
    async function fetchUaAssets() {
      if (!publicAddress) return;
      try {
        setLoadingUa(true);
        const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
        const projectClientKey = process.env.NEXT_PUBLIC_CLIENT_KEY;
        const projectAppUuid = process.env.NEXT_PUBLIC_APP_ID;

        if (!projectId || !projectClientKey || !projectAppUuid) {
          throw new Error("Missing Particle Network credentials in environment configuration.");
        }

        const { UniversalAccount } = await import("@particle-network/universal-account-sdk");
        const ua = new UniversalAccount({
          projectId,
          projectClientKey,
          projectAppUuid,
          ownerAddress: publicAddress,
          smartAccountOptions: {
            name: "UNIVERSAL",
            version: "1.0.3",
            ownerAddress: publicAddress,
            useEIP7702: true
          }
        });
        const assets = await ua.getPrimaryAssets();
        setUaAssets(assets);
      } catch (err: any) {
        console.error("Failed to query Particle assets:", err);
        setUaAssets(null);
      } finally {
        setLoadingUa(false);
      }
    }
    fetchUaAssets();
  }, [publicAddress]);

  const totalUSDC = (parseFloat(balances.arbitrumUsdc) + parseFloat(balances.baseUsdc)).toFixed(2);
  const totalETH = (parseFloat(balances.arbitrumEth) + parseFloat(balances.baseEth)).toFixed(5);
  const totalUsd = (parseFloat(totalETH) * ethPrice + parseFloat(totalUSDC)).toFixed(2);

  const networks = [
    {
      key: "arbitrum",
      label: "Arbitrum One",
      eth: balances.arbitrumEth,
      usdc: balances.arbitrumUsdc,
      color: "#28A0F0",
      icon: (
        <svg viewBox="0 0 400 400" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="290,44 380,200 290,356 110,356 20,200 110,44" fill="#0A1C3A" stroke="#A3D4F5" strokeWidth="24" strokeLinejoin="round"/><polygon points="120,310 180,120 220,120 160,310" fill="#FFFFFF"/><polygon points="180,310 240,120 280,120 220,310" fill="#FFFFFF"/><polygon points="280,120 340,310 300,310 250,160" fill="#28A0F0"/></svg>
      ),
    },
    {
      key: "base",
      label: "Base",
      eth: balances.baseEth,
      usdc: balances.baseUsdc,
      color: "#0052FF",
      icon: (
        <svg viewBox="0 0 400 400" className="w-7 h-7 text-[#0052FF]" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" rx="80" fill="currentColor"/></svg>
      ),
    },
  ];

  const grandTotal = parseFloat(totalETH) * ethPrice + parseFloat(totalUSDC);

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="balance" />

      <main className="flex-1 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-5">

          <div>
            <h1 className="font-space text-2xl font-bold tracking-tight text-forest">Balance</h1>
            <p className="font-sans text-[15px] text-[#46564E] mt-0.5">
              Your funds across Arbitrum and Base.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

            {/* ── Left: what you hold ─────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-6">

              <section className="bg-white border border-[#3A3A38]/15 p-6">
                <span className="font-sans text-[15px] text-[#56655C] block mb-1.5">Total balance</span>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <span className="font-space text-[42px] font-bold text-forest leading-none tracking-tight">
                      {loading ? "—" : `$${totalUsd}`}
                    </span>
                    {!loading && (
                      <p className="font-mono text-[11px] text-[#66756B] mt-2">
                        {totalETH} ETH · {totalUSDC} USDC
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setDepositOpen(true)}
                    className="bg-forest text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Add funds
                  </button>
                </div>

                {/* Per-network split */}
                <div className="mt-6 pt-5 border-t border-[#3A3A38]/10 space-y-4">
                  {networks.map((n) => {
                    const usd = parseFloat(n.eth) * ethPrice + parseFloat(n.usdc);
                    const pct = grandTotal > 0 ? (usd / grandTotal) * 100 : 0;
                    return (
                      <div key={n.key} className="flex items-center gap-4">
                        <div className="flex-shrink-0">{n.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-3 mb-1.5">
                            <span className="font-sans text-[15px] text-forest font-medium">{n.label}</span>
                            <span className="font-mono text-[11px] text-[#46564E]">
                              {loading ? "…" : `$${usd.toFixed(2)}`}
                              {!loading && (
                                <span className="text-[#66756B]"> · {n.eth} ETH · {n.usdc} USDC</span>
                              )}
                            </span>
                          </div>
                          <div className="h-1 bg-[#3A3A38]/8 w-full">
                            <div
                              className="h-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: n.color }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Particle — holdings beyond the two Pact networks */}
              <section className="bg-white border border-[#3A3A38]/15">
                <div className="flex justify-between items-start gap-4 px-6 py-4 border-b border-[#3A3A38]/10">
                  <div>
                    <h2 className="font-space text-lg font-bold text-forest">Across all your chains</h2>
                    <p className="font-sans text-[15px] text-[#46564E] mt-0.5">
                      Everything you hold, found by Particle Network.
                    </p>
                  </div>
                  <span className="bg-[#0052FF]/10 text-[#0052FF] font-mono text-[9px] uppercase tracking-wider px-2 py-1 font-bold border border-[#0052FF]/20 flex-shrink-0">
                    Particle
                  </span>
                </div>

                <div className="p-6">
                  {loadingUa ? (
                    <p className="font-sans text-[15px] text-[#66756B] py-2">Checking your other chains…</p>
                  ) : uaAssets ? (
                    <div className="space-y-5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-sans text-[15px] text-[#56655C]">Total across all chains</span>
                        <span className="font-space text-2xl font-bold text-forest">
                          ${uaAssets.totalAmountInUSD?.toFixed(2) || "0.00"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {uaAssets.assets?.map((asset: any, idx: number) => (
                          <div key={idx} className="bg-[#F7F7F5] p-3 border border-[#3A3A38]/10">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[#66756B] block mb-1">
                              {asset.tokenType}
                            </span>
                            <span className="font-space text-base font-bold text-forest block leading-none">
                              {asset.amount?.toFixed(asset.tokenType === "eth" ? 4 : 2)}
                            </span>
                            <span className="font-mono text-[10px] text-[#66756B] block mt-1">
                              ${asset.amountInUSD?.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="font-sans text-[15px] text-[#46564E] py-2">
                      Couldn&apos;t reach Particle right now. Your Arbitrum and Base balances above are unaffected.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* ── Right: move money out ───────────────────────────────────── */}
            <section className="lg:col-span-2 bg-white border border-[#3A3A38]/15 lg:sticky lg:top-20">
              <div className="px-6 py-4 border-b border-[#3A3A38]/10">
                <h2 className="font-space text-lg font-bold text-forest">Send funds</h2>
                <p className="font-sans text-[15px] text-[#46564E] mt-0.5">
                  Move money out of your Pact wallet.
                </p>
              </div>

              <form onSubmit={handleWithdraw} className="p-6 space-y-4">
                {txHash && (
                  <div className="p-3 border border-mint bg-mint/5 space-y-1">
                    <p className="font-sans text-sm text-forest font-medium">Sent</p>
                    <a
                      href={selectedNetwork === "arbitrum" ? `https://arbiscan.io/tx/${txHash}` : `https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-[13px] text-forest underline underline-offset-2 hover:text-coral break-all"
                    >
                      View receipt
                    </a>
                  </div>
                )}
                {errorMsg && (
                  <div className="p-3 border border-coral bg-coral/5">
                    <p className="font-sans text-[13px] text-forest break-words">{errorMsg}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans text-sm text-[#56655C] mb-2">Network</label>
                    <select
                      value={selectedNetwork}
                      onChange={(e: any) => setSelectedNetwork(e.target.value)}
                      className="w-full bg-[#F7F7F5] border border-[#3A3A38]/20 p-3 font-sans text-[15px] text-forest focus:outline-none focus:border-forest"
                    >
                      <option value="arbitrum">Arbitrum</option>
                      <option value="base">Base</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-sans text-sm text-[#56655C] mb-2">Asset</label>
                    <select
                      value={selectedAsset}
                      onChange={(e: any) => setSelectedAsset(e.target.value)}
                      className="w-full bg-[#F7F7F5] border border-[#3A3A38]/20 p-3 font-sans text-[15px] text-forest focus:outline-none focus:border-forest"
                    >
                      <option value="ETH">ETH</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-sm text-[#56655C] mb-2">Send to</label>
                  <input
                    type="text"
                    required
                    placeholder="0x…"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#3A3A38]/20 p-3 font-mono text-sm text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block font-sans text-sm text-[#56655C] mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#F7F7F5] border border-[#3A3A38]/20 p-3 pr-16 font-sans text-[15px] text-forest focus:outline-none focus:border-forest"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-[#66756B]">
                      {selectedAsset}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={withdrawing}
                  className="w-full bg-forest text-white text-[15px] font-semibold py-3.5 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {withdrawing ? "Sending…" : "Send"}
                </button>

                <p className="font-sans text-sm text-[#66756B] leading-relaxed">
                  Double-check the address — transfers can&apos;t be reversed.
                </p>
              </form>
            </section>
          </div>
        </div>
      </main>

      {publicAddress && (
        <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} address={publicAddress} />
      )}
    </div>
  );
}
