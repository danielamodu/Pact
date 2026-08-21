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

  const links = [
    { href: "/wallet", id: "dashboard", label: "Home" },
    { href: "/balance", id: "balance", label: "Balance" },
    { href: "/setup", id: "plans", label: "Create a plan" },
    { href: "/settings", id: "settings", label: "Settings" },
  ];

  // A floating dock rather than a bar pinned to the top edge — it keeps the
  // full width of the page free for content and matches the dock already used
  // on the landing page, so the app and the marketing site feel like one thing.
  return (
    <>
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-1 bg-forest/95 backdrop-blur-xl rounded-full pl-2 pr-2 py-2 shadow-[0_18px_50px_-12px_rgba(26,60,43,0.65)] border border-white/10">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center flex-shrink-0"
            title="Pact home"
          >
            <PactLogo className="w-6 h-6" />
          </Link>

          <div className="hidden sm:flex items-center gap-0.5 px-1">
            {links.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeItem === item.id
                    ? "bg-white text-forest font-semibold"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="w-px h-7 bg-white/15 mx-1 hidden sm:block" />

          {publicAddress ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsDepositOpen(true)}
                className="bg-mint text-forest text-sm font-semibold px-4 py-2.5 rounded-full hover:brightness-105 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Add funds
              </button>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="w-10 h-10 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-mint text-forest text-sm font-semibold px-5 py-2.5 rounded-full hover:brightness-105 transition-all whitespace-nowrap"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Language control sits out of the dock so the dock stays about navigation */}
      <div className="fixed top-6 right-8 z-40 hidden md:block">
        <LanguageSelector />
      </div>

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
