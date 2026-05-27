import fs from "fs";
import path from "path";
import { getLatestBackupMeta } from "./backup.js";
import { getDbPath, getDbCounts } from "./db.js";
import { getLifecycleConfig } from "./backupLifecycle.js";

const PERSISTENT_DB_PREFIXES = ["/data/", "/var/data/"];

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

export function getPersistenceStatus() {
  const dbPath = getDbPath();
  const normalized = normalizePath(dbPath);
  const { projectCount, userCount } = getDbCounts();
  const onPersistentVolume = PERSISTENT_DB_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix)
  );
  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID
  );
  const production = process.env.NODE_ENV === "production";
  const dataAtRisk = production && onRailway && !onPersistentVolume;

  const warnings = [];
  if (dataAtRisk) {
    warnings.push(
      "O banco NÃO está no volume do Railway. Cada deploy ou crash pode apagar projetos e usuários."
    );
  }
  if (production && onRailway && !onPersistentVolume) {
    const mountHint = fs.existsSync("/var/data")
      ? "/var/data"
      : fs.existsSync("/data")
        ? "/data"
        : "/var/data ou /data";
    warnings.push(
      `Volume não detectado. Crie um Volume no Railway com Mount Path ${mountHint}.`
    );
  }
  if (
    production &&
    onRailway &&
    onPersistentVolume &&
    projectCount === 0 &&
    userCount > 0 &&
    userCount <= 6
  ) {
    warnings.push(
      "Banco no volume, mas sem projetos. Se você tinha dados antes, o volume pode não estar ligado a este serviço."
    );
  }

  let volumeWritable = null;
  const volumeDir =
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    (fs.existsSync("/var/data") ? "/var/data" : fs.existsSync("/data") ? "/data" : null);
  if (onRailway && volumeDir) {
    try {
      fs.accessSync(volumeDir, fs.constants.W_OK);
      volumeWritable = true;
    } catch {
      volumeWritable = false;
    }
  }

  const backupDir =
    process.env.BACKUP_DIR || path.join(path.dirname(dbPath), "backups");

  let latestBackup = null;
  try {
    latestBackup = getLatestBackupMeta();
  } catch (err) {
    console.warn("[persistence] Falha ao ler backups:", err.message);
  }
  const lifecycle = getLifecycleConfig();

  return {
    dbPath,
    backupDir,
    onPersistentVolume,
    onRailway,
    production,
    dataAtRisk,
    volumeMounted: onRailway ? Boolean(volumeDir && fs.existsSync(volumeDir)) : null,
    volumeWritable,
    projectCount,
    userCount,
    warnings,
    latestBackup,
    lifecycle,
    recommended: {
      DB_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/kazulo.db`
        : fs.existsSync("/var/data")
          ? "/var/data/kazulo.db"
          : "/data/kazulo.db",
      BACKUP_DIR: process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/backups`
        : fs.existsSync("/var/data")
          ? "/var/data/backups"
          : "/data/backups",
      volumeMountPath:
        process.env.RAILWAY_VOLUME_MOUNT_PATH ||
        (fs.existsSync("/var/data") ? "/var/data" : "/data")
    }
  };
}

export function logPersistenceOnStartup() {
  const status = getPersistenceStatus();
  console.log(`[kazulo] Banco SQLite: ${status.dbPath}`);
  console.log(
    `[kazulo] Projetos: ${status.projectCount} | Usuários: ${status.userCount}`
  );
  if (status.dataAtRisk) {
    console.warn(
      "[kazulo] AVISO CRÍTICO: dados em risco — configure Volume /data e DB_PATH=/data/kazulo.db (veja docs/RAILWAY-PERSISTENCIA-DADOS.md)"
    );
  }
  for (const w of status.warnings) {
    if (!status.dataAtRisk || !w.includes("NÃO está no volume")) {
      console.warn(`[kazulo] ${w}`);
    }
  }
}
