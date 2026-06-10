import React from "react";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export function MinhaContaView({ user }) {
  const roleLabel =
    user?.role === "viewer"
      ? "Somente visualização"
      : user?.role === "admin"
        ? "Administrador"
        : `Setor ${user?.sector || "—"}`;

  return (
    <div className="admin-page minha-conta-page">
      <div className="admin-page-header">
        <h2>Minha conta</h2>
        <p>Altere sua senha de acesso ao sistema</p>
      </div>

      <div className="admin-card">
        <h3>Dados do login</h3>
        <dl className="minha-conta-dl">
          <div>
            <dt>Usuário</dt>
            <dd>
              <code>{user?.username || "—"}</code>
            </dd>
          </div>
          <div>
            <dt>Nome</dt>
            <dd>{user?.name || "—"}</dd>
          </div>
          <div>
            <dt>Perfil</dt>
            <dd>{roleLabel}</dd>
          </div>
        </dl>
        <p className="admin-hint">
          Para mudar nome ou setor, peça ao administrador em <strong>Usuários</strong>.
        </p>
      </div>

      {user?.role === "viewer" ? (
        <div className="admin-card">
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Este acesso é somente leitura. Para alterar senha ou editar projetos, use login com
            usuário e senha.
          </p>
        </div>
      ) : (
        <div className="admin-card">
          <h3>Alterar senha</h3>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Informe a senha atual e escolha uma nova (mínimo 4 caracteres).
          </p>
          <ChangePasswordForm />
        </div>
      )}
    </div>
  );
}
