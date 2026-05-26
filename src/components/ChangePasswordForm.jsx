import React, { useState } from "react";
import { api } from "../api/client";

export function ChangePasswordForm({ compact = false }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: ""
  });
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (form.newPassword !== form.confirm) {
      setMsg("A confirmação não coincide.");
      return;
    }
    try {
      await api.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setMsg("Senha alterada.");
    } catch (err) {
      setMsg(err.message || "Falha ao alterar senha");
    }
  }

  return (
    <form className={compact ? "change-pwd-compact" : "admin-form-grid admin-form-grid--narrow"} onSubmit={handleSubmit}>
      <label>
        Senha atual
        <input
          type="password"
          required
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
      </label>
      <label>
        Nova senha
        <input
          type="password"
          required
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
      </label>
      <label>
        Confirmar
        <input
          type="password"
          required
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
      </label>
      <button type="submit" className={compact ? "btn-secondary btn-sm" : "btn-primary"}>
        Alterar senha
      </button>
      {msg && <p className="admin-hint">{msg}</p>}
    </form>
  );
}
