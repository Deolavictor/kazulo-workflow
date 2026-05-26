import React, { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { KazuloLogo } from "./components/KazuloLogo";

const HINT_USERS = [
  { user: "admin", label: "Administrador (acesso total)" },
  { user: "design", label: "Setor Design" },
  { user: "processos", label: "Setor Processos" },
  { user: "desenvolvimento", label: "Setor Desenvolvimento" },
  { user: "pcp", label: "Setor PCP" },
  { user: "compras", label: "Setor Compras" }
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      setError(err.message || "Falha no login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <KazuloLogo variant="login" />
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label>Usuário</label>
            <input
              autoComplete="username"
              placeholder="ex: design, admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label>Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary login-submit" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <div className="login-hint">
          <p><strong>Primeiro acesso?</strong> Use os logins criados no servidor:</p>
          <ul>
            {HINT_USERS.map((h) => (
              <li key={h.user}>
                <code>{h.user}</code> — {h.label}
              </li>
            ))}
          </ul>
          <p className="login-hint-foot">
            Senhas padrão definidas em <code>ADMIN_PASSWORD</code> e{" "}
            <code>DEFAULT_USER_PASSWORD</code> no servidor.
          </p>
        </div>
      </div>
    </div>
  );
}
