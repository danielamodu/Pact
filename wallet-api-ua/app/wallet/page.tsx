"use client";

import { useEffect, useState } from "react";
import { UserInfo } from "@/components/UserInfo";
import { MintingHero } from "@/components/MintingHero";
import { HowItWorks } from "@/components/HowItWorks";
import { MintButton } from "@/components/MintButton";
import { FooterLinks } from "@/components/FooterLinks";
import { useAuth } from "@/contexts/AuthProvider";
import {
  CHAIN_ID,
  UniversalAccount,
} from "@particle-network/universal-account-sdk";
import { AccountInfo } from "@/types/particle";
import { Interface } from "ethers";
import { ethereumService } from "@/lib/ethereum";

export default function WalletPage() {
  const { isAuthenticated, isLoading, publicAddress } = useAuth();

  const [universalAccount, setUniversalAccount] =
    useState<UniversalAccount | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [unifiedBalance, setUnifiedBalance] = useState<string>("0");
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [txResult, setTxResult] = useState<string | null>(null);

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

  /**
   * Mint NFT on Avalanche using Universal Account
   */
  const mintNFT = async () => {
    if (!universalAccount) return;
    setIsMinting(true);
    setTxResult(null);

    const CONTRACT_ADDRESS = "0xdea7bF60E53CD578e3526F36eC431795f7EEbFe6"; // NFT contract on Avalanche

    try {
      const contractInterface = new Interface(["function mint() external"]);

      // Create a universal transaction to mint the NFT (contract interaction)
      const transaction = await universalAccount.createUniversalTransaction({
        chainId: CHAIN_ID.AVALANCHE_MAINNET,
        expectTokens: [],
        transactions: [
          {
            to: CONTRACT_ADDRESS,
            data: contractInterface.encodeFunctionData("mint"),
          },
        ],
      });

      // Sign the transaction (personal sign) using the connected wallet Magic API Wallet
      const signature = await ethereumService.personalSign(
        transaction.rootHash
      );

      // Send the transaction to the Universal Account
      const result = await universalAccount.sendTransaction(
        transaction,
        signature.signature
      );

      // Set the transaction result URL
      setTxResult(
        `https://universalx.app/activity/details?id=${result.transactionId}`
      );
    } catch (error) {
      console.error("Transaction failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setTxResult(`Error: ${errorMessage}`);
    } finally {
      setIsMinting(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-gray-700">Connected</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1.5">
            Universal Account Dashboard
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Your cross-chain wallet powered by Magic&apos;s Wallet API and
            Particle Network
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side - Wallet Profile */}
          <div className="lg:col-span-1">
            <UserInfo
              accountInfo={accountInfo}
              unifiedBalance={unifiedBalance}
            />
          </div>

          {/* Right Side - Cross-Chain NFT Minting */}
          <div className="lg:col-span-2 space-y-4">
            <MintingHero />

            {/* Main Minting Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-5">
              <HowItWorks />

              <MintButton
                onClick={mintNFT}
                isMinting={isMinting}
                disabled={isMinting || !universalAccount}
                txResult={txResult}
              />
              <FooterLinks />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
