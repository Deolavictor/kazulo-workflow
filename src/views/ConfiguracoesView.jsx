import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const CRON_HINT = "Ex.: 0 17 * * 1-5 = seg–sex às 17h (minuto hora dia mês dia-semana)";

export function ConfiguracoesView() {
  const [settings, setSettings] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [sendMsg, setSendMsg] = useState("");
  const [backups, setBackups] = useState([]);
  const [backupConfig, setBackupConfig] = useState(null);
  const [backupRunning, setBackupRunning] = useState(false);
  const [persistence, setPersistence] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, statusRes, backupsRes, persistenceRes] = await Promise.all([
        api.fetchSettings(),
        api.dailyReportStatus(),
        api.fetchBackups(),
        api.fetchPersistence()
      ]);
      setSettings(settingsRes.settings);
      setEmailStatus(statusRes);
      setBackups(backupsRes.backups || []);
      setBackupConfig(backupsRes.config || null);
      setPersistence(persistenceRes);
    } catch (err) {
      alert(err.message || "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patch(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setEmailStatus(res.emailStatus);
      alert("Configurações salvas. O agendamento do e-mail foi reiniciado.");
    } catch (err) {
      alert(err.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifyMsg("");
    try {
      const res = await api.verifyEmail();
      setVerifyMsg(
        `Conexão OK (${res.provider}${res.email ? ` — ${res.email}` : ""})`
      );
    } catch (err) {
      setVerifyMsg(err.message || "Falha na verificação");
    }
  }

  async function handleRunBackup() {
    setBackupRunning(true);
    try {
      await api.runBackup();
      const res = await api.fetchBackups();
      setBackups(res.backups || []);
      alert("Backup criado com sucesso.");
    } catch (err) {
      alert(err.message || "Falha no backup");
    } finally {
      setBackupRunning(false);
    }
  }

  async function handleRestoreBackup(filename) {
    if (
      !window.confirm(
        `Restaurar "${filename}"? Os dados atuais serão substituídos (uma cópia de segurança é gerada antes).`
      )
    ) {
      return;
    }
    setBackupRunning(true);
    try {
      const res = await api.restoreBackup(filename);
      await load();
      alert(
        res.message ||
          `Restaurado (${res.projectCount} projeto(s)). Recarregue a página se a lista não atualizar.`
      );
    } catch (err) {
      alert(err.message || "Falha ao restaurar");
    } finally {
      setBackupRunning(false);
    }
  }

  async function handleSendTest() {
    if (!window.confirm("Enviar relatório de atrasos agora para os destinatários configurados?")) {
      return;
    }
    setSendMsg("");
    try {
      const res = await api.sendDailyReport();
      setSendMsg(
        `Enviado (${res.totalOverdue} atrasos) — ${res.recipients?.join(", ") || "ok"}`
      );
    } catch (err) {
      setSendMsg(err.message || "Falha no envio");
    }
  }

  if (loading || !settings) {
    return <div className="board-loading">Carregando configurações…</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Configurações</h2>
        <p>Relatório diário por e-mail e URL pública do sistema</p>
      </div>

      {persistence && (
        <div
          className={`persistence-banner ${persistence.dataAtRisk ? "persistence-banner--risk" : "persistence-banner--ok"}`}
        >
          <h3>Persistência dos dados</h3>
          {persistence.dataAtRisk ? (
            <>
              <p>
                <strong>Atenção:</strong> o banco não está no volume do Railway. Cada deploy ou
                crash pode apagar projetos e usuários. Isso explica perda de conteúdo após
                atualizações do site.
              </p>
              <ol className="persistence-steps">
                <li>
                  Railway → serviço → <strong>Volumes</strong> → Add Volume → Mount Path{" "}
                  <code>{persistence.recommended.volumeMountPath}</code>
                </li>
                <li>
                  Variables: <code>DB_PATH={persistence.recommended.DB_PATH}</code> e{" "}
                  <code>BACKUP_DIR={persistence.recommended.BACKUP_DIR}</code>
                </li>
                <li>Redeploy e confira se esta mensagem sumiu</li>
              </ol>
            </>
          ) : (
            <>
              <p>
                <strong>Dados protegidos.</strong> Banco em{" "}
                <code>{persistence.dbPath}</code> — {persistence.projectCount} projeto(s) no
                servidor. Backups em <code>{persistence.backupDir}</code>.
              </p>
              {persistence.lifecycle && (
                <p className="persistence-lifecycle">
                  Backup automático: ao <strong>subir</strong> o servidor, após{" "}
                  <strong>alterações</strong> nos projetos (~1 min), ao <strong>desligar</strong>{" "}
                  (deploy) e diário às 03h. Se o banco vier vazio, tenta{" "}
                  <strong>restaurar</strong> o backup mais recente com projetos.
                </p>
              )}
              {persistence.latestBackup && (
                <p className="persistence-lifecycle">
                  Última cópia: <code>{persistence.latestBackup.filename}</code> (
                  {new Date(persistence.latestBackup.createdAt).toLocaleString("pt-BR")})
                </p>
              )}
            </>
          )}
          {persistence.warnings?.length > 0 && (
            <ul className="persistence-warnings">
              {persistence.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {emailStatus && (
        <div className={`admin-status-banner ${emailStatus.ready ? "ok" : "warn"}`}>
          {emailStatus.ready ? (
            <span>
              E-mail pronto — provedor <strong>{emailStatus.provider}</strong>, cron{" "}
              <code>{emailStatus.cron}</code> ({emailStatus.timezone})
            </span>
          ) : (
            <span>
              E-mail incompleto: {emailStatus.missingVars?.join(", ") || "verifique as variáveis"}
              {emailStatus.railwayHint ? ` — ${emailStatus.railwayHint}` : ""}
            </span>
          )}
        </div>
      )}

      <form className="admin-card" onSubmit={handleSave}>
        <h3>Relatório diário de atrasos</h3>
        <label className="admin-check-row">
          <input
            type="checkbox"
            checked={!!settings.daily_report_enabled}
            onChange={(e) => patch("daily_report_enabled", e.target.checked)}
          />
          Relatório automático ativo
        </label>

        <label className="admin-field">
          Destinatários (vírgula ou ponto-e-vírgula)
          <textarea
            rows={3}
            value={settings.daily_report_to || ""}
            onChange={(e) => patch("daily_report_to", e.target.value)}
            placeholder='Rodolfo <email@empresa.com>, Walter <outro@empresa.com>'
          />
        </label>

        <div className="admin-form-grid admin-form-grid--2">
          <label className="admin-field">
            Expressão CRON
            <input
              value={settings.daily_report_cron || ""}
              onChange={(e) => patch("daily_report_cron", e.target.value)}
            />
            <span className="admin-hint">{CRON_HINT}</span>
          </label>
          <label className="admin-field">
            Fuso horário
            <input
              value={settings.daily_report_tz || ""}
              onChange={(e) => patch("daily_report_tz", e.target.value)}
            />
          </label>
        </div>

        <h3>Remetente e site</h3>
        <div className="admin-form-grid admin-form-grid--2">
          <label className="admin-field">
            E-mail remetente (Brevo)
            <input
              value={settings.email_sender_email || ""}
              onChange={(e) => patch("email_sender_email", e.target.value)}
            />
          </label>
          <label className="admin-field">
            Nome do remetente
            <input
              value={settings.email_sender_name || ""}
              onChange={(e) => patch("email_sender_name", e.target.value)}
            />
          </label>
        </div>

        <label className="admin-field">
          URL pública do sistema
          <input
            value={settings.public_site_url || ""}
            onChange={(e) => patch("public_site_url", e.target.value)}
          />
          <span className="admin-hint">Usada no e-mail de apresentação e links externos</span>
        </label>

        <p className="admin-hint admin-hint--box">
          A chave <strong>BREVO_API_KEY</strong> continua apenas nas variáveis do Railway (não é
          salva no banco por segurança).
        </p>

        <div className="admin-form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar configurações"}
          </button>
          <button type="button" className="btn-secondary" onClick={handleVerify}>
            Testar conexão Brevo
          </button>
          <button type="button" className="btn-secondary" onClick={handleSendTest}>
            Enviar relatório agora
          </button>
        </div>
        {verifyMsg && <p className="admin-hint">{verifyMsg}</p>}
        {sendMsg && <p className="admin-hint">{sendMsg}</p>}
      </form>

      <div className="admin-card">
        <h3>Backup do banco de dados</h3>
        {backupConfig && (
          <p className="admin-hint">
            Diário: {backupConfig.enabled ? "ativo" : "desativado"} — cron{" "}
            <code>{backupConfig.cron}</code> — mantém {backupConfig.retainCount} cópias em{" "}
            <code>{backupConfig.backupDir}</code>. Também salva ao alterar projetos, ao iniciar o
            servidor e antes de cada deploy (desligamento).
          </p>
        )}
        <div className="admin-form-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={backupRunning}
            onClick={handleRunBackup}
          >
            {backupRunning ? "Gerando…" : "Backup agora"}
          </button>
        </div>
        {backups.length === 0 ? (
          <p className="admin-hint">Nenhum backup salvo ainda.</p>
        ) : (
          <table className="admin-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Data</th>
                <th>Tamanho</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename}>
                  <td><code>{b.filename}</code></td>
                  <td>{new Date(b.createdAt).toLocaleString("pt-BR")}</td>
                  <td>{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => api.downloadBackup(b.filename)}
                    >
                      Baixar
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={backupRunning}
                      onClick={() => handleRestoreBackup(b.filename)}
                    >
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="admin-hint admin-hint--box">
          No Railway com volume, use <code>BACKUP_DIR=/data/backups</code> junto com{" "}
          <code>DB_PATH=/data/kazulo.db</code>. Guia de domínio: <code>docs/DOMINIO.md</code>.
        </p>
      </div>
    </div>
  );
}
