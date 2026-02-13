import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AdminAuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totp?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const ADMIN_TOKEN_KEY = "cg_admin_token";
const ADMIN_TOKEN_EXPIRY_KEY = "cg_admin_token_expiry";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY);

    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTime) {
        setToken(storedToken);
      } else {
        // Token expired, clean up
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, totp?: string) => {
    try {
      const response = await fetch("/.netlify/functions/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, totp }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      // Store token
      const { token: newToken, expiresIn } = data;
      const expiryTime = Date.now() + expiresIn * 1000;

      localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
      localStorage.setItem(ADMIN_TOKEN_EXPIRY_KEY, expiryTime.toString());
      setToken(newToken);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
    setToken(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
