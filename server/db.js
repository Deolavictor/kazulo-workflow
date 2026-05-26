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

export { KANBAN_STAGES };
