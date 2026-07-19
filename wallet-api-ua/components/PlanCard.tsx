"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PlanCardProps {
  planId: string;
  network: "arbitrum" | "base";
  planName: string;
  token: string;
  status: "active" | "paused";
  price: string;
  subscribers: number;
  revenue: string;
  onToggleActive?: () => void;
}

export function PlanCard({
  planId,
  network,
  planName,
  token,
  status,
  price,
  subscribers,
  revenue,
  onToggleActive,
}: PlanCardProps) {
  const router = useRouter();
  const isPaused = status === "paused";
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const checkoutUrl = `${window.location.origin}/subscribe?planId=${planId}&network=${network}`;
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    router.push(`/plan/${planId}?network=${network}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="relative bg-white/50 backdrop-blur-md border border-[#3A3A38]/20 p-8 flex flex-col justify-between h-full group hover:border-forest hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      {/* Corner Markers */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-forest"></div>
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-forest"></div>
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-forest"></div>
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-forest"></div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] uppercase tracking-widest text-forest/40">
              MERCHANT PLAN
            </span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-forest/60 mt-0.5">
              Network: {network === "arbitrum" ? "Arbitrum One" : "Base Network"}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive?.();
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer hover:opacity-85 ${
              isPaused
                ? "border-gold/30 bg-gold/10 text-[#a8820a]"
                : "border-mint/20 bg-mint/10 text-forest"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-[#a8820a]" : "bg-forest"}`}></span>
            {status}
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="font-space text-xl font-bold uppercase tracking-tight text-forest">
            {planName}
          </h4>
          <p className="font-mono text-sm font-bold text-forest">{price}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-[#3A3A38]/10">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-forest/40 block mb-0.5">
            Subscribers
          </span>
          <span className="font-space text-lg font-bold text-forest">
            {subscribers}
          </span>
        </div>
        <div>
          <span className="font-mono text-[8px] uppercase tracking-widest text-forest/40 block mb-0.5">
            Total Revenue
          </span>
          <span className="font-space text-lg font-bold text-forest">
            {revenue}
          </span>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-[#3A3A38]/5">
        <button
          onClick={handleCopyLink}
          className="flex-1 border border-forest/20 text-forest hover:bg-forest hover:text-white font-mono text-[9px] font-bold uppercase tracking-wider py-3 rounded-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="flex items-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
              {copied ? (
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <g strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </g>
              )}
            </svg>
          </span>
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="flex-1 bg-forest text-white hover:opacity-90 font-mono text-[9px] font-bold uppercase tracking-wider py-3 rounded-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="flex items-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Details
        </button>
      </div>
    </div>
  );
}
