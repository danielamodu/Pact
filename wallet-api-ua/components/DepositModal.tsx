import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  /** Which Pact network the funds are needed on. */
  network?: "arbitrum" | "base";
}

const SOURCES = [
  { key: "ethereum", label: "Ethereum" },
  { key: "base", label: "Base" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "polygon", label: "Polygon" },
  { key: "optimism", label: "Optimism" },
];

type Step = "choose" | "send" | "done";

export function DepositModal({ isOpen, onClose, address, network = "arbitrum" }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Cross-chain funding state
  const [step, setStep] = useState<Step>("choose");
  const [destAsset, setDestAsset] = useState<"native" | "usdc">("native");
  const [sourceChain, setSourceChain] = useState("base");
  const [sourceAsset, setSourceAsset] = useState<"usdc" | "native">("usdc");
  const [amount, setAmount] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<string | null>(null);
  const [fees, setFees] = useState<Array<{ kind: string; amount: string; currency: string }>>([]);
  const [session, setSession] = useState<{ id: string; clientSecret: string } | null>(null);
  // null = unknown until first attempt; false = deployment has no funding key,
  // so the modal quietly stays on the plain deposit-address flow.
  const [fundingAvailable, setFundingAvailable] = useState<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  // Reset when reopened so a previous session never leaks into a new deposit.
  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setReceiver(null);
      setSession(null);
      setError(null);
      setFees([]);
    }
  }, [isOpen]);

  // Poll for settlement while the user is sending funds.
  useEffect(() => {
    if (step !== "send" || !session) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/funding?id=${session.id}&clientSecret=${encodeURIComponent(session.clientSecret)}`
        );
        const j = await res.json();
        if (j.status === "succeeded") {
          setStep("done");
          clearInterval(timer);
        } else if (j.status === "bounced" || j.status === "expired") {
          setError(
            j.status === "bounced"
              ? "That deposit was returned — it may have been below the minimum."
              : "This deposit window expired. Start again to get a fresh address."
          );
          setStep("choose");
          clearInterval(timer);
        }
      } catch { /* transient — keep polling */ }
    }, 6000);
    return () => clearInterval(timer);
  }, [step, session]);

  if (!isOpen || !mounted) return null;

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
  };

  const startFunding = async () => {
    setBusy(true);
    setError(null);
    try {
      const createRes = await fetch("/api/funding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", address, network, asset: destAsset }),
      });
      const created = await createRes.json();

      if (created.available === false) {
        setFundingAvailable(false);
        return;
      }
      if (!createRes.ok) throw new Error(created.error || "Could not start funding.");

      // USDC and most stables are 6dp; native assets are 18dp.
      const decimals = sourceAsset === "usdc" ? 6 : 18;
      const base = BigInt(Math.round(parseFloat(amount || "0") * 10 ** Math.min(decimals, 6)));
      const scaled = decimals > 6 ? base * BigInt(10) ** BigInt(decimals - 6) : base;
      if (scaled <= BigInt(0)) throw new Error("Enter an amount greater than zero.");

      const actRes = await fetch("/api/funding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "activate",
          id: created.id,
          clientSecret: created.clientSecret,
          sourceChain,
          sourceAsset,
          amount: scaled.toString(),
        }),
      });
      const activated = await actRes.json();
      if (!actRes.ok) throw new Error(activated.error || "Could not create a deposit address.");

      setFundingAvailable(true);
      setSession({ id: created.id, clientSecret: created.clientSecret });
      setReceiver(activated.receiverAddress);
      setFees(activated.fees || []);
      setStep("send");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const networkLabel = network === "arbitrum" ? "Arbitrum" : "Base";

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A3C2B]/40 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-md w-full p-8 shadow-2xl relative cursor-default max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1A3C2B]/40 hover:text-[#1A3C2B] transition-colors"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="square" />
          </svg>
        </button>

        {/* ── Settled ─────────────────────────────────────────────────────── */}
        {step === "done" ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto bg-[#9EFFBF]/20 border border-[#1A3C2B]/20 rounded-full flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A3C2B" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="font-space text-2xl font-bold text-[#1A3C2B]">Funds received</h2>
            <p className="text-[#1A3C2B]/60 text-sm">
              Your Pact wallet has been topped up on {networkLabel}.
            </p>
            <button
              onClick={onClose}
              className="bg-[#1A3C2B] text-white px-6 py-3 text-xs font-bold font-space hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : step === "send" && receiver ? (
          /* ── Send to the minted deposit address ────────────────────────── */
          <>
            <h2 className="font-space text-2xl font-bold text-[#1A3C2B] mb-2">Send your deposit</h2>
            <p className="text-[#1A3C2B]/60 mb-6 text-sm">
              Send <strong>{amount} {sourceAsset === "usdc" ? "USDC" : "ETH"}</strong> on{" "}
              <strong>{SOURCES.find((s) => s.key === sourceChain)?.label}</strong> to the address below.
              It arrives in your Pact wallet on {networkLabel} automatically.
            </p>

            <div className="bg-[#F7F7F5] border border-[#1A3C2B]/10 p-5 flex flex-col items-center gap-3 mb-4">
              <span className="font-mono text-xs text-[#1A3C2B] font-bold break-all text-center">
                {receiver}
              </span>
              <button
                onClick={() => handleCopy(receiver)}
                className="bg-[#1A3C2B] text-white px-5 py-2 text-xs font-bold font-space hover:opacity-90 transition-opacity"
              >
                {copied ? "Copied" : "Copy Address"}
              </button>
            </div>

            {fees.length > 0 && (
              <div className="border border-[#1A3C2B]/10 p-3 mb-4 space-y-1">
                <p className="font-mono text-[9px] uppercase tracking-widest opacity-40">Fees</p>
                {fees.map((f, i) => (
                  <div key={i} className="flex justify-between font-mono text-[10px] opacity-70">
                    <span className="capitalize">{f.kind.replace(/([A-Z])/g, " $1")}</span>
                    <span>{f.amount}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-[#1A3C2B]/50 font-mono text-[10px] uppercase tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1A3C2B]/40 animate-pulse" />
              Waiting for your deposit
            </div>

            {error && (
              <p className="font-mono text-[10px] text-coral bg-coral/5 border border-coral/20 p-3 mb-3">{error}</p>
            )}

            <button
              onClick={() => { setStep("choose"); setReceiver(null); setSession(null); }}
              className="w-full border border-[#1A3C2B]/20 text-[#1A3C2B] py-2.5 text-xs font-bold font-space hover:bg-[#F7F7F5] transition-colors"
            >
              Start Over
            </button>
          </>
        ) : (
          /* ── Choose how to fund ────────────────────────────────────────── */
          <>
            <h2 className="font-space text-2xl font-bold text-[#1A3C2B] mb-2">Add Funds</h2>
            <p className="text-[#1A3C2B]/60 mb-6 text-sm">
              {fundingAvailable === false
                ? `Send ETH on Arbitrum or Base to your Pact wallet below.`
                : `Top up your Pact wallet from any chain — we'll convert and bridge it for you.`}
            </p>

            {fundingAvailable !== false && (
              <div className="space-y-5 mb-6">
                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-[#1A3C2B]/50 font-bold block">
                    I want to receive
                  </label>
                  <div className="flex gap-2">
                    {([["native", "ETH (for gas)"], ["usdc", "USDC"]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setDestAsset(key)}
                        className={`flex-1 py-2.5 border font-mono text-[10px] uppercase tracking-wider transition-colors ${
                          destAsset === key
                            ? "bg-[#1A3C2B] text-white border-[#1A3C2B]"
                            : "bg-white border-[#1A3C2B]/20 text-[#1A3C2B] hover:bg-[#F7F7F5]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-[#1A3C2B]/50 font-bold block">
                    Paying from
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sourceChain}
                      onChange={(e) => setSourceChain(e.target.value)}
                      className="flex-1 bg-[#F7F7F5] border border-[#1A3C2B]/20 p-2.5 font-mono text-[11px]"
                    >
                      {SOURCES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                    <select
                      value={sourceAsset}
                      onChange={(e) => setSourceAsset(e.target.value as "usdc" | "native")}
                      className="w-28 bg-[#F7F7F5] border border-[#1A3C2B]/20 p-2.5 font-mono text-[11px]"
                    >
                      <option value="usdc">USDC</option>
                      <option value="native">ETH</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest text-[#1A3C2B]/50 font-bold block">
                    Amount
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#F7F7F5] border border-[#1A3C2B]/20 p-2.5 font-mono text-sm"
                  />
                </div>

                {error && (
                  <p className="font-mono text-[10px] text-coral bg-coral/5 border border-coral/20 p-3">{error}</p>
                )}

                <button
                  onClick={startFunding}
                  disabled={busy}
                  className="w-full bg-[#1A3C2B] text-white py-3.5 text-xs font-bold font-space uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {busy ? "Preparing deposit…" : "Continue"}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#1A3C2B]/10" />
                  <span className="font-mono text-[9px] uppercase tracking-widest opacity-30">or send directly</span>
                  <div className="flex-1 h-px bg-[#1A3C2B]/10" />
                </div>
              </div>
            )}

            <div className="bg-[#F7F7F5] border border-[#1A3C2B]/10 p-5 flex flex-col items-center justify-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                Your Pact wallet
              </span>
              <span className="font-mono text-xs text-[#1A3C2B] font-bold break-all text-center">
                {address}
              </span>
              <button
                onClick={() => handleCopy(address)}
                className="border border-[#1A3C2B]/20 text-[#1A3C2B] px-5 py-2 text-xs font-bold font-space hover:bg-white transition-colors"
              >
                {copied ? "Copied" : "Copy Address"}
              </button>
            </div>

            <p className="text-center text-[#1A3C2B]/40 text-[10px] font-mono mt-4 leading-relaxed">
              Direct sends must be ETH on Arbitrum One or Base.
            </p>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
