import nodemailer from "nodemailer";
import { getSetting } from "./appSettings.js";

/** Railway Hobby bloqueia SMTP (587). Use BREVO_API_KEY ou RESEND_API_KEY. */

function parseRawRecipients() {
  const raw = getSetting("daily_report_to") || "";
  return raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function parseRecipientObjects() {
  return parseRawRecipients().map((entry) => {
    const match = entry.match(/^(.+?)\s*<([^>]+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { email: entry, name: entry.split("@")[0] };
  });
}

function getEmailProvider() {
  if (process.env.BREVO_API_KEY?.trim()) return "brevo";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return "smtp";
  }
  return null;
}

function getSender() {
  const email =
    getSetting("email_sender_email") ||
    process.env.SMTP_USER?.trim() ||
    "";
  const name = getSetting("email_sender_name") || "KAZULO Workflow";
  if (!email) return null;
  return { name, email };
}

export function isEmailConfigured() {
  const provider = getEmailProvider();
  if (!provider) return false;
  if (!parseRawRecipients().length) return false;
  if (!getSender()?.email && provider !== "smtp") return false;
  return true;
}

function formatMailError(err) {
  const parts = [err.message];
  if (err.code) parts.push(`Código: ${err.code}`);
  if (err.response) parts.push(String(err.response).trim());
  return parts.filter(Boolean).join(" — ");
}

function getFromAddress() {
  const from = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  if (from) return from;
  if (user) return `"KAZULO Workflow" <${user}>`;
  return "KAZULO Workflow <noreply@kazulo.local>";
}

function createSmtpTransport() {
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 15000,
    greetingTimeout: 15000
  });
}

async function sendViaBrevo({ subject, html, text }) {
  const sender = getSender();
  const to = parseRecipientObjects();
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY.trim(),
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender,
      to,
      subject,
      htmlContent: html,
      textContent: text || undefined
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || JSON.stringify(data);
    throw new Error(`Brevo: ${msg}`);
  }
  return { messageId: data.messageId || "brevo", provider: "brevo" };
}

async function sendViaResend({ subject, html, text }) {
  const sender = getSender();
  const from = `${sender.name} <${sender.email}>`;
  const to = parseRecipientObjects().map((r) => r.email);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text: text || undefined
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Resend erro ${res.status}`);
  }
  return { messageId: data.id || "resend", provider: "resend" };
}

async function sendViaSmtp({ subject, html, text }) {
  const transport = createSmtpTransport();
  const info = await transport.sendMail({
    from: getFromAddress(),
    to: parseRawRecipients().join(", "),
    subject,
    html,
    text: text || undefined
  });
  return { messageId: info.messageId, provider: "smtp" };
}

export async function sendEmail({ subject, html, text }) {
  const provider = getEmailProvider();
  if (!provider) {
    throw new Error(
      "Configure BREVO_API_KEY (recomendado no Railway) ou RESEND_API_KEY. SMTP direto não funciona no plano Hobby."
    );
  }
  if (!parseRawRecipients().length) {
    throw new Error("Defina DAILY_REPORT_TO com os e-mails destino.");
  }

  try {
    if (provider === "brevo") return await sendViaBrevo({ subject, html, text });
    if (provider === "resend") return await sendViaResend({ subject, html, text });
    return await sendViaSmtp({ subject, html, text });
  } catch (err) {
    if (provider === "smtp" && /timeout|ETIMEDOUT|ECONNREFUSED|unreachable/i.test(err.message)) {
      throw new Error(
        `${formatMailError(err)} — No Railway (plano Hobby), SMTP está bloqueado. Use BREVO_API_KEY: https://www.brevo.com`
      );
    }
    throw new Error(formatMailError(err));
  }
}

export async function verifyEmailConnection() {
  const provider = getEmailProvider();
  if (!provider) {
    throw new Error(
      "Nenhum provedor de e-mail configurado. Adicione BREVO_API_KEY no Railway."
    );
  }

  if (provider === "brevo") {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": process.env.BREVO_API_KEY.trim(), Accept: "application/json" }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Chave Brevo inválida");
    return {
      ok: true,
      provider: "brevo",
      email: data.email,
      plan: data.plan?.[0]?.type || "brevo"
    };
  }

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}` }
    });
    if (!res.ok) throw new Error("Chave Resend inválida");
    return { ok: true, provider: "resend" };
  }

  const transport = createSmtpTransport();
  await transport.verify();
  return { ok: true, provider: "smtp", host: process.env.SMTP_HOST };
}

export function getDailyEmailConfigStatus() {
  const provider = getEmailProvider();
  const missing = [];
  if (!parseRawRecipients().length) missing.push("DAILY_REPORT_TO");
  if (!provider) {
    missing.push("BREVO_API_KEY (recomendado)");
  }
  if (provider && provider !== "smtp" && !getSender()?.email) {
    missing.push("EMAIL_SENDER_EMAIL");
  }

  const enabled = getSetting("daily_report_enabled");
  return {
    enabled,
    provider,
    recipients: parseRawRecipients(),
    cron: getSetting("daily_report_cron") || "0 17 * * 1-5",
    timezone: getSetting("daily_report_tz") || "America/Sao_Paulo",
    senderEmail: getSender()?.email || null,
    senderName: getSender()?.name || null,
    ready: isEmailConfigured() && enabled,
    missingVars: missing,
    railwayHint:
      provider === "smtp"
        ? "SMTP costuma falhar no Railway Hobby. Prefira BREVO_API_KEY (API HTTPS)."
        : null
  };
}
