"use client";

import { useAuth } from "@/contexts/AuthProvider";
import { AccountInfo } from "@/types/particle";
import { useState } from "react";

interface UserInfoProps {
  accountInfo: AccountInfo | null;
  onRefresh?: () => Promise<void>;
}

export function UserInfo({ accountInfo, onRefresh }: UserInfoProps) {
  const { publicAddress, userInfo, handleLogout } = useAuth();
  const { name, email } = userInfo || {};
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-sm select-none">
      {/* Subtle Premium Card */}
      <div className="relative aspect-[1.586/1] w-full bg-gradient-to-br from-[#122312] to-[#0c180c] border border-white/5 rounded-soft p-6 shadow-md flex flex-col justify-between overflow-hidden text-bg">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-display font-black tracking-widest text-base leading-none">PACT</span>
            <span className="text-[6px] font-mono tracking-widest uppercase opacity-40 mt-0.5">CARD</span>
          </div>
          {/* Card Gold Chip */}
          <div className="w-8 h-6.5 bg-[#c39b4f] rounded-accent border border-amber-600/10 flex flex-col justify-between p-1 opacity-95"></div>
        </div>

        {/* Card Number Representation */}
        <div className="font-mono text-[10.5px] text-bg/60 tracking-widest space-x-1.5 flex justify-start my-auto">
          <span>4532</span>
          <span>98••</span>
          <span>••••</span>
          <span>7701</span>
        </div>

        <div className="flex justify-between items-end border-t border-white/5 pt-3 font-mono text-[8px] text-bg/40 leading-none">
          <div className="flex flex-col gap-0.5 text-left">
            <span>CARD HOLDER</span>
            <span className="text-[9.5px] font-bold text-bg/85">
              {name ? name.toUpperCase() : email ? email.split("@")[0].toUpperCase() : "DEMO USER"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span>EXPIRES</span>
            <span className="text-[9.5px] font-bold text-bg/85">12/28</span>
          </div>
        </div>
      </div>

      {/* Collapsible Wallet Details Accordion */}
      <div className="bg-surface border border-border-custom rounded-soft p-4 shadow-sm">
        <button
          onClick={() => setShowDetails(prev => !prev)}
          className="w-full flex justify-between items-center text-[8px] font-bold text-muted uppercase tracking-widest outline-none font-mono"
        >
          <span>Vault Address Details</span>
          <span>{showDetails ? "[Hide]" : "[View]"}</span>
        </button>

        {showDetails && (
          <div className="space-y-4 pt-4 border-t border-border-custom mt-3 animate-fadeIn">
            {/* Primary Signer */}
            <div className="space-y-1">
              <span className="text-[7.5px] font-bold text-muted uppercase tracking-widest font-mono">Billing Signer</span>
              <div className="flex items-center justify-between p-2 bg-bg/50 rounded border border-border-custom">
                <span className="font-mono text-[9.5px] text-text break-all truncate max-w-[180px]">
                  {publicAddress || "Resolving..."}
                </span>
                {publicAddress && (
                  <button
                    onClick={() => copyToClipboard(publicAddress, "wallet")}
                    className="p-1 hover:bg-surface rounded text-muted border border-border-custom"
                    title="Copy Address"
                  >
                    {copiedAddress === "wallet" ? "✓" : "❐"}
                  </button>
                )}
              </div>
            </div>

            {/* Smart Account */}
            {accountInfo && (
              <div className="space-y-1">
                <span className="text-[7.5px] font-bold text-muted uppercase tracking-widest font-mono">Unified Vault Account</span>
                <div className="flex items-center justify-between p-2 bg-bg/50 rounded border border-border-custom">
                  <span className="font-mono text-[9.5px] text-text break-all truncate max-w-[180px]">
                    {accountInfo.evmUaAddress}
                  </span>
                  <button
                    onClick={() => copyToClipboard(accountInfo.evmUaAddress, "evm")}
                    className="p-1 hover:bg-surface rounded text-muted border border-border-custom"
                    title="Copy Account Address"
                  >
                    {copiedAddress === "evm" ? "✓" : "❐"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 border border-border-custom hover:border-text rounded-soft text-[9px] font-bold uppercase tracking-widest spring-bounce transition outline-none cursor-pointer text-text"
          >
            {isRefreshing ? "..." : "Refresh"}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="flex-1 py-2 bg-transparent text-danger hover:text-danger hover:bg-danger/5 border border-danger/25 rounded-soft text-[9px] font-bold uppercase tracking-widest spring-bounce transition-colors outline-none cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
