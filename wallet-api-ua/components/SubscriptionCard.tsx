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
  const statusLabel =
    status === "active" ? "Active" : status === "past-due" ? "Payment due" : "Cancelled";
  const pillClass =
    status === "active" ? "ui-pill-good" : status === "past-due" ? "ui-pill-alert" : "ui-pill-neutral";

  return (
    <Link
      href={revokeHref}
      className="ui-card ui-card-lift p-6 flex flex-col justify-between h-full group"
    >
      <div>
        <div className="flex justify-between items-start gap-3 mb-4">
          <span className="font-sans text-sm text-[#66756B] truncate">{merchant}</span>
          <span className={`ui-pill ${pillClass} flex-shrink-0`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "active" ? "bg-[#145233]" : status === "past-due" ? "bg-[#A33A17]" : "bg-[#46564E]"
              }`}
            />
            {statusLabel}
          </span>
        </div>

        <h4 className="font-space text-xl font-bold text-forest leading-tight">{plan}</h4>
        <p className="font-space text-2xl font-bold text-forest mt-2 ui-num">{amount}</p>
      </div>

      <div className="mt-6 pt-4 border-t border-[#3A3A38]/8 flex justify-between items-center gap-3">
        <div>
          <span className="font-sans text-[13px] text-[#66756B] block">
            {status === "revoked" ? "Ended" : "Next charge"}
          </span>
          <span
            className={`font-sans text-sm font-semibold ${
              status === "past-due" ? "text-coral" : "text-forest"
            }`}
          >
            {status === "revoked" ? "Cancelled" : nextBilling}
          </span>
        </div>
        <span className="font-sans text-sm text-forest font-semibold group-hover:text-coral transition-colors whitespace-nowrap">
          Manage →
        </span>
      </div>
    </Link>
  );
}
