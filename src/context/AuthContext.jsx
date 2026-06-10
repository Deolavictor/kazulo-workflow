import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("kazulo-token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const mePromise = api.me();
      const timeoutPromise = new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("timeout")), 15000);
      });
      const { user: me } = await Promise.race([mePromise, timeoutPromise]);
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function login(username, password) {
    const { token, user: logged } = await api.login(username, password);
    setToken(token);
    setUser(logged);
    return logged;
  }

  async function loginAsViewer() {
    const { token, user: logged } = await api.loginAsViewer();
    setToken(token);
    setUser(logged);
    return logged;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";
  const readOnly = isViewer;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginAsViewer,
        logout,
        isAdmin,
        isViewer,
        readOnly,
        reloadSession: loadSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
