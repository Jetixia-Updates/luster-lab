/**
 * Authentication Context
 * Manages user session, login/logout, and role-based access
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, setAuthToken, getAuthToken } from "@/lib/api";
import type { User, UserRole } from "@shared/api";

interface AuthContextType {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const splash = document.getElementById("splash");
      if (splash) {
        splash.style.opacity = "0";
        setTimeout(() => splash.remove(), 400);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    // Try to restore session
    const token = getAuthToken();
    if (token) {
      api.get<any>("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          setAuthToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post<any>("/auth/login", { username, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
