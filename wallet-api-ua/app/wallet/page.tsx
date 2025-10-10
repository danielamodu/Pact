"use client";

import { useEffect, useState } from "react";
import { EVMSignMethods } from "@/components/EVMSignMethods";
import { UserInfo } from "@/components/UserInfo";
import { useAuth } from "@/contexts/AuthProvider";
import { UniversalAccount } from "@particle-network/universal-account-sdk";
import { AccountInfo } from "@/types/particle";

export default function WalletPage() {
  const { isAuthenticated, isLoading, publicAddress } = useAuth();

  const [universalAccount, setUniversalAccount] =
    useState<UniversalAccount | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [unifiedBalance, setUnifiedBalance] = useState<string>("0");

  /**
   * Initialize Universal Account when wallet address is available
   */
  useEffect(() => {
    if (!publicAddress) return;

    const initializeUA = async () => {
      try {
        console.log(
          "Initializing UniversalAccount with address:",
          publicAddress
        );

        // Create Universal Account instance with the connected wallet as owner
        const ua = new UniversalAccount({
          projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
          projectClientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
          projectAppUuid: process.env.NEXT_PUBLIC_APP_ID!,
          ownerAddress: publicAddress,
          // Configure trade settings
          tradeConfig: {
            slippageBps: 100, // 1% slippage tolerance
          },
        });

        setUniversalAccount(ua);
        console.log("UniversalAccount initialized successfully");

        /**
         * Auto-fetch initial data when Universal Account is created
         */
        const fetchInitialData = async () => {
          try {
            // Get smart account options (addresses)
            const smartAccountOptions = await ua.getSmartAccountOptions();
            const info: AccountInfo = {
              ownerAddress: smartAccountOptions.ownerAddress,
              evmUaAddress: smartAccountOptions.smartAccountAddress!,
              solanaUaAddress: smartAccountOptions.solanaSmartAccountAddress!,
            };
            setAccountInfo(info);

            // Get unified balance across chains
            const primaryAssets = await ua.getPrimaryAssets();
            setUnifiedBalance(primaryAssets.totalAmountInUSD.toString());
          } catch (error) {
            console.error("Error fetching initial UA data:", error);
          }
        };

        await fetchInitialData();
      } catch (error) {
        console.error("Error initializing UniversalAccount:", error);
      }
    };

    initializeUA();
  }, [publicAddress]);

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

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
            Magic API Wallet
          </h1>
          <p className="text-gray-600">
            Secure TEE wallet with Universal Account integration
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Wallet Profile */}
          <div className="lg:col-span-1">
            <UserInfo
              accountInfo={accountInfo}
              unifiedBalance={unifiedBalance}
            />
          </div>

          {/* Right Side - Signing Methods */}
          <div className="lg:col-span-2">
            <EVMSignMethods />
          </div>
        </div>
      </div>
    </div>
  );
}
