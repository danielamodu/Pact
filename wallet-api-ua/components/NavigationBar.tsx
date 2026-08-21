"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { PactLogo } from "@/components/PactLogo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { DepositModal } from "@/components/DepositModal";

interface NavigationBarProps {
  mode?: "landing" | "app";
  activeItem?: string;
}

export function NavigationBar({ mode = "app", activeItem }: NavigationBarProps) {
  const { publicAddress, isAuthenticated, handleLogout } = useAuth();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  if (mode === "landing") {
    return (
      <header className="w-full pt-8 pb-4 relative z-50">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-4 group cursor-pointer">
            <PactLogo inverted className="w-12 h-12 shadow-sm transition-transform group-hover:scale-105" />
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:block">
              <LanguageSelector inverted />
            </div>
            <Link href="/privacy" id="nav-privacy-btn" className="text-white text-sm font-bold hover:opacity-80 transition-opacity font-space">
              Privacy
            </Link>
            <Link href={isAuthenticated ? "/wallet" : "/login"} id="nav-cta-btn" className="bg-white text-forest px-8 py-3.5 jeton-pill font-bold text-sm hover:scale-105 transition-all shadow-md font-space">
              Launch App
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // App navigation — a solid, full-width bar. The previous floating
  // glassmorphic pill sat on top of page content with a blur behind it, which
  // left every page feeling unanchored and read as "crypto site" rather than
  // something a first-time user would trust with money.
  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-[#3A3A38]/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-10 min-w-0">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer flex-shrink-0">
              <PactLogo className="w-8 h-8 transition-transform group-hover:scale-105" />
            </Link>

            <nav className="hidden sm:flex items-center gap-7">
              {[
                { href: "/wallet", id: "dashboard", label: "Home" },
                { href: "/balance", id: "balance", label: "Balance" },
                { href: "/setup", id: "plans", label: "Create a plan" },
                { href: "/settings", id: "settings", label: "Settings" },
              ].map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`font-sans text-[15px] transition-colors relative h-16 flex items-center ${
                    activeItem === item.id
                      ? "text-forest font-semibold"
                      : "text-[#46564E] hover:text-forest"
                  }`}
                >
                  {item.label}
                  {activeItem === item.id && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-forest" />
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            {publicAddress ? (
              <>
                <button
                  onClick={() => setIsDepositOpen(true)}
                  className="bg-forest text-white text-sm font-semibold px-4 py-2 rounded-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Add funds
                </button>
                <button
                  onClick={handleLogout}
                  title={publicAddress}
                  className="font-sans text-[15px] text-[#56655C] hover:text-forest transition-colors px-2 py-1 cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-forest text-white px-5 py-2 rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity font-sans"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {publicAddress && (
        <DepositModal
          isOpen={isDepositOpen}
          onClose={() => setIsDepositOpen(false)}
          address={publicAddress}
        />
      )}
    </>
  );
}
