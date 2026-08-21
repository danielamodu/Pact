import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export function DepositModal({ isOpen, onClose, address }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  // Escape to dismiss — a modal that can only be closed by hitting a small
  // target is a trap for anyone not using a mouse.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F241A]/50 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="ui-card max-w-lg w-full p-8 sm:p-10 relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#66756B] hover:text-forest hover:bg-[#F7F7F5] transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="font-space text-3xl font-bold text-forest tracking-tight">Add funds</h2>
        <p className="font-sans text-[17px] text-[#46564E] mt-1.5">
          Send to your Pact wallet below. Your balance updates automatically.
        </p>

        {/* What to send, and why */}
        <div className="mt-7 space-y-3">
          <div className="flex gap-4 items-start bg-[#F7F7F5] rounded-xl p-4">
            <span className="ui-pill ui-pill-neutral flex-shrink-0 font-mono">ETH</span>
            <p className="font-sans text-[15px] text-[#46564E] leading-relaxed">
              Covers network fees. You need a little to subscribe.
            </p>
          </div>
          <div className="flex gap-4 items-start bg-[#F7F7F5] rounded-xl p-4">
            <span className="ui-pill ui-pill-neutral flex-shrink-0 font-mono">USDC / USDT</span>
            <p className="font-sans text-[15px] text-[#46564E] leading-relaxed">
              Pays for the subscription itself, when a plan is priced in one.
            </p>
          </div>
        </div>

        {/* The address */}
        <div className="mt-6">
          <span className="font-sans text-sm text-[#66756B] block mb-2">Your wallet address</span>
          <div className="bg-[#F7F7F5] border border-[#3A3A38]/12 rounded-xl p-5">
            <p className="font-mono text-[15px] text-forest break-all leading-relaxed text-center">
              {address}
            </p>
          </div>
          <button onClick={handleCopy} className="ui-btn ui-btn-primary w-full mt-3">
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy address
              </>
            )}
          </button>
        </div>

        {/* The one thing that can actually lose money */}
        <div className="mt-6 flex gap-3 items-start bg-[#FF8C69]/8 border border-[#FF8C69]/25 rounded-xl p-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A33A17" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          <p className="font-sans text-[15px] text-[#8A3315] leading-relaxed">
            Only send on <strong className="font-semibold">Arbitrum One</strong> or{" "}
            <strong className="font-semibold">Base</strong>. Funds sent on another network can&apos;t be recovered.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
