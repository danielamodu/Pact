"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function WhitepaperPage() {
  const [activeSection, setActiveSection] = useState("abstract");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let current = "abstract";
      sections.forEach((sec) => {
        const top = sec.getBoundingClientRect().top;
        if (top <= 200) {
          current = sec.getAttribute("id") || "abstract";
        }
      });
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F5] text-[#1A3C2B] font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white border-b border-[#3A3A38]/10 z-50 h-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 overflow-hidden relative">
              <img
                src="/logo-square.png"
                alt="Pact Logo"
                className="absolute w-[166%] h-[166%] max-w-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] tracking-[0.2em] font-bold uppercase">Pact</span>
              <span className="font-space text-sm font-bold tracking-tight text-[#1A3C2B]/40">
                Technical Whitepaper
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-mono text-[10px] tracking-widest uppercase hover:text-[#FF8C69] transition-colors flex items-center gap-2"
            >
              ← Back to App
            </Link>
            <Link
              href="/wallet"
              id="nav-cta-btn"
              className="font-mono text-[10px] tracking-widest uppercase bg-[#1A3C2B] text-white px-6 py-3 rounded-sm font-bold hover:opacity-90 transition-opacity"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 pt-20 max-w-7xl mx-auto w-full">
        {/* Table of Contents Sidebar */}
        <aside className="w-80 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto border-r border-[#3A3A38]/10 bg-white/50 backdrop-blur-md p-10 hidden lg:block">
          <nav className="space-y-8">
            <div className="font-mono text-[9px] tracking-[0.3em] font-bold uppercase text-[#1A3C2B]/30 mb-6">
              TABLE OF CONTENTS
            </div>
            <div className="space-y-2 font-mono text-xs tracking-wider">
              {[
                { id: "abstract", label: "ABSTRACT" },
                { id: "problem", label: "1. THE RECURRING PROBLEM" },
                { id: "eip7702", label: "2. EIP-7702 DELEGATION" },
                { id: "security", label: "3. SESSION KEY PERMISSIONS" },
                { id: "architecture", label: "4. RELAYER ARCHITECTURE" },
                { id: "economics", label: "5. PROTOCOL ECONOMICS" },
                { id: "roadmap", label: "6. MULTI-CHAIN ROADMAP" },
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block py-2.5 pl-4 transition-all border-l-4 ${
                    activeSection === item.id
                      ? "border-[#9EFFBF] text-[#1A3C2B] bg-[#1A3C2B]/5 font-bold"
                      : "border-transparent text-[#1A3C2B]/60 hover:text-[#1A3C2B]"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        {/* Document Content */}
        <main className="flex-1 p-10 lg:p-20 bg-white/30">
          <div className="max-w-3xl">
            {/* Hero Title Section */}
            <section id="abstract" className="mb-20">
              <div className="border-l-4 border-[#9EFFBF] pl-6 mb-8">
                <span className="font-mono text-[10px] tracking-[0.3em] text-[#1A3C2B]/40 uppercase block mb-2">
                  Pact Protocol Specification v1.0 • Mainnet Draft
                </span>
                <h1 className="font-space text-5xl font-black tracking-tighter text-[#1A3C2B] uppercase leading-[0.95]">
                  AUTONOMOUS RECURRING<br />PAYMENTS ON WEB3
                </h1>
              </div>
              <p className="text-base text-[#1A3C2B]/80 leading-relaxed mb-6 font-space">
                <strong>Abstract.</strong> Pact Protocol establishes a trustless, decentralized subscription primitive for Ethereum Layer 2 networks. By utilizing EIP-7702 account delegation and EIP-712 session key authorization, Pact enables standard Externally Owned Accounts (EOAs) to grant bounded, periodic execution rights to authorized smart contracts without relinquishing custody or requiring complex Smart Contract Account (SCA) migration.
              </p>
              <div className="bg-[#1A3C2B] text-white p-6 relative font-mono text-xs">
                <span className="text-[#9EFFBF] font-bold uppercase block mb-1">Contract Deployments</span>
                <span>
                  PactRegistry: <code className="text-[#9EFFBF]">0xF2cDBAcdcE2D7961C2dE969E28F623ffac617CF5</code> (Arbitrum One & Base Mainnet)
                </span>
              </div>
            </section>

            {/* Section 1: The Problem */}
            <section id="problem" className="mb-20 space-y-6">
              <div className="flex items-center gap-4 border-b border-[#3A3A38]/10 pb-4">
                <span className="font-mono text-sm text-[#FF8C69] font-bold uppercase">01</span>
                <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-[#1A3C2B]">
                  The Web3 Subscription Bottleneck
                </h2>
              </div>
              <p className="text-sm text-[#1A3C2B]/70 leading-relaxed">
                Traditional Web2 commerce relies heavily on push-less recurring card pulls (SaaS subscriptions, memberships, content access). Conversely, Web3 payments require explicit manual transaction signatures for every billing cycle.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="bg-white p-6 border border-[#3A3A38]/10 shadow-sm">
                  <span className="font-mono text-[10px] text-[#FF8C69] font-bold uppercase block mb-2">
                    [ Web2 Subscription ]
                  </span>
                  <p className="text-xs text-[#1A3C2B]/70 leading-relaxed">
                    Merchant stores card token → Automatically debits user on interval → 99.2% renewal success rate.
                  </p>
                </div>
                <div className="bg-white p-6 border border-[#3A3A38]/10 shadow-sm">
                  <span className="font-mono text-[10px] text-[#1A3C2B]/40 font-bold uppercase block mb-2">
                    [ Traditional Web3 ]
                  </span>
                  <p className="text-xs text-[#1A3C2B]/70 leading-relaxed">
                    User receives notification → Must connect wallet → Signs manual gas tx → 78% subscriber churn.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: EIP-7702 */}
            <section id="eip7702" className="mb-20 space-y-6">
              <div className="flex items-center gap-4 border-b border-[#3A3A38]/10 pb-4">
                <span className="font-mono text-sm text-[#9EFFBF] font-bold uppercase">02</span>
                <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-[#1A3C2B]">
                  EIP-7702 Account Delegation
                </h2>
              </div>
              <p className="text-sm text-[#1A3C2B]/70 leading-relaxed">
                EIP-7702 introduces a lightweight bytecode pointer (<code>0xef0100 + address</code>) into an EOA during a transaction execution window. This allows an existing EOA to temporarily acquire contract logic execution capabilities without requiring full account abstraction deployment (ERC-4337).
              </p>
              <div className="bg-white p-6 border border-[#3A3A38]/10 font-mono text-xs space-y-2">
                <div className="text-[#1A3C2B]/40 text-[10px] uppercase tracking-widest">[ DELEGATION SPECS ]</div>
                <div className="text-[#1A3C2B]">Target Implementation: <span className="font-bold">SessionKeyExecutor.sol</span></div>
                <div className="text-[#1A3C2B]">Execution Mechanism: <span className="font-bold">EIP-712 Struct Hash Verification</span></div>
                <div className="text-[#1A3C2B]">State Mutation: <span className="font-bold">Zero permanent code overwrite</span></div>
              </div>
            </section>

            {/* Section 3: Security */}
            <section id="security" className="mb-20 space-y-6">
              <div className="flex items-center gap-4 border-b border-[#3A3A38]/10 pb-4">
                <span className="font-mono text-sm text-[#F4D35E] font-bold uppercase">03</span>
                <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-[#1A3C2B]">
                  Session Key Permissions & Guardrails
                </h2>
              </div>
              <p className="text-sm text-[#1A3C2B]/70 leading-relaxed">
                Security is enforcing strict, un-bypassable boundaries. Pact session keys enforce 4 cryptographic constraints:
              </p>
              <ul className="space-y-3 font-mono text-xs text-[#1A3C2B]/80 list-disc pl-5">
                <li><strong>Spend Cap Enforcement:</strong> Maximum allowance per execution cycle (e.g. 10 USDC).</li>
                <li><strong>Time Interval Locking:</strong> Enforces minimum elapsed seconds (e.g., 2,592,000 seconds) between consecutive pulls.</li>
                <li><strong>Merchant Whitelisting:</strong> Funds can ONLY be routed to the registered plan merchant payout address.</li>
                <li><strong>Instant On-Chain Revocation:</strong> Subscribers can invalidate their session key at any time in a single transaction.</li>
              </ul>
            </section>

            {/* Section 4: Relayer */}
            <section id="architecture" className="mb-20 space-y-6">
              <div className="flex items-center gap-4 border-b border-[#3A3A38]/10 pb-4">
                <span className="font-mono text-sm text-[#1A3C2B] font-bold uppercase">04</span>
                <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-[#1A3C2B]">
                  Decentralized Relayer Mesh
                </h2>
              </div>
              <p className="text-sm text-[#1A3C2B]/70 leading-relaxed">
                When a subscription due timestamp is reached, an off-chain relayer node triggers <code>SessionKeyExecutor.executeSubscription()</code>. The relayer submits the transaction gas on behalf of the user, collecting the subscription funds and transferring 99% to the merchant payout address.
              </p>
            </section>

            {/* Section 5: Economics */}
            <section id="economics" className="mb-20 space-y-6">
              <div className="flex items-center gap-4 border-b border-[#3A3A38]/10 pb-4">
                <span className="font-mono text-sm text-[#FF8C69] font-bold uppercase">05</span>
                <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-[#1A3C2B]">
                  Protocol Economics (1% Fee Split)
                </h2>
              </div>
              <p className="text-sm text-[#1A3C2B]/70 leading-relaxed">
                Pact operates a transparent, protocol-enforced revenue model. Upon every successful recurring settlement, 99% of the transaction value is credited immediately to the merchant payout address, and 1% is transferred to the protocol treasury to maintain relayer infrastructure and node uptime.
              </p>
            </section>

            {/* Section 6: Roadmap */}
            <section id="roadmap" className="mb-20 space-y-6">
              <div className="flex items-center gap-4 border-b border-[#3A3A38]/10 pb-4">
                <span className="font-mono text-sm text-[#9EFFBF] font-bold uppercase">06</span>
                <h2 className="font-space text-3xl font-bold uppercase tracking-tight text-[#1A3C2B]">
                  Multi-L2 Roadmap
                </h2>
              </div>
              <p className="text-sm text-[#1A3C2B]/70 leading-relaxed mb-6">
                Pact Protocol is currently deployed on <strong>Arbitrum One</strong> & <strong>Base Mainnet</strong>, with planned expansion to Optimism Mainnet, Polygon zkEVM, and Linea.
              </p>
              <div className="border-t border-[#3A3A38]/10 pt-8 flex gap-6 text-xs font-mono tracking-wider">
                <Link href="/docs" className="text-[#1A3C2B]/60 hover:text-[#FF8C69] transition-colors uppercase">
                  Developer Docs
                </Link>
                <Link href="/terms" className="text-[#1A3C2B]/60 hover:text-[#FF8C69] transition-colors uppercase">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="text-[#1A3C2B]/60 hover:text-[#FF8C69] transition-colors uppercase">
                  Privacy Policy
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
