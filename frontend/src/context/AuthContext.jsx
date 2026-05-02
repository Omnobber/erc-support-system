import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEYS = ["token", "erc_token"];
const readStoredToken = () =>
  TOKEN_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((value) => Boolean(value)) || null;
const persistToken = (token) => {
  TOKEN_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, token));
};
const clearStoredAuth = () => {
  TOKEN_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("erc_user");
};
const getStoredUser = () => {
  const raw = localStorage.getItem("erc_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    localStorage.removeItem("erc_user");
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        localStorage.setItem("erc_user", JSON.stringify(data.user));
      } catch (_error) {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    persistToken(data.token);
    localStorage.setItem("erc_user", JSON.stringify(data.user));
    if (import.meta.env.DEV) {
      console.log("Auth token after login:", localStorage.getItem("token"));
    }
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      logout
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
