"use client";

import { useState } from "react";
import Link from "next/link";
import { NavigationBar } from "@/components/NavigationBar";

export default function PermissionPage() {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="dashboard" />

      <main className="flex-1 flex items-center justify-center pt-24 pb-12">
        <div className="w-full max-w-[680px] px-6 py-12">
          {/* Top Header Area */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 border border-[#1A3C2B]/20 px-3 py-1 mb-6 bg-white/50">
              <div className="w-2 h-2 bg-[#9EFFBF] rounded-full"></div>
              <span className="font-mono text-[10px] tracking-widest uppercase">
                Authorization Required
              </span>
            </div>
            <h1 className="font-space text-5xl font-bold tracking-tighter leading-[0.9] text-[#1A3C2B] mb-4 uppercase">
              Confirm Payment Permission
            </h1>
            <p className="font-sans text-[#3A3A38]/60 text-base">
              Review the terms you're agreeing to before initializing the session.
            </p>
          </div>

          {/* Terms Container */}
          <div className="relative bg-[#F7F7F5] border border-[#3A3A38]/20 p-12 mb-8">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="flex gap-8 items-start">
              <div className="w-[1px] h-32 bg-[#1A3C2B] hidden md:block"></div>
              <div className="flex-1">
                <p className="font-space text-2xl font-medium leading-relaxed tracking-tight text-[#1A3C2B]">
                  <span className="font-bold">Lume Finance</span> can pull up to{" "}
                  <span className="font-bold">$49.99 USDC</span> every{" "}
                  <span className="font-bold">30 days</span>.
                </p>
                <p className="font-space text-2xl font-medium leading-relaxed tracking-tight text-[#1A3C2B] opacity-40 mt-1">
                  Nothing else. Revoke anytime.
                </p>
              </div>
            </div>

            {/* Technical Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#3A3A38]/10 mt-12 border border-[#3A3A38]/10">
              <div className="bg-[#F7F7F5] p-5">
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                  Session ID
                </span>
                <span className="font-mono text-[10px] text-[#1A3C2B] font-bold truncate block">
                  0xA7c6f461...902
                </span>
              </div>
              <div className="bg-[#F7F7F5] p-5">
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                  Valid Until
                </span>
                <span className="font-mono text-[10px] text-[#1A3C2B] font-bold block">
                  Jan 15, 2025
                </span>
              </div>
              <div className="bg-[#F7F7F5] p-5">
                <span className="font-mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                  Revocation
                </span>
                <span className="font-mono text-[10px] text-[#1A3C2B] font-bold block">
                  Instant, Fee-Free
                </span>
              </div>
            </div>
          </div>

          {/* Consent Section */}
          <div className="space-y-6 mb-10 px-2">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="consent-check"
                className="custom-checkbox mt-1"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <label htmlFor="consent-check" className="cursor-pointer">
                <span className="block font-mono text-[12px] uppercase tracking-widest text-[#1A3C2B] mb-1">
                  I understand and agree to this authorization
                </span>
                <span className="block font-sans text-sm text-[#3A3A38]/60">
                  I confirm I have reviewed the session parameters and know that I can revoke access directly from the Pact dashboard at any time.
                </span>
              </label>
            </div>
            <p className="font-mono text-[10px] text-[#3A3A38]/40 uppercase tracking-tight">
              Notice: You will not be charged until the first billing cycle begins. Gas costs for the account upgrade transaction are paid by your wallet.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/balance"
              id="cta-confirm-permission"
              className={`w-full text-center font-mono text-xs tracking-[0.2em] uppercase py-5 rounded-sm transition-all ${
                isChecked
                  ? "bg-[#1A3C2B] text-white hover:opacity-95 cursor-pointer"
                  : "bg-forest/20 text-forest/40 cursor-not-allowed pointer-events-none"
              }`}
            >
              Confirm Authorization
            </Link>
            <Link
              href="/subscribe"
              id="cta-cancel-permission"
              className="w-full border border-[#3A3A38]/20 text-[#1A3C2B] font-mono text-xs tracking-[0.2em] uppercase py-5 rounded-sm text-center hover:bg-white transition-all"
            >
              Cancel &amp; Exit
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
