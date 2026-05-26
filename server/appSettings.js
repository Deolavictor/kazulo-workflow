import { db } from "./db.js";

const ENV_DEFAULTS = {
  daily_report_enabled: () => process.env.DAILY_REPORT_ENABLED !== "false",
  daily_report_to: () => process.env.DAILY_REPORT_TO || "",
  daily_report_cron: () => process.env.DAILY_REPORT_CRON || "0 17 * * 1-5",
  daily_report_tz: () => process.env.DAILY_REPORT_TZ || "America/Sao_Paulo",
  email_sender_email: () => process.env.EMAIL_SENDER_EMAIL || process.env.SMTP_USER || "",
  email_sender_name: () => process.env.EMAIL_SENDER_NAME || "KAZULO Workflow",
  public_site_url: () =>
    process.env.PUBLIC_SITE_URL || "https://kazulo-workflow-production.up.railway.app"
};

const EDITABLE_KEYS = Object.keys(ENV_DEFAULTS);

function parseStoredValue(key, raw) {
  if (key === "daily_report_enabled") return raw === "true";
  return raw ?? "";
}

export function getSetting(key) {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  if (row) return parseStoredValue(key, row.value);
  const def = ENV_DEFAULTS[key];
  return def ? def() : "";
}

export function getAllSettings() {
  const out = {};
  for (const key of EDITABLE_KEYS) {
    out[key] = getSetting(key);
  }
  return out;
}

export function setSettings(partial) {
  const upsert = db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const key of EDITABLE_KEYS) {
    if (!(key in partial)) continue;
    let value = partial[key];
    if (key === "daily_report_enabled") {
      value = value ? "true" : "false";
    } else {
      value = String(value ?? "").trim();
    }
    upsert.run({ key, value });
  }

  return getAllSettings();
}

export function getPublicSettings() {
  const s = getAllSettings();
  return {
    daily_report_enabled: s.daily_report_enabled,
    daily_report_cron: s.daily_report_cron,
    daily_report_tz: s.daily_report_tz,
    email_sender_name: s.email_sender_name,
    public_site_url: s.public_site_url,
    has_brevo_key: Boolean(process.env.BREVO_API_KEY?.trim()),
    recipient_count: String(s.daily_report_to || "")
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter(Boolean).length
  };
}

export { EDITABLE_KEYS };
