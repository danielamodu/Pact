"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthProvider";

// Dynamically import PactSpikeDashboard with client-side only execution (no SSR)
const PactSpikeDashboard = dynamic(
  () => import("@/components/PactSpikeDashboard").then((mod) => mod.PactSpikeDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-text border-t-transparent mx-auto"></div>
          <p className="text-muted text-xs tracking-wider uppercase font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    ),
  }
);

export default function WalletPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-text border-t-transparent mx-auto"></div>
          <p className="text-muted text-xs tracking-wider uppercase font-semibold">Validating secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <PactSpikeDashboard />;
}
