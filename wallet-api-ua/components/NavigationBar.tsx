"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthProvider";

interface NavigationBarProps {
  mode?: "landing" | "app";
  activeItem?: string;
}

export function NavigationBar({ mode = "app", activeItem }: NavigationBarProps) {
  const { publicAddress, handleLogout } = useAuth();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (mode === "landing") {
    return (
      <header className="w-full pt-8 pb-4 relative z-50">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-white flex items-center justify-center jeton-pill transition-transform group-hover:rotate-12 shadow-sm">
              <span className="font-bold text-[#1A3C2B] text-2xl font-space">P</span>
            </div>
            <span className="font-bold text-white tracking-tight text-2xl font-space">Pact</span>
          </Link>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-2 text-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className="text-sm font-bold uppercase font-mono">EN</span>
            </div>
            <Link href="/login" id="nav-login-btn" className="text-white text-sm font-bold hover:opacity-80 transition-opacity font-space">
              Log in
            </Link>
            <Link href="/wallet" id="nav-cta-btn" className="bg-white text-forest px-8 py-3.5 jeton-pill font-bold text-sm hover:scale-105 transition-all shadow-md font-space">
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
          <div className="w-10 h-10 bg-forest flex items-center justify-center jeton-pill transition-transform group-hover:rotate-12 shadow-sm">
            <span className="font-bold text-white text-xl font-space">P</span>
          </div>
          <span className="font-bold text-forest tracking-tight text-xl font-space">Pact</span>
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
              <span className="font-mono text-xs bg-forest/5 text-forest px-4 py-2 border border-forest/10 jeton-pill font-bold">
                {formatAddress(publicAddress)}
              </span>
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
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
