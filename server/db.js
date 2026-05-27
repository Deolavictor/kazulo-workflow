import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { KANBAN_STAGES } from "./workflowRules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "kazulo.db");

import fs from "fs";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'sector')),
    sector TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notification_reads (
    user_id INTEGER NOT NULL,
    notification_id TEXT NOT NULL,
    read_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, notification_id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_sector TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel, id);

  CREATE TABLE IF NOT EXISTS chat_read_cursors (
    user_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    last_message_id INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, channel)
  );
`);

const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  seedUsers();
}

function seedUsers() {
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const defaultPass = process.env.DEFAULT_USER_PASSWORD || "kazulo123";

  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, sector)
    VALUES (@username, @password_hash, @name, @role, @sector)
  `);

  insert.run({
    username: "admin",
    password_hash: bcrypt.hashSync(adminPass, 10),
    name: "Administrador",
    role: "admin",
    sector: null
  });

  const sectorUsers = [
    { username: "design", name: "Design", sector: "Design" },
    { username: "processos", name: "Processos", sector: "Processos" },
    { username: "desenvolvimento", name: "Desenvolvimento", sector: "Desenvolvimento" },
    { username: "pcp", name: "PCP", sector: "PCP" },
    { username: "compras", name: "Compras", sector: "Compras" }
  ];

  for (const u of sectorUsers) {
    insert.run({
      username: u.username,
      password_hash: bcrypt.hashSync(defaultPass, 10),
      name: u.name,
      role: "sector",
      sector: u.sector
    });
  }

  console.log("[db] Usuários padrão criados.");
  console.log("  admin /", adminPass);
  console.log("  design, processos, desenvolvimento, pcp, compras /", defaultPass);
}

export function findUserByUsername(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export function findUserById(id) {
  return db.prepare("SELECT id, username, name, role, sector FROM users WHERE id = ?").get(id);
}

export function listUsersPublic() {
  return db
    .prepare("SELECT id, username, name, role, sector FROM users ORDER BY role DESC, name")
    .all();
}

const SECTOR_VALUES = ["Design", "Processos", "Desenvolvimento", "PCP", "Compras"];

export function createUser({ username, password, name, role, sector }) {
  const uname = String(username).trim().toLowerCase();
  if (!uname || !password || !name) {
    return { ok: false, error: "Usuário, senha e nome são obrigatórios" };
  }
  if (!["admin", "sector"].includes(role)) {
    return { ok: false, error: "Perfil inválido" };
  }
  if (role === "sector" && !SECTOR_VALUES.includes(sector)) {
    return { ok: false, error: "Setor inválido" };
  }
  if (findUserByUsername(uname)) {
    return { ok: false, error: "Nome de usuário já existe" };
  }

  const result = db
    .prepare(
      `INSERT INTO users (username, password_hash, name, role, sector)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      uname,
      bcrypt.hashSync(password, 10),
      String(name).trim(),
      role,
      role === "sector" ? sector : null
    );

  return { ok: true, user: findUserById(result.lastInsertRowid) };
}

export function updateUser(id, { name, sector, role }) {
  const existing = findUserById(id);
  if (!existing) return { ok: false, error: "Usuário não encontrado" };

  const nextRole = role ?? existing.role;
  const nextSector =
    nextRole === "admin" ? null : sector ?? existing.sector;

  if (nextRole === "sector" && !SECTOR_VALUES.includes(nextSector)) {
    return { ok: false, error: "Setor inválido" };
  }

  const nextName = name != null ? String(name).trim() : existing.name;
  if (!nextName) return { ok: false, error: "Nome obrigatório" };

  db.prepare(
    `UPDATE users SET name = ?, role = ?, sector = ? WHERE id = ?`
  ).run(nextName, nextRole, nextSector, id);

  return { ok: true, user: findUserById(id) };
}

export function setUserPassword(id, newPassword) {
  if (!newPassword || String(newPassword).length < 4) {
    return { ok: false, error: "Senha deve ter pelo menos 4 caracteres" };
  }
  const existing = findUserById(id);
  if (!existing) return { ok: false, error: "Usuário não encontrado" };

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(newPassword, 10),
    id
  );
  return { ok: true };
}

export function changeUserPassword(id, currentPassword, newPassword) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!row) return { ok: false, error: "Usuário não encontrado" };
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    return { ok: false, error: "Senha atual incorreta" };
  }
  return setUserPassword(id, newPassword);
}

export function deleteUser(id, actingUserId) {
  if (id === actingUserId) {
    return { ok: false, error: "Você não pode excluir sua própria conta" };
  }
  const target = findUserById(id);
  if (!target) return { ok: false, error: "Usuário não encontrado" };

  if (target.role === "admin") {
    const admins = db
      .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
      .get().c;
    if (admins <= 1) {
      return { ok: false, error: "Não é possível remover o último administrador" };
    }
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return { ok: true };
}

export function getGlobalHistory({ limit = 500, q = "", projectId = null } = {}) {
  const projects = getAllProjects();
  const needle = String(q || "")
    .trim()
    .toLowerCase();
  const pid = projectId != null && projectId !== "" ? Number(projectId) : null;

  const events = [];
  for (const p of projects) {
    if (pid != null && !Number.isNaN(pid) && p.id !== pid) continue;
    for (const ev of p.history || []) {
      events.push({
        ...ev,
        projectId: p.id,
        projectName: p.name,
        client: p.client
      });
    }
  }

  events.sort((a, b) => new Date(b.at) - new Date(a.at));

  const filtered = needle
    ? events.filter((ev) => {
        const blob = [
          ev.message,
          ev.user,
          ev.type,
          ev.projectName,
          ev.client
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      })
    : events;

  const max = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  return filtered.slice(0, max);
}

export function getAllProjects() {
  const rows = db.prepare("SELECT data FROM projects ORDER BY id").all();
  return rows.map((r) => JSON.parse(r.data));
}

export function getProjectById(id) {
  const row = db.prepare("SELECT data FROM projects WHERE id = ?").get(id);
  return row ? JSON.parse(row.data) : null;
}

export function insertProject(project) {
  db.prepare("INSERT INTO projects (id, data) VALUES (?, ?)").run(
    project.id,
    JSON.stringify(project)
  );
}

export function updateProject(project) {
  db.prepare(
    "UPDATE projects SET data = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(project), project.id);
}

export function deleteProject(id) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function projectExists(id) {
  return !!db.prepare("SELECT 1 FROM projects WHERE id = ?").get(id);
}

export function getDbPath() {
  return dbPath;
}

export function getDbCounts() {
  const projectCount = db.prepare("SELECT COUNT(*) AS c FROM projects").get().c;
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  return { projectCount, userCount };
}

export function getReadNotificationIds(userId) {
  return db
    .prepare("SELECT notification_id FROM notification_reads WHERE user_id = ?")
    .all(userId)
    .map((r) => r.notification_id);
}

export function markNotificationsRead(userId, ids) {
  if (!ids?.length) return;
  const insert = db.prepare(`
    INSERT INTO notification_reads (user_id, notification_id)
    VALUES (?, ?)
    ON CONFLICT(user_id, notification_id) DO NOTHING
  `);
  const tx = db.transaction((list) => {
    for (const id of list) insert.run(userId, id);
  });
  tx(ids);
}

export function markAllNotificationsRead(userId, notificationIds) {
  markNotificationsRead(userId, notificationIds);
}

export { KANBAN_STAGES, db, SECTOR_VALUES };
