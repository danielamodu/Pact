"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { AccountInfo } from "@/types/particle";
import { useState } from "react";

interface UserInfoProps {
  accountInfo: AccountInfo | null;
  unifiedBalance: string;
}

export function UserInfo({ accountInfo, unifiedBalance }: UserInfoProps) {
  const { publicAddress, userInfo, handleLogout } = useAuth();
  const { name, email } = userInfo || {};
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center ring-2 ring-white/30">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Wallet Profile</h2>
            <p className="text-blue-100 text-xs">Your secure TEE wallet</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* User Info */}
        {(name || email) && (
          <div className="space-y-2.5">
            {name && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-0.5">
                  Name
                </label>
                <div className="text-sm font-semibold text-gray-900">{name}</div>
              </div>
            )}

            {email && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-0.5">
                  Email
                </label>
                <div className="text-sm text-gray-900">{email}</div>
              </div>
            )}
          </div>
        )}

        {/* Wallet Address */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
            Wallet Address
          </label>
          <div className="relative group">
            <div className="flex items-center gap-2 p-2.5 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg
                  className="w-4 h-4 text-white"
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
              <span className="font-mono text-xs text-gray-900 break-all flex-1">
                {publicAddress ?? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Loading...
                  </div>
                )}
              </span>
              {publicAddress && (
                <button
                  onClick={() => copyToClipboard(publicAddress, "wallet")}
                  className="p-1.5 hover:bg-white/80 rounded-lg transition-colors flex-shrink-0"
                  title="Copy address"
                >
                  {copiedAddress === "wallet" ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Universal Account Addresses */}
        {accountInfo && (
          <>
            {/* Unified Balance - Featured */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3.5 border-2 border-green-200">
              <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Unified Balance
              </div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900">
                    ${parseFloat(unifiedBalance).toFixed(2)}
                  </span>
                  <span className="text-xs text-green-700 font-medium">
                    Total across all chains
                  </span>
                </div>
              </div>
              <a
                href="https://developers.particle.network/universal-accounts/cha/how-to/balances"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 bg-white hover:bg-green-50 py-1.5 px-3 rounded-md transition-colors border border-green-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Learn how to display full breakdown
              </a>
            </div>

            {/* EVM Universal Address */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                EVM Universal Address
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span className="font-mono text-xs text-gray-900 break-all flex-1">
                  {accountInfo.evmUaAddress}
                </span>
                <button
                  onClick={() => copyToClipboard(accountInfo.evmUaAddress, "evm")}
                  className="p-1.5 hover:bg-white/80 rounded-lg transition-colors flex-shrink-0"
                  title="Copy address"
                >
                  {copiedAddress === "evm" ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Solana Universal Address */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                Solana Universal Address
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span className="font-mono text-xs text-gray-900 break-all flex-1">
                  {accountInfo.solanaUaAddress}
                </span>
                <button
                  onClick={() => copyToClipboard(accountInfo.solanaUaAddress, "solana")}
                  className="p-1.5 hover:bg-white/80 rounded-lg transition-colors flex-shrink-0"
                  title="Copy address"
                >
                  {copiedAddress === "solana" ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Disconnect Button */}
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-200 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
