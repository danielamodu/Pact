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

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

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

  // App Page navigation mode - Floating Glassmorphic Header
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[94%] max-w-7xl z-50">
      <header className="w-full bg-white/40 backdrop-blur-2xl border border-white/60 rounded-full px-6 py-2.5 shadow-[0_8px_32px_rgba(26,60,43,0.06)] flex items-center justify-between transition-all">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <PactLogo className="w-9 h-9 shadow-sm transition-transform group-hover:scale-105" />
        </Link>

        <nav className="hidden sm:flex items-center gap-8 px-4">
          {[
            { href: "/wallet", id: "dashboard", label: "Dashboard" },
            { href: "/setup", id: "plans", label: "Create Plan" },
            { href: "/balance", id: "balance", label: "Balances" },
            { href: "/settings", id: "settings", label: "Settings" },
          ].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`font-space text-xs tracking-tight transition-all relative py-1 ${
                activeItem === item.id
                  ? "text-forest font-bold"
                  : "text-forest/60 hover:text-forest font-medium"
              }`}
            >
              {item.label}
              {activeItem === item.id && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-forest rounded-full"></span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          {publicAddress ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDepositOpen(true)}
                title="Deposit Funds"
                className="font-mono text-xs bg-forest/5 text-forest px-3.5 py-1.5 border border-forest/10 rounded-full font-bold hover:bg-forest/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                {formatAddress(publicAddress)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="square"/>
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="font-space text-xs font-bold text-coral hover:text-coral/80 transition-colors px-2 py-1"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-forest text-white px-5 py-2 rounded-full font-bold text-xs hover:scale-105 transition-all shadow-md font-space"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>
      {publicAddress && (
        <DepositModal 
          isOpen={isDepositOpen} 
          onClose={() => setIsDepositOpen(false)} 
          address={publicAddress} 
        />
      )}
    </div>
  );
}
