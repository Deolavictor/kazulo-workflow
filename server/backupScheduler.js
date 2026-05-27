import cron from "node-cron";
import { runDatabaseBackup, getBackupConfig } from "./backup.js";

let scheduledTask = null;

export function startBackupScheduler() {
  stopBackupScheduler();
  const config = getBackupConfig();

  if (!config.enabled) {
    console.log("[backup] Backup automático desativado (BACKUP_ENABLED=false).");
    return;
  }

  const expression = config.cron;
  if (!cron.validate(expression)) {
    console.error(`[backup] CRON inválido: ${expression}`);
    return;
  }

  scheduledTask = cron.schedule(
    expression,
    async () => {
      try {
        await runDatabaseBackup({ reason: "scheduled" });
      } catch (err) {
        console.error("[backup] Falha no backup:", err.message);
      }
    },
    { timezone: config.timezone }
  );

  console.log(
    `[backup] Agendado: "${expression}" (${config.timezone}) — mantém ${config.retainCount} cópias`
  );
}

export function stopBackupScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

export function restartBackupScheduler() {
  stopBackupScheduler();
  startBackupScheduler();
}
