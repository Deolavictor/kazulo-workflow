import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import {
  findUserByUsername,
  findUserById,
  listUsersPublic,
  getAllProjects,
  getProjectById,
  insertProject,
  updateProject,
  deleteProject,
  projectExists
} from "./db.js";
import { validateProjectUpdate } from "./validateProject.js";
import { canUserEditProjectMeta } from "./workflowRules.js";
import { startDailyReportScheduler } from "./dailyScheduler.js";
import {
  getDailyEmailConfigStatus,
  sendDailyOverdueEmail,
  sendWelcomeEmail,
  buildWelcomeEmailHtml,
  verifyEmailConnection
} from "./dailyEmail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "troque-isso-em-producao-kazulo-2026";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();

app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? true : CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    const user = findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: "Usuário inválido" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador" });
  }
  next();
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, sector: user.sector }, JWT_SECRET, {
    expiresIn: "7d"
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "kazulo-workflow" });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha obrigatórios" });
  }

  const row = findUserByUsername(String(username).trim().toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Usuário ou senha incorretos" });
  }

  const user = findUserById(row.id);
  const token = signToken(user);
  res.json({ token, user });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/users", authMiddleware, requireAdmin, (_req, res) => {
  res.json({ users: listUsersPublic() });
});

app.get("/api/projects", authMiddleware, (_req, res) => {
  res.json({ projects: getAllProjects() });
});

app.post("/api/projects", authMiddleware, requireAdmin, (req, res) => {
  const project = req.body?.project;
  if (!project?.id || !project?.name) {
    return res.status(400).json({ error: "Projeto inválido" });
  }
  if (projectExists(project.id)) {
    return res.status(409).json({ error: "Projeto já existe" });
  }
  insertProject(project);
  res.status(201).json({ project });
});

app.put("/api/projects/:id", authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const project = req.body?.project;
  if (!project || Number(project.id) !== id) {
    return res.status(400).json({ error: "Projeto inválido" });
  }

  const existing = getProjectById(id);
  if (!existing) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }

  const validation = validateProjectUpdate(req.user, existing, project);
  if (!validation.ok) {
    return res.status(403).json({ error: validation.error });
  }

  updateProject(project);
  res.json({ project });
});

app.delete("/api/projects/:id", authMiddleware, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!projectExists(id)) {
    return res.status(404).json({ error: "Projeto não encontrado" });
  }
  deleteProject(id);
  res.json({ ok: true });
});

/** Importa projetos do localStorage (admin) — uso único na implantação */
app.post("/api/admin/import", authMiddleware, requireAdmin, (req, res) => {
  const projects = req.body?.projects;
  if (!Array.isArray(projects)) {
    return res.status(400).json({ error: "Envie { projects: [...] }" });
  }
  let imported = 0;
  for (const p of projects) {
    if (!p?.id) continue;
    if (projectExists(p.id)) {
      updateProject(p);
    } else {
      insertProject(p);
    }
    imported++;
  }
  res.json({ imported, total: getAllProjects().length });
});

app.get("/api/admin/daily-report/status", authMiddleware, requireAdmin, (_req, res) => {
  res.json(getDailyEmailConfigStatus());
});

app.post("/api/admin/daily-report/verify-smtp", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await verifyEmailConnection();
    res.json(result);
  } catch (err) {
    console.error("[email] verify-smtp:", err);
    res.status(500).json({ error: err.message || "Falha na conexão SMTP" });
  }
});

app.post("/api/admin/daily-report/send", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await sendDailyOverdueEmail();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Falha ao enviar e-mail" });
  }
});

app.get("/api/admin/daily-report/welcome-preview", authMiddleware, requireAdmin, (_req, res) => {
  res.json({ html: buildWelcomeEmailHtml() });
});

app.post("/api/admin/daily-report/welcome", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await sendWelcomeEmail();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[email] welcome:", err);
    res.status(500).json({ error: err.message || "Falha ao enviar e-mail de apresentação" });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[kazulo] API em http://localhost:${PORT}`);
  if (process.env.NODE_ENV === "production") {
    console.log("[kazulo] Frontend estático servido de /dist");
  }
  startDailyReportScheduler();
});
