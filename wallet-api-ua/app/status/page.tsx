"use client";

import { useEffect, useState } from "react";
import { NavigationBar } from "@/components/NavigationBar";

interface KeeperHealth {
  status: "ok" | "degraded";
  checks: { keeperKey: boolean; database: boolean; encryptionKey: boolean };
  keeperWallet: { address: string; balances: Record<string, string> } | null;
  delegations: { total: number; byNetwork: Record<string, number> } | null;
  lastRun: { total: number; executed: number; skipped: number; errors: number; ran_at: string } | null;
  problems: string[];
}

export default function StatusPage() {
  const [health, setHealth] = useState<KeeperHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/keeper/execute-pulls");
      setHealth(await res.json());
    } catch (err: any) {
      setFetchError(err?.message || "Could not reach the keeper endpoint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const healthy = health?.status === "ok";

  return (
    <div className="min-h-screen relative flex flex-col bg-paper text-forest">
      <div className="mosaic-bg"></div>
      <NavigationBar />

      <main className="flex-1 pt-28 pb-12">
        <div className="max-w-4xl mx-auto px-6 space-y-6">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="font-space text-5xl font-bold tracking-tighter leading-none text-forest uppercase">
                Keeper Status
              </h1>
              <p className="font-mono text-[10px] uppercase opacity-40 mt-2">
                Live health of the autonomous billing keeper
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={load}
                className="font-mono text-[9px] uppercase tracking-widest border border-forest/20 px-4 py-2.5 hover:bg-forest hover:text-white transition-colors cursor-pointer"
              >
                Refresh
              </button>
              {health && (
                <div className={`inline-flex items-center gap-2 border px-3 py-2 ${
                  healthy
                    ? "border-forest/20 bg-[#9EFFBF]/20 text-forest"
                    : "border-coral/30 bg-coral/10 text-coral"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${healthy ? "bg-forest" : "bg-coral"}`}></div>
                  <span className="font-mono text-[10px] tracking-widest uppercase font-bold">
                    {healthy ? "Operational" : "Degraded"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white border border-[#3A3A38]/20 p-12 text-center font-mono text-sm opacity-60">
              Querying keeper health...
            </div>
          ) : fetchError ? (
            <div className="border border-coral bg-coral/5 p-6 font-mono text-xs text-coral">
              {fetchError}
            </div>
          ) : health ? (
            <>
              {health.problems.length > 0 && (
                <section className="bg-coral/5 border border-coral/30 border-l-[4px] border-l-coral p-6">
                  <h3 className="font-space text-lg font-bold uppercase tracking-tight text-coral mb-3">
                    {health.problems.length} problem{health.problems.length > 1 ? "s" : ""} blocking billing
                  </h3>
                  <ul className="space-y-2">
                    {health.problems.map((p, i) => (
                      <li key={i} className="font-mono text-[11px] leading-relaxed text-[#3A3A38] flex gap-2">
                        <span className="text-coral flex-shrink-0">→</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Keeper Key", ok: health.checks.keeperKey },
                  { label: "Database", ok: health.checks.database },
                  { label: "Encryption Key", ok: health.checks.encryptionKey },
                ].map(({ label, ok }) => (
                  <div key={label} className="relative bg-white border border-[#3A3A38]/15 p-6">
                    <div className="corner-marker corner-tl"></div>
                    <div className="corner-marker corner-br"></div>
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-2">{label}</span>
                    <span className={`font-space text-2xl font-bold ${ok ? "text-forest" : "text-coral"}`}>
                      {ok ? "Configured" : "Missing"}
                    </span>
                  </div>
                ))}
              </section>

              <section className="bg-white border border-[#3A3A38]/15">
                <div className="px-6 py-5 border-b border-[#3A3A38]/10">
                  <h3 className="font-space text-lg font-bold uppercase tracking-tight">Keeper Wallet</h3>
                  <p className="font-mono text-[9px] uppercase opacity-40 mt-0.5">Pays gas to fund session keys</p>
                </div>
                <div className="p-6 space-y-4">
                  {health.keeperWallet ? (
                    <>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-1">Address</span>
                        <span className="font-mono text-[11px] font-bold break-all">{health.keeperWallet.address}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(health.keeperWallet.balances).map(([net, bal]) => (
                          <div key={net}>
                            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 block mb-1">{net}</span>
                            <span className={`font-mono text-sm font-bold ${bal === "0.0" ? "text-coral" : ""}`}>{bal} ETH</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="font-mono text-[11px] text-coral">No keeper wallet — private key missing or invalid.</p>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-[#3A3A38]/15">
                  <div className="px-6 py-5 border-b border-[#3A3A38]/10">
                    <h3 className="font-space text-lg font-bold uppercase tracking-tight">Stored Delegations</h3>
                  </div>
                  <div className="p-6">
                    <span className={`font-space text-4xl font-bold ${health.delegations?.total ? "text-forest" : "text-coral"}`}>
                      {health.delegations?.total ?? "—"}
                    </span>
                    <div className="mt-4 space-y-1">
                      {Object.entries(health.delegations?.byNetwork ?? {}).map(([net, n]) => (
                        <div key={net} className="flex justify-between font-mono text-[10px]">
                          <span className="uppercase opacity-40">{net}</span>
                          <span className="font-bold">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-[#3A3A38]/15">
                  <div className="px-6 py-5 border-b border-[#3A3A38]/10">
                    <h3 className="font-space text-lg font-bold uppercase tracking-tight">Last Run</h3>
                  </div>
                  <div className="p-6">
                    {health.lastRun ? (
                      <div className="space-y-3">
                        <span className="font-mono text-[10px] opacity-40 block">
                          {new Date(health.lastRun.ran_at).toLocaleString()}
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            ["Total", health.lastRun.total],
                            ["Executed", health.lastRun.executed],
                            ["Skipped", health.lastRun.skipped],
                            ["Errors", health.lastRun.errors],
                          ].map(([label, val]) => (
                            <div key={String(label)}>
                              <span className="font-mono text-[8px] uppercase tracking-widest opacity-40 block">{label}</span>
                              <span className="font-space text-xl font-bold">{val as number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-[11px] opacity-40">No run recorded yet.</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
