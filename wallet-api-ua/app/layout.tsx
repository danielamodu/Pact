import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthProvider";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Pact",
  description: "Secure cross-chain billing subscription registry using EIP-7702 and Universal Accounts",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/logo-square.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
