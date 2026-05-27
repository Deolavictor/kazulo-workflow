import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveDbPath() {
  return (
    process.env.DB_PATH || path.join(__dirname, "data", "kazulo.db")
  );
}

export function resolveBackupDir(dbPath) {
  return (
    process.env.BACKUP_DIR || path.join(path.dirname(dbPath), "backups")
  );
}

export function countProjectsInFile(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const tmp = new Database(filePath, { readonly: true, fileMustExist: true });
    const row = tmp.prepare("SELECT COUNT(*) AS c FROM projects").get();
    tmp.close();
    return row?.c ?? 0;
  } catch {
    return 0;
  }
}

function listBackupFiles(backupDir) {
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("kazulo-") && f.endsWith(".db"))
    .map((f) => {
      const full = path.join(backupDir, f);
      return { filename: f, full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

export function findLatestBackupWithProjects(backupDir) {
  for (const file of listBackupFiles(backupDir)) {
    const projects = countProjectsInFile(file.full);
    if (projects > 0) {
      return { ...file, projectCount: projects };
    }
  }
  return null;
}

function removeWalSidecars(dbPath) {
  for (const suffix of ["-wal", "-shm"]) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function copyDatabaseFile(source, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  removeWalSidecars(dest);
  fs.copyFileSync(source, dest);
  removeWalSidecars(dest);
}

export function maybeRestoreFromBackup(dbPath, backupDir) {
  if (process.env.AUTO_RESTORE_FROM_BACKUP === "false") {
    return null;
  }

  const backup = findLatestBackupWithProjects(backupDir);
  if (!backup) return null;

  const currentProjects = countProjectsInFile(dbPath);
  if (currentProjects > 0) return null;

  copyDatabaseFile(backup.full, dbPath);
  console.log(
    `[db] Banco restaurado de ${backup.filename} (${backup.projectCount} projeto(s)) — o arquivo atual estava vazio`
  );
  return backup;
}

function detectVolumeMountDir() {
  const fromRailway = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (fromRailway && fs.existsSync(fromRailway)) return fromRailway;

  for (const dir of ["/var/data", "/data"]) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

/** Garante DB_PATH no volume em produção Railway (ex.: /var/data do template SQLite) */
export function applyRailwayDbDefaults() {
  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID
  );
  if (!onRailway || process.env.NODE_ENV !== "production") return resolveDbPath();

  const volumeDir = detectVolumeMountDir();
  if (!process.env.DB_PATH && volumeDir) {
    process.env.DB_PATH = path.join(volumeDir, "kazulo.db");
    console.log(
      `[db] DB_PATH ausente — usando ${process.env.DB_PATH} (volume Railway)`
    );
  }
  if (process.env.DB_PATH && !process.env.BACKUP_DIR) {
    const normalized = process.env.DB_PATH.replace(/\\/g, "/");
    if (normalized.startsWith("/var/data/") || normalized.startsWith("/data/")) {
      process.env.BACKUP_DIR = path.join(path.dirname(process.env.DB_PATH), "backups");
    }
  }
  return resolveDbPath();
}

export function bootstrapDatabaseFile() {
  const dbPath = applyRailwayDbDefaults();
  const backupDir = resolveBackupDir(dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const restored = maybeRestoreFromBackup(dbPath, backupDir);
  return { dbPath, backupDir, restored };
}
