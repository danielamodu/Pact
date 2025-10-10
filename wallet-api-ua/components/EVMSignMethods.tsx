"use client";

import { useState } from "react";
import { ethereumService } from "@/lib/ethereum";
import { parseEther } from "ethers";
import { useAuth } from "@/contexts/AuthProvider";
import {
  PERSONAL_SIGN_PAYLOAD,
  SIGN_TYPED_DATA_V1_PAYLOAD,
  SIGN_TYPED_DATA_V3_PAYLOAD,
  SIGN_TYPED_DATA_V4_PAYLOAD,
} from "@/constants/sign-payloads";
import { Button } from "./Button";

export function EVMSignMethods() {
  const { publicAddress } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  if (!publicAddress) {
    return null;
  }

  const signTransactionPayload = {
    from: publicAddress,
    to: publicAddress,
    value: parseEther("0.00001"),
    gasLimit: 21000,
  };

  const handleSign = async (handler: () => Promise<string>) => {
    setIsLoading(true);
    setResult("");
    try {
      const response = await handler();
      setResult(response);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    {
      value: "personal",
      label: "Personal Sign",
      payload: PERSONAL_SIGN_PAYLOAD,
      handler: async () => {
        const response = await ethereumService.personalSign(
          PERSONAL_SIGN_PAYLOAD
        );
        return JSON.stringify(response, null, 2);
      },
    },
    {
      value: "typed-data-v1",
      label: "Sign Typed Data V1",
      payload: SIGN_TYPED_DATA_V1_PAYLOAD,
      handler: async () => {
        const response = await ethereumService.signTypedDataV1(
          SIGN_TYPED_DATA_V1_PAYLOAD
        );
        return JSON.stringify(response, null, 2);
      },
    },
    {
      value: "typed-data-v3",
      label: "Sign Typed Data V3",
      payload: SIGN_TYPED_DATA_V3_PAYLOAD,
      handler: async () => {
        const response = await ethereumService.signTypedDataV3(
          SIGN_TYPED_DATA_V3_PAYLOAD
        );
        return JSON.stringify(response, null, 2);
      },
    },
    {
      value: "typed-data-v4",
      label: "Sign Typed Data V4",
      payload: SIGN_TYPED_DATA_V4_PAYLOAD,
      handler: async () => {
        const response = await ethereumService.signTypedDataV4(
          SIGN_TYPED_DATA_V4_PAYLOAD
        );
        return JSON.stringify(response, null, 2);
      },
    },
    {
      value: "transaction",
      label: "Sign Transaction",
      payload: signTransactionPayload,
      handler: async () => {
        const response = await ethereumService.signTransaction(
          signTransactionPayload
        );
        return JSON.stringify(response, null, 2);
      },
    },
  ];

  const activeTabData = tabs.find((tab) => tab.value === activeTab);

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          EVM Signing Methods
        </h2>
        <p className="text-gray-600">
          Test various EVM cryptographic signing operations with TEE API
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setResult("");
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTabData && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payload
            </label>
            <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto text-sm">
              {JSON.stringify(activeTabData.payload, null, 2)}
            </pre>
          </div>

          <Button
            onClick={() => handleSign(activeTabData.handler)}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Signing...
              </>
            ) : (
              <>
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
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Execute Sign
              </>
            )}
          </Button>

          {result && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result
              </label>
              <pre className="bg-green-50 p-4 rounded-lg border border-green-200 overflow-x-auto text-sm max-h-96">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
