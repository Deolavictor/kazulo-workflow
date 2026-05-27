import fs from "fs";
import path from "path";
import { db, getDbPath } from "./db.js";

const BACKUP_DIR =
  process.env.BACKUP_DIR ||
  path.join(path.dirname(getDbPath()), "backups");

const RETAIN_COUNT = Math.max(
  3,
  Number(process.env.BACKUP_RETAIN_COUNT) || 14
);

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestampSlug() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const SAFE_REASON = /^[a-z]+$/;

function buildBackupFilename(reason) {
  const slug = timestampSlug();
  const tag =
    reason && SAFE_REASON.test(reason) && reason !== "scheduled" ? reason : null;
  return tag ? `kazulo-${tag}-${slug}.db` : `kazulo-${slug}.db`;
}

function pruneOldBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("kazulo-") && f.endsWith(".db"))
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const file of files.slice(RETAIN_COUNT)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file.name));
  }
}

export function listBackups() {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("kazulo-") && f.endsWith(".db"))
    .map((f) => {
      const full = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(full);
      return {
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getBackupFilePath(filename) {
  if (!/^kazulo-([a-z]+-)?\d{8}-\d{6}\.db$/.test(filename)) {
    return null;
  }
  const full = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(full)) return null;
  return full;
}

export async function runDatabaseBackup(options = {}) {
  ensureBackupDir();
  const filename = buildBackupFilename(options.reason);
  const dest = path.join(BACKUP_DIR, filename);

  await db.backup(dest);

  pruneOldBackups();

  const stat = fs.statSync(dest);
  const reasonLabel = options.reason ? ` [${options.reason}]` : "";
  console.log(
    `[backup] Cópia criada${reasonLabel}: ${filename} (${stat.size} bytes)`
  );

  return {
    filename,
    path: dest,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    backupDir: BACKUP_DIR,
    reason: options.reason || "manual"
  };
}

export function getLatestBackupMeta() {
  const list = listBackups();
  return list[0] || null;
}

export function getBackupConfig() {
  return {
    enabled: process.env.BACKUP_ENABLED !== "false",
    cron: process.env.BACKUP_CRON || "0 3 * * *",
    timezone: process.env.BACKUP_TZ || "America/Sao_Paulo",
    retainCount: RETAIN_COUNT,
    backupDir: BACKUP_DIR
  };
}
