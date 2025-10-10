"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { walletService } from "@/lib/wallet";

interface WalletContextType {
  publicAddress: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userInfo: any | null;
  session: any | null;
  handleLogout: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<{ address: string | null }>({
    address: null,
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<any | null>(null);

  const router = useRouter();
  const { data: session, status } = useSession();

  // Update user info when session changes
  useEffect(() => {
    if (session?.user) {
      setUserInfo(session.user);
      setIsAuthenticated(true);
    } else {
      setUserInfo(null);
      setIsAuthenticated(false);
    }
  }, [session]);

  // Handle authentication status changes
  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
    } else if (status === "authenticated") {
      setIsAuthenticated(true);
      setIsLoading(false);
    } else if (status === "unauthenticated") {
      setIsAuthenticated(false);
      setIsLoading(false);
      setWallet({ address: null });
      router.push("/");
    }
  }, [status, router]);

  // Reusable function to create/fetch wallet address
  const createOrFetchWallet = useCallback(async () => {
    if (!isAuthenticated) return null;

    try {
      setIsLoading(true);
      const address = await walletService.getOrCreateWallet("ETH");
      setWallet({ address });
      return address;
    } catch (error: any) {
      // Only sign out if it's an auth-related error
      if (error.requiresReauth) {
        console.log("Auth error detected, signing out...");
        await signOut();
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load wallet address when authenticated
  useEffect(() => {
    if (isAuthenticated && !wallet.address) {
      createOrFetchWallet();
    }
  }, [isAuthenticated, wallet.address, createOrFetchWallet]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut({ callbackUrl: "/" });
      setWallet({ address: null });
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  const value: WalletContextType = {
    publicAddress: wallet.address,
    isAuthenticated,
    isLoading,
    userInfo,
    session,
    handleLogout,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
