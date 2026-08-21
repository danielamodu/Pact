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

  if (!isOpen || !mounted) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1A3C2B]/40 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white max-w-md w-full p-8 shadow-2xl relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#1A3C2B]/40 hover:text-[#1A3C2B] transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="square"/>
          </svg>
        </button>

        <h2 className="font-space text-2xl font-bold text-[#1A3C2B] mb-2">Add Funds</h2>
        <p className="text-[#1A3C2B]/60 mb-4 text-sm">
          Send to your Pact wallet below and your balance updates automatically.
        </p>
        <div className="border border-[#1A3C2B]/10 bg-[#F7F7F5] p-4 mb-6 space-y-2">
          <div className="flex gap-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#1A3C2B]/40 w-14 flex-shrink-0 pt-0.5">ETH</span>
            <span className="text-[#1A3C2B]/70 text-xs leading-relaxed">Covers network fees — you need a little to subscribe.</span>
          </div>
          <div className="flex gap-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#1A3C2B]/40 w-14 flex-shrink-0 pt-0.5">USDC<br/>USDT</span>
            <span className="text-[#1A3C2B]/70 text-xs leading-relaxed">Pays for the subscription itself, if the plan is priced in one of them.</span>
          </div>
        </div>

        <div className="bg-[#F7F7F5] border border-[#1A3C2B]/10 p-6 flex flex-col items-center justify-center mb-8 gap-4">
          <span className="font-mono text-sm text-[#1A3C2B] font-bold break-all text-center">
            {address}
          </span>
          <button 
            onClick={handleCopy}
            className="bg-[#1A3C2B] text-white px-6 py-2 text-xs font-bold font-space hover:bg-[#1A3C2B]/90 transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="square"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy Address
              </>
            )}
          </button>
        </div>

        <div className="text-center text-[#1A3C2B]/40 text-xs font-medium leading-relaxed">
          Only send on Arbitrum One or Base.<br />
          Funds sent on any other network can&apos;t be recovered.
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
