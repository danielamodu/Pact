"use client";

import Link from "next/link";

interface SubscriptionCardProps {
  plan: string;
  merchant: string;
  status: "active" | "past-due" | "revoked";
  amount: string;
  nextBilling: string;
  revokeHref: string;
}

export function SubscriptionCard({
  plan,
  merchant,
  status,
  amount,
  nextBilling,
  revokeHref,
}: SubscriptionCardProps) {
  const isInactive = status === "past-due" || status === "revoked";
  const statusLabel =
    status === "active" ? "Active" : status === "past-due" ? "Payment Due" : "Cancelled";

  return (
    <div className="relative bg-white/50 backdrop-blur-md border border-[#3A3A38]/20 p-8 flex flex-col justify-between h-full group hover:border-[#1A3C2B] transition-colors duration-300">
      {/* Corner Markers */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-forest"></div>
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-forest"></div>
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-forest"></div>
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-forest"></div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-forest/40">
            {merchant}
          </span>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-[9px] font-mono font-bold uppercase tracking-widest ${
              isInactive
                ? "border-coral/20 bg-coral/10 text-coral"
                : "border-mint/20 bg-mint/10 text-forest"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? "bg-coral" : "bg-forest"}`}></span>
            {statusLabel}
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="font-space text-xl font-bold uppercase tracking-tight text-forest">
            {plan}
          </h4>
          <p className="font-mono text-sm font-bold text-forest">{amount}</p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[#3A3A38]/10 flex justify-between items-center">
        <div className="space-y-0.5">
          <span className="font-mono text-[8px] uppercase tracking-widest text-forest/40 block">
            Next Charge
          </span>
          <span className={`font-mono text-[10px] font-bold ${isInactive ? "text-coral" : "text-forest"}`}>
            {status === "revoked" ? "Cancelled" : nextBilling}
          </span>
        </div>

        <Link
          href={revokeHref}
          className="font-mono text-[9px] uppercase tracking-widest text-[#3A3A38]/60 hover:text-coral transition-colors"
        >
          {status === "revoked" ? "View Details" : "Manage"}
        </Link>
      </div>

      {status === "active" && (
        <div className="mt-4 pt-4 border-t border-[#3A3A38]/10">
          <p className="font-mono text-[9px] text-forest/50 tracking-tight text-center leading-relaxed">
            Renews automatically — no action needed
          </p>
        </div>
      )}
    </div>
  );
}
