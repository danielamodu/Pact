"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "@/components/AuthButton";
import { useAuth } from "@/contexts/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/wallet");
    }
  }, [isAuthenticated, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render the auth form if user is authenticated (redirect will happen)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Hero content */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 md:p-12 text-white flex flex-col justify-center">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    Powered by Particle Network and Magic
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                  One Account.
                  <br />
                  Any Chain.
                </h1>
                <p className="text-lg text-gray-300 leading-relaxed">
                  Get a secure wallet via Magic&apos;s Wallet API with Universal
                  Account integration. Access all your assets across 15+
                  blockchains from a single account.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Unified Balance</h3>
                    <p className="text-sm text-gray-300">
                      View all your assets across Ethereum, Solana, Avalanche,
                      and{" "}
                      <a
                        href="https://developers.particle.network/universal-accounts/cha/chains"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        more
                      </a>{" "}
                      in one place{" "}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Automatic Bridging</h3>
                    <p className="text-sm text-gray-300">
                      Transact on any chain—funds are automatically used from
                      wherever you hold them
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Gas Abstraction</h3>
                    <p className="text-sm text-gray-300">
                      Pay gas fees with any{" "}
                      <a
                        href="https://developers.particle.network/universal-accounts/cha/chains#primary-assets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        token
                      </a>{" "}
                      you hold. .
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Secure by Design</h3>
                    <p className="text-sm text-gray-300">
                      Magic&apos;s Wallet API keeps your keys safe—never exposed
                      to your browser or server
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Right side - Auth form */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Get Started
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Sign in with Google to create your Universal Account and
                  experience seamless cross-chain interactions.
                </p>
              </div>

              <SignInButton />

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 leading-relaxed">
                  By connecting, you&apos;ll get a secure wallet powered by{" "}
                  <a
                    href="https://docs.magic.link/api-wallets/introduction"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gray-700 hover:text-blue-600 underline"
                  >
                    Magic&apos;s Wallet API
                  </a>{" "}
                  with{" "}
                  <a
                    href="https://developers.particle.network/universal-accounts/cha/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gray-700 hover:text-blue-600 underline"
                  >
                    Particle Universal Accounts
                  </a>{" "}
                  for true chain abstraction.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Try minting a cross-chain NFT on Avalanche using funds from any
            supported chain
          </p>
        </div>
      </div>
    </div>
  );
}
