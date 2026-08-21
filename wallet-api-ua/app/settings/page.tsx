"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { NavigationBar } from "@/components/NavigationBar";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const { publicAddress, userInfo } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyWallet = () => {
    if (!publicAddress) return;
    navigator.clipboard.writeText(publicAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    signOut({ redirect: true, callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="app-ground"></div>
      <NavigationBar mode="app" activeItem="settings" />

      <main className="flex-1 pt-12 pb-28 relative z-10">
        <div className="max-w-[900px] mx-auto px-10 space-y-8">

          <div>
            <h1 className="font-space text-[44px] font-bold tracking-tight text-forest leading-[1.1]">
              Settings
            </h1>
            <p className="font-sans text-[17px] text-[#46564E] mt-1">
              Your account and wallet details.
            </p>
          </div>

          {/* Wallet */}
          <section className="ui-card p-8">
            <h2 className="font-space text-2xl font-bold text-forest">Your wallet</h2>
            <p className="font-sans text-[17px] text-[#46564E] mt-1 mb-6">
              Created for you when you signed in. This address can&apos;t be changed.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-[#F7F7F5] border border-[#3A3A38]/12 rounded-xl px-4 py-3.5 font-mono text-sm text-forest break-all">
                {publicAddress || "Loading…"}
              </div>
              <button
                onClick={handleCopyWallet}
                disabled={!publicAddress}
                className="ui-btn ui-btn-ghost flex-shrink-0"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </section>

          {/* Sign-in */}
          <section className="ui-card p-8">
            <h2 className="font-space text-2xl font-bold text-forest">Signed in with</h2>
            <p className="font-sans text-[17px] text-[#46564E] mt-1 mb-6">
              Pact uses your Google account to keep your wallet secure.
            </p>

            <div className="flex items-center justify-between gap-4 bg-[#F7F7F5] border border-[#3A3A38]/10 rounded-xl px-5 py-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 flex items-center justify-center bg-white rounded-full flex-shrink-0 shadow-sm">
                  <iconify-icon icon="logos:google-icon" className="text-xl"></iconify-icon>
                </div>
                <p className="font-sans text-[17px] font-medium text-forest truncate">
                  {userInfo?.email || "Loading…"}
                </p>
              </div>
              <span className="ui-pill ui-pill-good flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#145233]" />
                Active
              </span>
            </div>
          </section>

          {/* Sign out */}
          <section className="ui-card p-8">
            <h2 className="font-space text-2xl font-bold text-forest">Sign out</h2>
            <p className="font-sans text-[17px] text-[#46564E] mt-1 mb-6">
              Your subscriptions keep running — they live on-chain, not in this browser.
            </p>
            <button onClick={handleLogout} className="ui-btn ui-btn-ghost">
              Sign out
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
