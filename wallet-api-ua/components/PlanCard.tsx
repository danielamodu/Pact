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
      className="ui-card ui-card-lift p-6 flex flex-col justify-between h-full cursor-pointer"
    >
      <div>
        <div className="flex justify-between items-start gap-3 mb-4">
          <span className="font-sans text-sm text-[#66756B]">
            {network === "arbitrum" ? "Arbitrum" : "Base"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive?.();
            }}
            className={`ui-pill ${isPaused ? "ui-pill-warn" : "ui-pill-good"} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-[#7A5B00]" : "bg-[#145233]"}`} />
            {isPaused ? "Paused" : "Active"}
          </button>
        </div>

        <h4 className="font-space text-xl font-bold text-forest leading-tight">{planName}</h4>
        <p className="font-space text-2xl font-bold text-forest mt-2 ui-num">{price}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#3A3A38]/8">
        <div>
          <span className="font-sans text-[13px] text-[#66756B] block mb-0.5">Subscribers</span>
          <span className="font-space text-lg font-bold text-forest ui-num">{subscribers}</span>
        </div>
        <div>
          <span className="font-sans text-[13px] text-[#66756B] block mb-0.5">Collected</span>
          <span className="font-space text-lg font-bold text-forest ui-num">{revenue}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={handleCopyLink} className="ui-btn ui-btn-ghost ui-btn-sm flex-1">
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="ui-btn ui-btn-primary ui-btn-sm flex-1"
        >
          Open
        </button>
      </div>
    </div>
  );
}
