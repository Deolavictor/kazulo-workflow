import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const SECTORS = ["Design", "Processos", "Desenvolvimento", "PCP", "Compras"];

const emptyForm = {
  username: "",
  name: "",
  password: "",
  role: "sector",
  sector: "Design"
};

export function UsuariosView({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { users: list } = await api.fetchUsers();
      setUsers(list);
    } catch (err) {
      setError(err.message || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createUser(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err.message || "Não foi possível criar o usuário");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(user, patch) {
    try {
      await api.updateUser(user.id, patch);
      await load();
    } catch (err) {
      alert(err.message || "Falha ao atualizar");
    }
  }

  async function handleResetPassword(user) {
    const password = window.prompt(`Nova senha para ${user.username}:`);
    if (!password) return;
    try {
      await api.resetUserPassword(user.id, password);
      alert("Senha atualizada.");
    } catch (err) {
      alert(err.message || "Falha ao redefinir senha");
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Excluir o usuário "${user.name}" (${user.username})?`)) return;
    try {
      await api.deleteUser(user.id);
      await load();
    } catch (err) {
      alert(err.message || "Não foi possível excluir");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Usuários</h2>
        <p>Gerencie contas de acesso ao workflow (administrador e setores)</p>
      </div>

      {error && <div className="sync-error-banner">{error}</div>}
      {loading ? (
        <div className="board-loading">Carregando usuários…</div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Nome</th>
                <th>Perfil</th>
                <th>Setor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><code>{u.username}</code></td>
                  <td>
                    <input
                      className="admin-inline-input"
                      defaultValue={u.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== u.name) handleUpdate(u, { name: v });
                      }}
                    />
                  </td>
                  <td>
                    <select
                      className="filter-select"
                      value={u.role}
                      disabled={u.id === currentUserId}
                      onChange={(e) =>
                        handleUpdate(u, {
                          role: e.target.value,
                          sector: e.target.value === "admin" ? null : u.sector || "Design"
                        })
                      }
                    >
                      <option value="admin">Administrador</option>
                      <option value="sector">Setor</option>
                    </select>
                  </td>
                  <td>
                    {u.role === "sector" ? (
                      <select
                        className="filter-select"
                        value={u.sector || "Design"}
                        onChange={(e) => handleUpdate(u, { sector: e.target.value })}
                      >
                        {SECTORS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="admin-actions-cell">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => handleResetPassword(u)}
                    >
                      Redefinir senha
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        className="btn-danger-outline btn-sm"
                        onClick={() => handleDelete(u)}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-card">
        <h3>Novo usuário</h3>
        <form className="admin-form-grid" onSubmit={handleCreate}>
          <label>
            Login
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ex: compras2"
            />
          </label>
          <label>
            Nome exibido
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Senha inicial
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            Perfil
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="sector">Setor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {form.role === "sector" && (
            <label>
              Setor
              <select
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          <div className="admin-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando…" : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
