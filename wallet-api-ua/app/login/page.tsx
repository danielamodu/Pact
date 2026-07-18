"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth } from "@/contexts/AuthProvider";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/wallet");
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-forest">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-forest border-t-transparent mx-auto"></div>
          <p className="font-space font-bold text-sm tracking-tight">Loading Pact...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-paper">
      <div className="mosaic-bg"></div>
      <div className="image-bg opacity-90"></div>
      <div className="absolute w-[800px] h-[800px] bg-[#1A3C2B]/[0.005] rounded-full blur-[200px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[480px] bg-paper border border-[#3A3A38]/20 p-10 md:p-12 modal-shadow backdrop-blur-sm">
        {/* Corner Markers */}
        <div className="corner-marker corner-tl"></div>
        <div className="corner-marker corner-tr"></div>
        <div className="corner-marker corner-bl"></div>
        <div className="corner-marker corner-br"></div>

        <div className="absolute top-6 left-6">
          <Link href="/" id="back-arrow-link" className="text-forest/40 hover:text-forest transition-colors">
            <iconify-icon icon="lucide:arrow-left" className="text-xl"></iconify-icon>
          </Link>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-forest/5 border border-forest/20 flex items-center justify-center rounded-sm mb-8">
            <iconify-icon icon="lucide:shield-check" className="text-2xl text-forest"></iconify-icon>
          </div>

          <h1 className="font-space text-2xl md:text-3xl font-bold text-forest tracking-tighter mb-4 leading-none uppercase">
            Subscriptions Without Intermediaries
          </h1>
          
          <p className="font-sans text-sm text-[#3A3A38]/70 mb-10 max-w-[320px] leading-relaxed">
            Direct on-chain recurring payments. No intermediary.
          </p>

          <form
            className="w-full pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              signIn("google", { redirect: false });
            }}
          >
            <button
              type="submit"
              id="login-google-btn"
              className="w-full bg-forest text-white font-mono text-xs font-bold uppercase tracking-[0.2em] py-5 rounded-sm hover:opacity-90 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <iconify-icon icon="mdi:google" className="text-lg"></iconify-icon>
              Connect with Google
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-forest/10 w-full">
            <p className="font-mono text-[10px] text-[#3A3A38]/50 leading-relaxed uppercase">
              Secure Authentication Powered by Pact.
              <br />
              New users provisioned automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 px-6 pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-forest shadow-[0_0_8px_rgba(26,60,43,0.2)]"></div>
          <span className="font-mono text-[9px] text-forest/40 uppercase tracking-[0.2em]">
            Sepolia Testnet
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="font-mono text-[9px] text-forest/40 uppercase tracking-[0.2em]">
            v1.0.4 - Secure Auth Session
          </span>
        </div>
      </div>
    </div>
  );
}
