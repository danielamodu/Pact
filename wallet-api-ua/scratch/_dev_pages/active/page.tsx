"use client";

import Link from "next/link";

export default function ActivePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-satoshi">
      {/* Header */}
      <header className="fixed top-0 w-full h-20 bg-[#ffe17c] border-b-2 border-black z-50 flex items-center justify-between px-8 md:px-16">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-black flex items-center justify-center border-2 border-black">
            <iconify-icon icon="lucide:zap" className="text-[#ffe17c] text-2xl"></iconify-icon>
          </div>
          <span className="cabinet font-extrabold text-2xl tracking-tighter">PACT</span>
        </Link>

        <nav className="hidden md:flex gap-8 cabinet font-bold">
          <Link href="/#product" className="hover:underline decoration-2 underline-offset-4">Product</Link>
          <Link href="/#developers" className="hover:underline decoration-2 underline-offset-4">Developers</Link>
          <Link href="/#pricing" className="hover:underline decoration-2 underline-offset-4">Pricing</Link>
          <Link href="/#docs" className="hover:underline decoration-2 underline-offset-4">Docs</Link>
        </nav>

        <Link id="nav-cta" href="/login" className="neo-btn-primary neo-shadow-sm px-6 py-2 cabinet font-bold text-sm tracking-tight inline-flex items-center justify-center">
          START FREE TRIAL
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-32 pb-24 px-8 md:px-16 flex items-center justify-center relative">
        <div className="absolute inset-0 dot-pattern pointer-events-none"></div>

        <div className="max-w-2xl w-full z-10">
          <div className="bg-white border-2 border-black p-12 neo-shadow-lg text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-[#b7c6c2] bg-white flex items-center justify-center neo-shadow-sm">
                <iconify-icon icon="lucide:check-circle-2" className="text-[#b7c6c2] text-6xl"></iconify-icon>
              </div>
            </div>

            {/* Success Messaging */}
            <div className="inline-flex items-center gap-2 bg-[#b7c6c2] border-2 border-black px-4 py-1.5 mb-6 neo-shadow-sm">
              <span className="w-2 h-2 bg-black rounded-full"></span>
              <span className="text-xs font-bold tracking-widest uppercase">SUBSCRIPTION ACTIVE</span>
            </div>

            <h1 className="cabinet font-extrabold text-5xl tracking-tighter mb-4 uppercase">
              You're All Set!
            </h1>
            <p className="text-lg font-medium text-gray-600 mb-10">
              Your cross-chain auto-pay has been successfully initialized. No more manual bridging or manual renewals.
            </p>

            {/* Plan Details Card */}
            <div className="bg-[#ffe17c] border-2 border-black p-8 text-left mb-10 neo-shadow-sm">
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-60 mb-1">MERCHANT</div>
                  <div className="cabinet font-extrabold text-xl">ACME CLOUD INFRA</div>
                </div>
                <iconify-icon icon="lucide:zap" className="text-2xl"></iconify-icon>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-60 mb-1">PLAN</div>
                  <div className="font-bold text-lg uppercase">Pro Monthly</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-60 mb-1">PRICE</div>
                  <div className="font-bold text-lg uppercase">$29.00 / MO</div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t-2 border-dashed border-black/20">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-1 text-center">NEXT BILLING DATE</div>
                <div className="cabinet font-extrabold text-3xl text-center uppercase tracking-tight">October 24, 2024</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link id="view-subs-btn" href="/wallet" className="neo-btn-primary neo-shadow-sm px-8 py-4 cabinet font-extrabold text-lg tracking-tight inline-block">
                VIEW MY SUBSCRIPTIONS
              </Link>
              <Link id="return-dash-btn" href="/wallet" className="neo-btn-secondary neo-shadow-sm px-8 py-4 cabinet font-extrabold text-lg tracking-tight inline-block">
                BACK TO DASHBOARD
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-20 px-8 md:px-16 bg-[#171e19] text-white border-t-2 border-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black flex items-center justify-center border-2 border-[#ffe17c]">
                <iconify-icon icon="lucide:zap" className="text-[#ffe17c] text-lg"></iconify-icon>
              </div>
              <span className="cabinet font-extrabold text-xl tracking-tighter">PACT</span>
            </div>
            <p className="text-white/40 text-sm font-medium leading-relaxed">
              Cross-chain automated billing infrastructure for the modular era. Built for developers, loved by users.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
