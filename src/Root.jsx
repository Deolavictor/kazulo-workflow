import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./LoginPage";
import App from "./App";

function AppGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p className="loading-text">Carregando…</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <App />;
}

export default function Root() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
