/**
 * Openfort Funding — cross-chain deposits into a Pact wallet.
 *
 * A Pact user signs in with Google and gets a wallet, but that wallet starts
 * empty and the old deposit screen just showed an address and said "send ETH
 * on Arbitrum or Base" — a dead end for anyone whose money is on a different
 * chain, in a different token, or on an exchange.
 *
 * Openfort's funding sessions solve exactly that: the user picks whatever they
 * already hold, Openfort mints a deposit address for it, and the bridging and
 * swapping happen on their side so the Pact wallet ends up with the asset it
 * actually needs.
 *
 * This route proxies the three calls so the publishable key lives in one place
 * and callers can't hand us a malformed target.
 *
 *   POST   { action: "create",   target }   -> { id, clientSecret, status }
 *   POST   { action: "activate", id, clientSecret, source } -> receiverAddress, fees
 *   GET    ?id=&clientSecret=               -> session status
 */

import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

const OPENFORT_API = "https://api.openfort.io/v2/funding/sessions";
const PUBLISHABLE_KEY = process.env.OPENFORT_PUBLISHABLE_KEY;

// Chains a Pact wallet can be topped up *to*. Deliberately narrow: these are
// the only networks Pact settles subscriptions on.
const DESTINATION_CHAINS: Record<string, string> = {
  arbitrum: "eip155:42161",
  base: "eip155:8453",
};

// Chains a user can pay *from*. Wider on purpose — the whole point is letting
// someone fund from wherever their money already sits.
const SOURCE_CHAINS: Record<string, { caip2: string; usdc: string; label: string }> = {
  ethereum: { caip2: "eip155:1", usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", label: "Ethereum" },
  base: { caip2: "eip155:8453", usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", label: "Base" },
  arbitrum: { caip2: "eip155:42161", usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", label: "Arbitrum" },
  polygon: { caip2: "eip155:137", usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", label: "Polygon" },
  optimism: { caip2: "eip155:10", usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", label: "Optimism" },
};

const NATIVE = "0x0000000000000000000000000000000000000000";

const USDC_BY_DESTINATION: Record<string, string> = {
  arbitrum: SOURCE_CHAINS.arbitrum.usdc,
  base: SOURCE_CHAINS.base.usdc,
};

function notConfigured() {
  // Surfaced as a normal response, not a 500 — the caller falls back to the
  // plain deposit-address view rather than showing the user an error.
  return NextResponse.json(
    { available: false, reason: "Funding is not configured on this deployment." },
    { status: 200 }
  );
}

async function openfort(path: string, init: RequestInit) {
  const res = await fetch(`${OPENFORT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `Openfort funding error (HTTP ${res.status})`);
  }
  return body;
}

export async function POST(req: Request) {
  if (!PUBLISHABLE_KEY) return notConfigured();

  try {
    const body = await req.json();

    if (body.action === "create") {
      const { address, network, asset } = body;

      if (!address || !ethers.isAddress(address)) {
        return NextResponse.json({ error: "A valid destination address is required." }, { status: 400 });
      }
      const chain = DESTINATION_CHAINS[network];
      if (!chain) {
        return NextResponse.json({ error: "Destination must be arbitrum or base." }, { status: 400 });
      }
      // ETH covers gas; USDC covers the subscription itself.
      const currency = asset === "usdc" ? USDC_BY_DESTINATION[network] : NATIVE;

      const session = await openfort("", {
        method: "POST",
        body: JSON.stringify({ target: { chain, currency, address } }),
      });

      return NextResponse.json({
        available: true,
        id: session.id,
        clientSecret: session.clientSecret,
        status: session.status,
      });
    }

    if (body.action === "activate") {
      const { id, clientSecret, sourceChain, sourceAsset, amount } = body;
      if (!id || !clientSecret) {
        return NextResponse.json({ error: "Missing session id or clientSecret." }, { status: 400 });
      }
      const src = SOURCE_CHAINS[sourceChain];
      if (!src) {
        return NextResponse.json({ error: "Unsupported source chain." }, { status: 400 });
      }
      if (!amount || !/^\d+$/.test(String(amount))) {
        return NextResponse.json({ error: "Amount must be a positive integer in base units." }, { status: 400 });
      }

      const activated = await openfort(`/${id}/payment_methods`, {
        method: "POST",
        body: JSON.stringify({
          clientSecret,
          paymentMethod: {
            type: "evm",
            source: {
              chain: src.caip2,
              currency: sourceAsset === "native" ? NATIVE : src.usdc,
              amount: String(amount),
            },
          },
        }),
      });

      return NextResponse.json({
        available: true,
        status: activated.status,
        receiverAddress: activated.paymentMethod?.receiverAddress ?? null,
        addressUri: activated.paymentMethod?.addressUri ?? null,
        minAmount: activated.paymentMethod?.minAmount ?? null,
        fees: activated.paymentMethod?.fees ?? [],
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err: any) {
    console.error("[funding]", err);
    return NextResponse.json({ error: err.message || "Funding request failed." }, { status: 502 });
  }
}

export async function GET(req: Request) {
  if (!PUBLISHABLE_KEY) return notConfigured();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const clientSecret = searchParams.get("clientSecret");
  if (!id || !clientSecret) {
    return NextResponse.json({ error: "Missing id or clientSecret." }, { status: 400 });
  }

  try {
    const session = await openfort(`/${id}?clientSecret=${encodeURIComponent(clientSecret)}`, {
      method: "GET",
    });
    return NextResponse.json({
      available: true,
      status: session.status,
      receiverAddress: session.paymentMethod?.receiverAddress ?? null,
    });
  } catch (err: any) {
    console.error("[funding:status]", err);
    return NextResponse.json({ error: err.message || "Could not read funding status." }, { status: 502 });
  }
}
