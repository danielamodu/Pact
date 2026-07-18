"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { getOrCreateWallet } from "@/lib/express-proxy";

interface AuthContextType {
  publicAddress: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userInfo: Session["user"] | null;
  session: Session | null;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<{ address: string | null }>({
    address: null,
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<Session["user"] | null>(null);

  const router = useRouter();
  const pathname = usePathname();
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
      if (pathname !== "/" && pathname !== "/login") {
        router.push("/");
      }
    }
  }, [status, router, pathname]);

  // Reusable function to create/fetch wallet address
  const createOrFetchWallet = useCallback(async () => {
    if (!isAuthenticated) return null;

    try {
      setIsLoading(true);
      const data = await getOrCreateWallet("ETH");
      const address = data.public_address;
      setWallet({ address });
      return address;
    } catch (error: unknown) {
      // Only sign out if it's an auth-related error
      if (error && typeof error === "object" && "requiresReauth" in error) {
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

  const value: AuthContextType = {
    publicAddress: wallet.address,
    isAuthenticated,
    isLoading,
    userInfo,
    session,
    handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
