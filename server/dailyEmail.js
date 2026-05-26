import { getAllProjects } from "./db.js";
import { buildDailyOverdueReport } from "./overdueReport.js";
import { formatDateBr } from "./workflowCalculations.js";
import { buildWelcomeEmailHtml as buildWelcomeHtml } from "./welcomeEmailTemplate.js";
import { getSetting } from "./appSettings.js";
import {
  sendEmail,
  isEmailConfigured,
  getDailyEmailConfigStatus,
  verifyEmailConnection,
  parseRecipientObjects
} from "./emailDelivery.js";

export { isEmailConfigured, getDailyEmailConfigStatus, verifyEmailConnection };

const STAGE_ICONS = {
  Design: "🎨",
  Processos: "⚙",
  Desenvolvimento: "🔧",
  PCP: "📋",
  Compras: "🛒"
};

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOverdueTable(rows) {
  if (rows.length === 0) {
    return "<p style='color:#64748b;margin:8px 0'>Nenhuma atividade em atraso neste setor.</p>";
  }

  const trs = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.projectName)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.client)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.label)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${formatDateBr(r.dueDate)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.statusLabel)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600">${r.daysLate} d</td>
    </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="background:#f1f5f9;text-align:left">
          <th style="padding:8px">Projeto</th>
          <th style="padding:8px">Cliente</th>
          <th style="padding:8px">Atividade</th>
          <th style="padding:8px">Prazo</th>
          <th style="padding:8px">Status</th>
          <th style="padding:8px">Atraso</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;
}

export function buildDailyReportHtml(report) {
  const sectorBlocks = report.sectors
    .map((s) => {
      const icon = STAGE_ICONS[s.stage] || "•";
      return `
      <div style="margin-bottom:28px">
        <h2 style="color:#1e40af;font-size:18px;margin:0 0 4px">
          ${icon} ${escapeHtml(s.stage)}
          <span style="font-size:14px;color:#64748b;font-weight:normal">
            — ${s.overdue.length} em atraso
          </span>
        </h2>
        ${buildOverdueTable(s.overdue)}
      </div>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;line-height:1.45;max-width:900px;margin:0 auto;padding:16px">
  <div style="border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:20px">
    <h1 style="margin:0;font-size:22px;color:#1e3a8a">KAZULO — Workflow Industrial</h1>
    <p style="margin:8px 0 0;color:#475569">Relatório diário de atividades em atraso</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:14px">
      Data: <strong>${escapeHtml(report.dateLabel)}</strong> ·
      Total em atraso: <strong style="color:#dc2626">${report.totalOverdue}</strong>
    </p>
  </div>
  <p style="font-size:13px;color:#64748b">
    Projetos ativos considerados. Regra igual à aba Relatórios:
    prazo vencido ou início de produção passou (itens críticos).
  </p>
  ${sectorBlocks}
  <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px">
    E-mail automático — não responda. Kazulo Workflow.
  </p>
</body>
</html>`;
}

export async function sendDailyOverdueEmail(projects = null) {
  if (!isEmailConfigured()) {
    throw new Error(
      "E-mail não configurado. No Railway use BREVO_API_KEY + DAILY_REPORT_TO + EMAIL_SENDER_EMAIL."
    );
  }

  const list = projects ?? getAllProjects();
  const report = buildDailyOverdueReport(list);
  const html = buildDailyReportHtml(report);
  const subject =
    report.totalOverdue > 0
      ? `[KAZULO] ${report.totalOverdue} atividades em atraso — ${report.dateLabel}`
      : `[KAZULO] Nenhuma atividade em atraso — ${report.dateLabel}`;

  const sent = await sendEmail({
    subject,
    html,
    text: buildPlainTextReport(report)
  });

  return {
    messageId: sent.messageId,
    provider: sent.provider,
    recipients: parseRecipientObjects().map((r) => r.email),
    totalOverdue: report.totalOverdue,
    dateLabel: report.dateLabel
  };
}

function buildPlainTextReport(report) {
  const lines = [
    `KAZULO — Relatório diário (${report.dateLabel})`,
    `Total em atraso: ${report.totalOverdue}`,
    ""
  ];

  for (const { stage, overdue } of report.sectors) {
    lines.push(`=== ${stage} (${overdue.length}) ===`);
    if (overdue.length === 0) {
      lines.push("  (nenhuma)");
    } else {
      for (const r of overdue) {
        lines.push(
          `  - ${r.projectName} | ${r.label} | ${r.daysLate}d | prazo ${formatDateBr(r.dueDate)}`
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

const DEFAULT_SITE_URL = "https://kazulo-workflow-production.up.railway.app";

function getWelcomeConfig() {
  return {
    siteUrl: (getSetting("public_site_url") || DEFAULT_SITE_URL).replace(/\/$/, ""),
    loginUser: process.env.WELCOME_LOGIN_USER || "admin",
    loginPassword: process.env.WELCOME_LOGIN_PASSWORD || ""
  };
}

export function buildWelcomeEmailHtml() {
  const { siteUrl, loginUser, loginPassword } = getWelcomeConfig();
  return buildWelcomeHtml({ siteUrl, loginUser, loginPassword });
}

function buildWelcomePlainText() {
  const { siteUrl, loginUser, loginPassword } = getWelcomeConfig();
  const lines = [
    "KAZULO — Workflow Industrial",
    "",
    "Prezados Rodolfo, Walter e Cristian,",
    "",
    "Apresentamos o KAZULO Workflow Industrial, sistema de acompanhamento dos projetos da Kazulo.",
    "",
    "Recursos: Kanban por setor, checklist, dashboard, calendário, previsões, relatórios em PDF.",
    "Relatório automático de atrasos: seg–sex às 17h (Brasília).",
    "",
    "Como acessar:",
    siteUrl
  ];
  if (loginPassword) {
    lines.push(`Usuário: ${loginUser}`, `Senha: ${loginPassword}`);
  }
  lines.push("", "Atenciosamente,", "Equipe KAZULO — Workflow Industrial");
  return lines.join("\n");
}

export async function sendWelcomeEmail() {
  if (!isEmailConfigured()) {
    throw new Error(
      "E-mail não configurado. No Railway use BREVO_API_KEY + DAILY_REPORT_TO + EMAIL_SENDER_EMAIL."
    );
  }

  const sent = await sendEmail({
    subject: "Bem-vindos ao KAZULO Workflow Industrial",
    html: buildWelcomeEmailHtml(),
    text: buildWelcomePlainText()
  });

  return {
    messageId: sent.messageId,
    provider: sent.provider,
    recipients: parseRecipientObjects().map((r) => r.email),
    siteUrl: getWelcomeConfig().siteUrl
  };
}
