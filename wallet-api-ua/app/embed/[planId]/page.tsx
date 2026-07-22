"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPlanDetails } from "@/lib/contracts";

export default function EmbedPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const searchParams = useSearchParams();
  const network = (searchParams.get("network") as "arbitrum" | "base") || "arbitrum";

  const [plan, setPlan] = useState<{ name: string; price: string; token: string; intervalDays: number; payoutAddress: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlanDetails(planId, network)
      .then(setPlan)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [planId, network]);

  const subscribeUrl = `${typeof window !== "undefined" ? window.location.origin : "https://pactxbt.vercel.app"}/subscribe?planId=${planId}&network=${network}`;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Space Mono', monospace, sans-serif;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: #F7F7F5;
            border: 1px solid rgba(58,58,56,0.2);
            padding: 24px;
            width: 280px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .label {
            font-size: 9px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            opacity: 0.4;
          }
          .plan-name {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            color: #1A3C2B;
          }
          .price {
            font-size: 22px;
            font-weight: 700;
            color: #1A3C2B;
          }
          .interval {
            font-size: 10px;
            opacity: 0.5;
            letter-spacing: 0.1em;
          }
          .btn {
            display: block;
            width: 100%;
            background: #1A3C2B;
            color: white;
            text-align: center;
            text-decoration: none;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            padding: 14px;
            border: none;
            cursor: pointer;
            transition: opacity 0.15s;
          }
          .btn:hover { opacity: 0.9; }
          .powered {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.3;
            text-align: center;
          }
          .powered a { color: inherit; text-decoration: none; }
          .powered a:hover { opacity: 0.7; }
          .skeleton {
            background: rgba(58,58,56,0.08);
            border-radius: 2px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        `}</style>
      </head>
      <body>
        <div className="card">
          {loading ? (
            <>
              <div className="skeleton" style={{ height: 10, width: 80 }} />
              <div className="skeleton" style={{ height: 18, width: 160 }} />
              <div className="skeleton" style={{ height: 28, width: 120 }} />
              <div className="skeleton" style={{ height: 44 }} />
            </>
          ) : plan ? (
            <>
              <div>
                <div className="label">Subscription Plan</div>
                <div className="plan-name">{plan.name}</div>
              </div>
              <div>
                <div className="price">{plan.price} {plan.token}</div>
                <div className="interval">Every {plan.intervalDays} days</div>
              </div>
              <a href={subscribeUrl} target="_blank" rel="noopener noreferrer" className="btn">
                Subscribe Now
              </a>
              <div className="powered">
                Powered by <a href="https://pactxbt.vercel.app" target="_blank" rel="noopener noreferrer">Pact Protocol</a>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, opacity: 0.5, textAlign: "center", padding: "16px 0" }}>
              Plan not found
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
