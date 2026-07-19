"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { PactLogo } from "@/components/PactLogo";
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
            <div className="hidden md:flex items-center gap-2 text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className="text-sm font-bold uppercase font-mono">EN</span>
            </div>
            <Link href="/login" id="nav-login-btn" className="text-white text-sm font-bold hover:opacity-80 transition-opacity font-space">
              Log in
            </Link>
            <Link href={isAuthenticated ? "/wallet" : "/login"} id="nav-cta-btn" className="bg-white text-forest px-8 py-3.5 jeton-pill font-bold text-sm hover:scale-105 transition-all shadow-md font-space">
              Launch App
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // App Page navigation mode
  return (
    <header className="fixed top-0 left-0 w-full h-20 bg-paper/80 backdrop-blur-md border-b border-[#3A3A38]/10 z-50 flex items-center justify-between px-8">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-4 group cursor-pointer">
          <PactLogo className="w-10 h-10 shadow-sm transition-transform group-hover:scale-105" />
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/wallet"
            className={`font-space text-sm font-bold transition-all ${
              activeItem === "dashboard" ? "text-forest underline underline-offset-4" : "text-forest/60 hover:text-forest"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/setup"
            className={`font-space text-sm font-bold transition-all ${
              activeItem === "plans" ? "text-forest underline underline-offset-4" : "text-forest/60 hover:text-forest"
            }`}
          >
            Create Plan
          </Link>
          <Link
            href="/balance"
            className={`font-space text-sm font-bold transition-all ${
              activeItem === "balance" ? "text-forest underline underline-offset-4" : "text-forest/60 hover:text-forest"
            }`}
          >
            Balances
          </Link>
          <Link
            href="/settings"
            className={`font-space text-sm font-bold transition-all ${
              activeItem === "settings" ? "text-forest underline underline-offset-4" : "text-forest/60 hover:text-forest"
            }`}
          >
            Settings
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {publicAddress ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDepositOpen(true)}
                title="Deposit Funds"
                className="font-mono text-xs bg-forest/5 text-forest px-4 py-2 border border-forest/10 jeton-pill font-bold hover:bg-forest/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                {formatAddress(publicAddress)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="square"/>
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="font-space text-xs font-bold text-coral hover:text-coral/80 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-forest text-white px-6 py-2.5 jeton-pill font-bold text-xs hover:scale-105 transition-all shadow-md font-space"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
      {publicAddress && (
        <DepositModal 
          isOpen={isDepositOpen} 
          onClose={() => setIsDepositOpen(false)} 
          address={publicAddress} 
        />
      )}
    </header>
  );
}
