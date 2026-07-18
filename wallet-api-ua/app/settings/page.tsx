"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { NavigationBar } from "@/components/NavigationBar";
import { AppFooter } from "@/components/AppFooter";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const { publicAddress } = useAuth();

  const handleCopyWallet = () => {
    if (publicAddress) {
      navigator.clipboard.writeText(publicAddress);
      alert("Address copied to clipboard!");
    }
  };

  const handleLogout = () => {
    signOut({ redirect: true, callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar mode="app" activeItem="settings" />

      <main className="flex-1 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <header className="mb-12">
            <div className="inline-flex items-center gap-2 border border-[#1A3C2B]/20 px-3 py-1 mb-6">
              <div className="w-2 h-2 bg-[#1A3C2B] rounded-full"></div>
              <span className="font-mono text-[10px] tracking-widest uppercase">
                Account Management
              </span>
            </div>
            <h1 className="font-space text-6xl font-bold tracking-tighter leading-[0.9] text-[#1A3C2B] uppercase">
              ACCOUNT SETTINGS
            </h1>
          </header>

          {/* Settings Container */}
          <div className="relative bg-white/50 backdrop-blur-sm border border-[#1A3C2B]/10 p-12">
            <div className="corner-marker corner-tl"></div>
            <div className="corner-marker corner-tr"></div>
            <div className="corner-marker corner-bl"></div>
            <div className="corner-marker corner-br"></div>

            <div className="space-y-12">
              {/* Identity Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] tracking-widest text-[#1A3C2B]/40">
                    [ 01 ]
                  </span>
                  <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-bold">
                    Identity &amp; Wallet
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] tracking-wider uppercase text-[#1A3C2B]/60">
                      Magic-Generated Wallet
                    </label>
                    <div className="flex items-center gap-2 group">
                      <div className="flex-1 bg-white border border-[#1A3C2B]/10 p-4 font-mono text-sm text-[#1A3C2B] rounded-sm truncate">
                        {publicAddress || "0x7a2d48858e7C464C93685E6c559d28B3654f5c8F"}
                      </div>
                      <button
                        onClick={handleCopyWallet}
                        id="copy-wallet-btn"
                        className="h-[52px] px-5 bg-white border border-[#1A3C2B]/10 hover:border-[#1A3C2B] transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <iconify-icon icon="lucide:copy" className="text-lg"></iconify-icon>
                      </button>
                    </div>
                    <p className="font-mono text-[9px] text-[#1A3C2B]/40 leading-relaxed uppercase">
                      This address was automatically provisioned via Magic Link. It cannot be changed.
                    </p>
                  </div>
                </div>
              </section>

              <div className="h-px bg-[#1A3C2B]/10"></div>

              {/* Authentication Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] tracking-widest text-[#1A3C2B]/40">
                    [ 02 ]
                  </span>
                  <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-bold">
                    Authentication
                  </h2>
                </div>

                <div className="bg-white border border-[#1A3C2B]/10 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-[#F7F7F5] rounded-full">
                      <iconify-icon icon="logos:google-icon" className="text-xl"></iconify-icon>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-[#1A3C2B]/40 uppercase tracking-widest">
                        Linked Account
                      </p>
                      <p className="font-sans font-medium text-[#1A3C2B]">
                        alex.pact@gmail.com
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] bg-[#9EFFBF]/20 text-[#1A3C2B] px-2 py-1 uppercase tracking-widest">
                    Active Session
                  </span>
                </div>
              </section>

              <div className="h-px bg-[#1A3C2B]/10"></div>

              {/* Danger Zone */}
              <section className="pt-4">
                <button
                  onClick={handleLogout}
                  id="logout-btn"
                  className="w-full flex items-center justify-center gap-3 border border-[#FF8C69]/30 text-[#FF8C69] font-mono text-xs uppercase tracking-[0.2em] py-5 hover:bg-[#FF8C69]/5 transition-all rounded-sm cursor-pointer"
                >
                  <iconify-icon icon="lucide:log-out" className="text-lg"></iconify-icon>
                  Disconnect Session
                </button>
                <p className="mt-4 text-center font-mono text-[9px] text-[#1A3C2B]/40 uppercase tracking-widest leading-relaxed">
                  Logging out will clear your local session keys.
                  <br />
                  Active subscriptions will continue to process on-chain.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
