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
  createUser,
  updateUser,
  setUserPassword,
  changeUserPassword,
  deleteUser,
  getGlobalHistory,
  getAllProjects,
  getProjectById,
  insertProject,
  updateProject,
  deleteProject,
  restoreFromBackupFile,
  projectExists,
  getReadNotificationIds,
  markNotificationsRead,
  markAllNotificationsRead
} from "./db.js";
import { buildUserNotifications } from "./notifications.js";
import {
  listChannelsForUser,
  getChannelMessages,
  postMessage,
  markChannelRead,
  markAllChatRead,
  markChatNotificationRead,
  buildChatNotifications,
  isChatMessageReadForUser
} from "./chat.js";
import { listBackups, runDatabaseBackup, getBackupFilePath } from "./backup.js";
import {
  backupOnStartupIfNeeded,
  registerShutdownBackup
} from "./backupLifecycle.js";
import { startBackupScheduler } from "./backupScheduler.js";
import { getAllSettings, setSettings, getPublicSettings } from "./appSettings.js";
import {
  restartDailyReportScheduler,
  startDailyReportScheduler
} from "./dailyScheduler.js";
import { validateProjectUpdate } from "./validateProject.js";
import { canUserEditProjectMeta } from "./workflowRules.js";
import { getPersistenceStatus, logPersistenceOnStartup } from "./persistence.js";
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

app.post("/api/users", authMiddleware, requireAdmin, (req, res) => {
  const { username, password, name, role, sector } = req.body || {};
  const result = createUser({ username, password, name, role, sector });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json({ user: result.user });
});

app.put("/api/users/:id", authMiddleware, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, sector, role } = req.body || {};
  const result = updateUser(id, { name, sector, role });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ user: result.user });
});

app.post("/api/users/:id/reset-password", authMiddleware, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body || {};
  const result = setUserPassword(id, password);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

app.delete("/api/users/:id", authMiddleware, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const result = deleteUser(id, req.user.id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

app.post("/api/auth/change-password", authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Informe a senha atual e a nova senha" });
  }
  const result = changeUserPassword(req.user.id, currentPassword, newPassword);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

app.get("/api/notifications", authMiddleware, (req, res) => {
  const projects = getAllProjects();
  const workflowItems = buildUserNotifications(projects, req.user);
  const chatItems = buildChatNotifications(req.user);
  const items = [...chatItems, ...workflowItems];
  const readIds = new Set(getReadNotificationIds(req.user.id));
  const notifications = items.map((n) => ({
    ...n,
    read:
      n.type === "chat"
        ? isChatMessageReadForUser(req.user.id, n.messageId, n.channel)
        : readIds.has(n.id)
  }));
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount, generatedAt: new Date().toISOString() });
});

app.post("/api/notifications/read", authMiddleware, (req, res) => {
  const { ids, all } = req.body || {};
  if (all) {
    const projects = getAllProjects();
    const workflowItems = buildUserNotifications(projects, req.user);
    const chatItems = buildChatNotifications(req.user);
    markAllNotificationsRead(req.user.id, [
      ...workflowItems.map((n) => n.id),
      ...chatItems.map((n) => n.id)
    ]);
    markAllChatRead(req.user.id);
    return res.json({ ok: true });
  }
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: "Envie { ids: [...] } ou { all: true }" });
  }
  for (const id of ids) {
    if (String(id).startsWith("chat:")) {
      const messageId = Number(String(id).slice(5));
      if (messageId) markChatNotificationRead(req.user.id, messageId);
    }
  }
  markNotificationsRead(req.user.id, ids.filter((id) => !String(id).startsWith("chat:")));
  res.json({ ok: true });
});

app.get("/api/chat/channels", authMiddleware, (req, res) => {
  res.json({ channels: listChannelsForUser(req.user) });
});

app.get("/api/chat/messages", authMiddleware, (req, res) => {
  const channel = req.query.channel || "geral";
  const after = req.query.after;
  const limit = req.query.limit;
  res.json({ messages: getChannelMessages(channel, { after, limit }) });
});

app.post("/api/chat/messages", authMiddleware, (req, res) => {
  const { channel, body } = req.body || {};
  const result = postMessage(req.user, channel || "geral", body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json({ message: result.message });
});

app.post("/api/chat/read", authMiddleware, (req, res) => {
  const { channel, throughMessageId } = req.body || {};
  if (!channel) return res.status(400).json({ error: "Canal obrigatório" });
  const result = markChannelRead(req.user.id, channel, throughMessageId ?? 0);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

app.get("/api/history", authMiddleware, (req, res) => {
  const limit = req.query.limit;
  const q = req.query.q;
  const projectId = req.query.projectId;
  res.json({ events: getGlobalHistory({ limit, q, projectId }) });
});

app.get("/api/admin/settings", authMiddleware, requireAdmin, (_req, res) => {
  try {
    res.json({
      settings: getAllSettings(),
      public: getPublicSettings()
    });
  } catch (err) {
    console.error("[settings] GET:", err);
    res.status(500).json({ error: err.message || "Falha ao carregar configurações" });
  }
});

app.put("/api/admin/settings", authMiddleware, requireAdmin, (req, res) => {
  try {
    const partial = req.body?.settings ?? req.body;
    if (!partial || typeof partial !== "object") {
      return res.status(400).json({ error: "Envie { settings: { ... } }" });
    }
    const settings = setSettings(partial);
    restartDailyReportScheduler();
    res.json({
      settings,
      emailStatus: getDailyEmailConfigStatus()
    });
  } catch (err) {
    console.error("[settings] PUT:", err);
    res.status(500).json({ error: err.message || "Falha ao salvar configurações" });
  }
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
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[email] verify-smtp:", err);
    res.json({ ok: false, error: err.message || "Falha na verificação de e-mail" });
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

app.get("/api/admin/persistence", authMiddleware, requireAdmin, (_req, res) => {
  try {
    res.json(getPersistenceStatus());
  } catch (err) {
    console.error("[persistence]", err);
    res.status(500).json({ error: err.message || "Falha ao ler persistência" });
  }
});

app.get("/api/admin/backups", authMiddleware, requireAdmin, (_req, res) => {
  try {
    res.json({ backups: listBackups(), config: getBackupConfig() });
  } catch (err) {
    console.error("[backup] list:", err);
    res.status(500).json({ error: err.message || "Falha ao listar backups" });
  }
});

app.post("/api/admin/backups/run", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await runDatabaseBackup();
    res.json({ ok: true, backup: result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Falha no backup" });
  }
});

app.get("/api/admin/backups/:filename", authMiddleware, requireAdmin, (req, res) => {
  const filePath = getBackupFilePath(req.params.filename);
  if (!filePath) return res.status(404).json({ error: "Backup não encontrado" });
  res.download(filePath, req.params.filename);
});

app.post(
  "/api/admin/backups/:filename/restore",
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    const filePath = getBackupFilePath(req.params.filename);
    if (!filePath) {
      return res.status(404).json({ error: "Backup não encontrado" });
    }
    try {
      const result = await restoreFromBackupFile(filePath);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[backup] restore:", err);
      res.status(500).json({ error: err.message || "Falha ao restaurar backup" });
    }
  }
);

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

logPersistenceOnStartup();
registerShutdownBackup();

app.listen(PORT, async () => {
  console.log(`[kazulo] API em http://localhost:${PORT}`);
  if (process.env.NODE_ENV === "production") {
    console.log("[kazulo] Frontend estático servido de /dist");
  }
  startDailyReportScheduler();
  startBackupScheduler();
  await backupOnStartupIfNeeded();
});
