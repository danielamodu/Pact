"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const revealRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/wallet");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    revealRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealRef.current?.observe(el));
    return () => revealRef.current?.disconnect();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F7F5" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent mx-auto mb-4" style={{ borderColor: "#1A3C2B", borderTopColor: "transparent" }} />
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "#1A3C2B" }}>Loading Pact...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col sd-mosaic-page">

      {/* ── Bottom Dock Nav ── */}
      <nav id="bottom-nav-dock" className="sd-nav-dock" style={{ borderRadius: 9999 }}>
        <a href="#" id="dock-home-link" className="sd-dock-home">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </a>
        <a href="#how-it-works" id="dock-flow-link" className="sd-dock-link">Flow</a>
        <a href="#features" id="dock-features-link" className="sd-dock-link">Features</a>
        <a href="#faq" id="dock-faq-link" className="sd-dock-link">FAQ</a>
      </nav>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="sd-hero min-h-screen flex flex-col relative overflow-hidden">
          <header className="w-full pt-8 pb-4 relative z-50">
            <div className="w-full px-8 md:px-14 flex justify-between items-center">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="w-12 h-12 bg-white flex items-center justify-center transition-transform group-hover:rotate-12" style={{ borderRadius: 9999 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#1A3C2B", fontSize: 22 }}>P</span>
                </div>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", fontSize: 22, letterSpacing: "-0.02em" }}>Pact</span>
              </div>
              <div className="flex items-center gap-8">
                <div className="hidden md:flex items-center gap-2" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}>EN</span>
                </div>
                <Link href="/login" id="nav-login-btn" style={{ color: "white", fontSize: 14, fontWeight: 700, opacity: 1 }} className="hover:opacity-80 transition-opacity">Log in</Link>
                <Link href="/wallet" id="nav-cta-btn" style={{ background: "white", color: "#1A3C2B", padding: "14px 32px", borderRadius: 9999, fontWeight: 700, fontSize: 14 }} className="hover:scale-105 transition-all shadow-md">Launch App</Link>
              </div>
            </div>
          </header>

          <div className="flex-1 flex items-end relative z-10 pb-32 md:pb-48">
            <div className="w-full px-8 md:px-14 text-white flex flex-col md:flex-row justify-between items-end gap-12">
              <div className="w-full md:flex-1">
                <h1 className="sd-hero-h1">
                  <span className="sd-gradient-text">Payments</span><br />Simplified
                </h1>
              </div>
              <div className="max-w-md md:text-right mb-4 md:mb-12">
                <p style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 40 }}>
                  Enterprise protocol for autonomous<br className="hidden lg:block" /> on-chain subscriptions.
                </p>
                <div className="flex flex-nowrap gap-4 md:justify-end">
                  <Link href="/login" id="hero-get-started-btn" style={{ background: "white", color: "#1A3C2B", padding: "16px 40px", borderRadius: 9999, fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }} className="hover:scale-105 transition-all shadow-xl text-center">Get Started</Link>
                  <a href="#how-it-works" id="hero-docs-link" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "16px 40px", borderRadius: 9999, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }} className="hover:bg-white/10 transition-all text-center">Documentation</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Row (Bento) ── */}
        <section className="max-w-7xl mx-auto px-6 -mt-12 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "rgba(26,60,43,0.1)", border: "1px solid rgba(26,60,43,0.1)", overflow: "hidden" }}>
            {[
              { num: "01", label: "NETWORK", color: "#9EFFBF", value: "2", sub: "Supported Chains (Arbitrum, Base)" },
              { num: "02", label: "TECHNOLOGY", color: "#FF8C69", value: "EIP-7702", sub: "Account Delegation" },
              { num: "03", label: "SECURITY", color: "#F4D35E", value: "Verified", sub: "On-Chain Deployment" },
              { num: "04", label: "AUTHORIZATION", color: "#1A3C2B", value: "Session Keys", sub: "Scoped Execution" },
            ].map((s, i) => (
              <div key={i} className="sd-grid-cell reveal" style={{ animationDelay: `${i * 100}ms` }}>
                <div style={{ borderLeft: `4px solid ${s.color}`, paddingLeft: 16, marginBottom: 24 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "rgba(26,60,43,0.6)", textTransform: "uppercase", fontWeight: 700 }}>{s.num}. {s.label}</span>
                </div>
                <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 700, marginBottom: 8, color: "#1A3C2B" }}>{s.value}</h4>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(26,60,43,0.4)" }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Protocol Flow ── */}
        <section id="how-it-works" className="py-24" style={{ background: "white", borderTop: "1px solid var(--sd-grid-border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ marginBottom: 80 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(26,60,43,0.4)", display: "block", marginBottom: 16 }}>Infrastructure</span>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", color: "#1A3C2B", lineHeight: 1 }}>THE PROTOCOL FLOW</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "rgba(26,60,43,0.1)", border: "1px solid rgba(26,60,43,0.1)" }}>
              {[
                { num: "01. AUTHORIZE", color: "#9EFFBF", title: "Scoped Permissions", desc: "Grant cryptographically limited permissions. Restrict pulls by amount, frequency, and duration for absolute wallet safety." },
                { num: "02. SCAN", color: "#FF8C69", title: "Unified Liquidity", desc: "Our relayers scan your connected cross-chain addresses. We pull from where the funds sit, across Ethereum, Arbitrum, or Base." },
                { num: "03. SETTLE", color: "#F4D35E", title: "Auto-Execution", desc: "Decentralized triggers monitor billing cycles. At the precise moment of settlement, funds are moved and services unlocked." },
                { num: "04. VERIFY", color: "#1A3C2B", title: "On-Chain Proof", desc: "Every payment is an immutable event. Merchants receive instant proof, and subscribers get verifiable receipts in their dashboard." },
              ].map((c, i) => (
                <div key={i} className="sd-grid-cell reveal">
                  <div style={{ borderLeft: `4px solid ${c.color}`, paddingLeft: 16, marginBottom: 24 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.2em", color: "#1A3C2B", fontWeight: 700 }}>{c.num}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, marginBottom: 16, color: "#1A3C2B" }}>{c.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(26,60,43,0.6)", lineHeight: 1.7 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Deep Dive ── */}
        <section className="py-24" style={{ background: "#F7F7F5", borderTop: "1px solid var(--sd-grid-border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ marginBottom: 80 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(26,60,43,0.4)", display: "block", marginBottom: 16 }}>Technical Specifications</span>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", color: "#1A3C2B", lineHeight: 1 }}>DEEP DIVE</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: "rgba(26,60,43,0.1)", border: "1px solid rgba(26,60,43,0.1)" }}>
              {[
                { tag: "01. LATENCY", tagColor: "#9EFFBF", title: "Sub-10s Settlement", desc: "Optimized relayer mesh ensures transactions hit the mempool within seconds of billing triggers." },
                { tag: "02. ABSTRACTION", tagColor: "#FF8C69", title: "Gasless Execution", desc: "Users never sign for individual pulls. Merchants handle the gas costs through subsidized relay accounts." },
                { tag: "03. EXECUTION", tagColor: "#F4D35E", title: "Session Key Automation", desc: "A dedicated relayer executes scheduled pulls using cryptographically scoped session keys." },
              ].map((s, i) => (
                <div key={i} className="sd-grid-cell reveal">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: s.tagColor, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 16 }}>{s.tag}</span>
                  <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 16, color: "#1A3C2B" }}>{s.title}</h4>
                  <p style={{ fontSize: 14, color: "rgba(26,60,43,0.6)", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features: BUILT FOR SCALE ── */}
        <section id="features" className="py-24" style={{ backgroundColor: "#0D1F16", color: "white" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ marginBottom: 80 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", color: "white", marginBottom: 8, lineHeight: 1 }}>BUILT FOR SCALE</h2>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>Developer-First Infrastructure</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="reveal" style={{ background: "#0D1F16", padding: 48, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ borderLeft: "4px solid #9EFFBF", paddingLeft: 16, marginBottom: 32 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#9EFFBF", fontWeight: 700, textTransform: "uppercase" }}>01. INTERMEDIARIES</span>
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, marginBottom: 24, color: "white" }}>Zero Middlemen</h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>Direct p2p payment channels. No legacy processors taking 3.5% from every single interaction.</p>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: 24, border: "1px solid rgba(255,255,255,0.05)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(158,255,191,0.8)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8, marginBottom: 8, opacity: 0.5 }}>
                    <span style={{ color: "rgba(255,255,255,0.8)" }}>STX_HASH</span><span style={{ color: "rgba(255,255,255,0.8)" }}>AMT_USDC</span>
                  </div>
                  <div>0x7a2...f8c <span style={{ color: "white", marginLeft: 32 }}>49.99</span></div>
                  <div>0x9b1...e4a <span style={{ color: "white", marginLeft: 32 }}>12.50</span></div>
                </div>
              </div>
              <div className="reveal" style={{ background: "#0D1F16", padding: 48, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ borderLeft: "4px solid #FF8C69", paddingLeft: 16, marginBottom: 32 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#FF8C69", fontWeight: 700, textTransform: "uppercase" }}>02. ARCHITECTURE</span>
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, marginBottom: 24, color: "white" }}>Cross-Chain Native</h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>Fund your subscriptions with capital on any supported L2. Fragmented balances are a thing of the past.</p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {["ARBITRUM", "BASE"].map((n) => (
                    <div key={n} style={{ padding: "4px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.9)" }}>{n}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works (Onboarding) ── */}
        <section id="onboarding-flow" className="py-24" style={{ background: "white", borderTop: "1px solid var(--sd-grid-border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ marginBottom: 80 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(26,60,43,0.4)", display: "block", marginBottom: 16 }}>Start Your Journey</span>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", color: "#1A3C2B", textTransform: "uppercase", lineHeight: 1 }}>HOW IT WORKS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "rgba(26,60,43,0.1)", border: "1px solid rgba(26,60,43,0.1)" }}>
              {[
                { num: "01. Connect Wallet", color: "#FF8C69", title: "Secure Link", desc: "Link your Web3 wallet to Pact securely. We support all major EIP-7702 compliant wallets for safe, delegated permissions." },
                { num: "02. Choose Plan", color: "#9EFFBF", title: "Select Tier", desc: "Select a subscription plan that matches your needs. From basic access to enterprise-grade protocol features." },
                { num: "03. Authorize", color: "#FF8C69", title: "Authorize Subscription", desc: "Approve recurring payments with a single signature. No more manual monthly transactions or gas worries." },
                { num: "04. Billing", color: "#9EFFBF", title: "Automatic Billing", desc: "Seamless monthly billing powered by smart contracts. Your service remains active without ever lifting a finger." },
              ].map((s, i) => (
                <div key={i} className="sd-grid-cell reveal">
                  <div style={{ borderLeft: `4px solid ${s.color}`, paddingLeft: 16, marginBottom: 24 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.2em", color: "#1A3C2B", fontWeight: 700, textTransform: "uppercase" }}>{s.num}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, marginBottom: 16, color: "#1A3C2B" }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(26,60,43,0.6)", lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Integration Partners ── */}
        <section className="py-24 overflow-hidden" style={{ background: "#F7F7F5", borderTop: "1px solid var(--sd-grid-border)", borderBottom: "1px solid var(--sd-grid-border)" }}>
          <div className="max-w-7xl mx-auto px-6">
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.4em", color: "rgba(26,60,43,0.4)", marginBottom: 48 }}>Natively Integrated With</p>
            <div className="sd-partners-row">
              {["ETHEREUM", "ARBITRUM", "BASE"].map((n) => (
                <span key={n} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#1A3C2B" }}>{n}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-24" style={{ background: "white", borderTop: "1px solid var(--sd-grid-border)" }}>
          <div className="max-w-4xl mx-auto px-6">
            <div style={{ marginBottom: 64, textAlign: "center" }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 900, color: "#1A3C2B" }}>PROTOCOL FAQ</h2>
            </div>
            <div style={{ border: "1px solid var(--sd-grid-border)", background: "white" }}>
              {[
                { tag: "01. SECURITY", q: "Is my seed phrase ever shared?", a: "Never. All permissions are cryptographically scoped and granted via standard account delegation (EIP-7702). We only access specific amounts at specific times." },
                { tag: "02. EXECUTION", q: "How are recurring payments executed?", a: "Pact uses a dedicated relayer to execute authorized pulls on schedule. The relayer operates within the strict cryptographic bounds of your signed session key." },
                { tag: "03. CONTROL", q: "Can I revoke anytime?", a: "Yes. Your permissions are stored on-chain. You can revoke them directly from the Pact dashboard or via any standard block explorer interface." },
              ].map((f, i, arr) => (
                <div key={i} style={{ padding: 32, borderBottom: i < arr.length - 1 ? "1px solid var(--sd-grid-border)" : undefined }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(26,60,43,0.4)", textTransform: "uppercase", letterSpacing: "0.2em", display: "block", marginBottom: 8 }}>{f.tag}</span>
                  <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#1A3C2B" }}>{f.q}</h4>
                  <p style={{ fontSize: 14, color: "rgba(26,60,43,0.6)", lineHeight: 1.7 }}>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6" style={{ background: "white", borderTop: "1px solid var(--sd-grid-border)" }}>
          <div className="max-w-[640px] mx-auto relative reveal" style={{ padding: 64, border: "1px solid var(--sd-grid-border)", background: "white" }}>
            {/* Corner markers */}
            <span style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: "1.5px solid #1A3C2B", borderLeft: "1.5px solid #1A3C2B" }} />
            <span style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTop: "1.5px solid #1A3C2B", borderRight: "1.5px solid #1A3C2B" }} />
            <span style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottom: "1.5px solid #1A3C2B", borderLeft: "1.5px solid #1A3C2B" }} />
            <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: "1.5px solid #1A3C2B", borderRight: "1.5px solid #1A3C2B" }} />
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: "-0.03em", color: "#1A3C2B" }}>Ready to Initialize?</h2>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(26,60,43,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Join the next-gen subscription protocol</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Link href="/login" id="cta-get-started-btn" style={{ width: "100%", display: "block", padding: "24px 0", background: "#1A3C2B", color: "white", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", textAlign: "center" }} className="hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl">
                Get Started Now
              </Link>
              <p style={{ marginTop: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(26,60,43,0.4)", textTransform: "uppercase", letterSpacing: "0.2em", fontStyle: "italic" }}>Secure authentication via wallet signature</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--sd-grid-border)", paddingTop: 80, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px" style={{ background: "rgba(26,60,43,0.1)", border: "1px solid rgba(26,60,43,0.1)", overflow: "hidden" }}>
            <div style={{ background: "#F7F7F5", padding: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ width: 32, height: 32, background: "#1A3C2B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", fontSize: 12 }}>P</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.2em", fontWeight: 700, textTransform: "uppercase", color: "#1A3C2B" }}>Pact Protocol</span>
              </div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(26,60,43,0.4)", textTransform: "uppercase", lineHeight: 1.8 }}>Autonomous Recurring Payments Infrastructure.</p>
            </div>
            {[
              { title: "Network", links: ["Docs", "Privacy", "Terms of Service"] },
              { title: "Governance", links: ["Whitepaper", "Security Audits", "Github"] },
              { title: "Status", links: [] },
            ].map((col, i) => (
              <div key={i} style={{ background: "#F7F7F5", padding: 40 }}>
                <h5 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.3em", fontWeight: 700, textTransform: "uppercase", color: "rgba(26,60,43,0.4)", marginBottom: 32 }}>{col.title}</h5>
                {col.title === "Status" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#9EFFBF" }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "#1A3C2B" }}>Operational</span>
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                    {col.links.map((l) => (
                      <li key={l}><a href="#" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", color: "rgba(26,60,43,0.6)", textDecoration: "none" }} className="hover:text-forest transition-colors">{l}</a></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(26,60,43,0.4)", textTransform: "uppercase" }}>© 2024 PACT. FOUNDATION</span>
            <div style={{ display: "flex", gap: 32, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(26,60,43,0.4)", textTransform: "uppercase" }}>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
