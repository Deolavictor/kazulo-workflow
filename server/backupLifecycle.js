import { runDatabaseBackup, getBackupConfig } from "./backup.js";

let changeTimer = null;
let lastChangeBackupAt = 0;

const MIN_CHANGE_BACKUP_INTERVAL_MS = Math.max(
  30_000,
  Number(process.env.BACKUP_CHANGE_MIN_INTERVAL_MS) || 120_000
);

function changeBackupEnabled() {
  return process.env.BACKUP_ON_CHANGE !== "false";
}

function startupBackupEnabled() {
  return process.env.BACKUP_ON_STARTUP !== "false";
}

function shutdownBackupEnabled() {
  return process.env.BACKUP_ON_SHUTDOWN !== "false";
}

export async function runLifecycleBackup(reason) {
  try {
    return await runDatabaseBackup({ reason });
  } catch (err) {
    console.error(`[backup] Falha (${reason}):`, err.message);
    return null;
  }
}

export async function backupOnStartupIfNeeded() {
  if (!startupBackupEnabled()) return;
  const { getDbCounts } = await import("./db.js");
  const { projectCount } = getDbCounts();
  if (projectCount === 0) return;
  await runLifecycleBackup("startup");
}

export function scheduleBackupAfterDataChange() {
  if (!changeBackupEnabled()) return;

  const now = Date.now();
  if (now - lastChangeBackupAt < MIN_CHANGE_BACKUP_INTERVAL_MS) {
    if (changeTimer) return;
  }

  if (changeTimer) clearTimeout(changeTimer);

  const debounce = Math.max(
    5000,
    Number(process.env.BACKUP_CHANGE_DEBOUNCE_MS) || 60_000
  );

  changeTimer = setTimeout(async () => {
    changeTimer = null;
    const { getDbCounts } = await import("./db.js");
    const { projectCount } = getDbCounts();
    if (projectCount === 0) return;
    const result = await runLifecycleBackup("change");
    if (result) lastChangeBackupAt = Date.now();
  }, debounce);
}

let shuttingDown = false;

export function registerShutdownBackup() {
  const handler = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[backup] ${signal} — salvando cópia antes de encerrar…`);
    if (shutdownBackupEnabled()) {
      await runLifecycleBackup("shutdown");
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => handler("SIGTERM"));
  process.on("SIGINT", () => handler("SIGINT"));
}

export function getLifecycleConfig() {
  return {
    onStartup: startupBackupEnabled(),
    onChange: changeBackupEnabled(),
    onShutdown: shutdownBackupEnabled(),
    changeDebounceMs: Number(process.env.BACKUP_CHANGE_DEBOUNCE_MS) || 60_000,
    changeMinIntervalMs: MIN_CHANGE_BACKUP_INTERVAL_MS,
    autoRestore: process.env.AUTO_RESTORE_FROM_BACKUP !== "false",
    ...getBackupConfig()
  };
}
