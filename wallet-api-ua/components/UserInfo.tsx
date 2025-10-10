"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { AccountInfo } from "@/types/particle";
import { Button } from "./Button";

interface UserInfoProps {
  accountInfo: AccountInfo | null;
  unifiedBalance: string;
}

export function UserInfo({ accountInfo, unifiedBalance }: UserInfoProps) {
  const { publicAddress, userInfo, handleLogout } = useAuth();
  const { name, email } = userInfo || {};

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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
          <h2 className="text-2xl font-bold text-gray-900">Wallet Profile</h2>
          <p className="text-gray-600">Your secure TEE wallet information</p>
        </div>
      </div>

      <div className="space-y-4">
        {name && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Name
            </label>
            <div className="text-lg font-semibold text-gray-900">{name}</div>
          </div>
        )}

        {email && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <div className="text-lg font-semibold text-gray-900">{email}</div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Wallet Address
          </label>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
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
            <span className="font-mono text-sm text-gray-900 break-all flex-1">
              {publicAddress ?? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  Loading wallet...
                </div>
              )}
            </span>
            {publicAddress && (
              <button
                onClick={() => navigator.clipboard.writeText(publicAddress)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Copy address"
              >
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
              </button>
            )}
          </div>
        </div>

        {/* Universal Account Addresses */}
        {accountInfo && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                EVM Universal Address
              </label>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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
                <span className="font-mono text-sm text-gray-900 break-all flex-1">
                  {accountInfo.evmUaAddress}
                </span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(accountInfo.evmUaAddress)
                  }
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Copy address"
                >
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
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Solana Universal Address
              </label>
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
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
                <span className="font-mono text-sm text-gray-900 break-all flex-1">
                  {accountInfo.solanaUaAddress}
                </span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(accountInfo.solanaUaAddress)
                  }
                  className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                  title="Copy address"
                >
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
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Unified Balance
              </label>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900">
                    ${parseFloat(unifiedBalance).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-600">
                    Total across all chains
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Logout Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button variant="danger" onClick={handleLogout} className="w-full">
            <svg
              className="w-5 h-5"
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
          </Button>
        </div>
      </div>
    </div>
  );
}
