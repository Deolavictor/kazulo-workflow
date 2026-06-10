const API_BASE = import.meta.env.VITE_API_URL ?? "";

function getToken() {
  return localStorage.getItem("kazulo-token");
}

export function setToken(token) {
  if (token) localStorage.setItem("kazulo-token", token);
  else localStorage.removeItem("kazulo-token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Erro ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),

  loginAsViewer: () =>
    request("/auth/viewer", {
      method: "POST",
      body: JSON.stringify({})
    }),

  me: () => request("/auth/me"),

  fetchProjects: () => request("/projects"),

  createProject: (project) =>
    request("/projects", {
      method: "POST",
      body: JSON.stringify({ project })
    }),

  updateProject: (project) =>
    request(`/projects/${project.id}`, {
      method: "PUT",
      body: JSON.stringify({ project })
    }),

  deleteProject: (id) =>
    request(`/projects/${id}`, { method: "DELETE" }),

  importProjects: (projects) =>
    request("/admin/import", {
      method: "POST",
      body: JSON.stringify({ projects })
    }),

  fetchUsers: () => request("/users"),

  createUser: (body) =>
    request("/users", { method: "POST", body: JSON.stringify(body) }),

  updateUser: (id, body) =>
    request(`/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  resetUserPassword: (id, password) =>
    request(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password })
    }),

  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  fetchHistory: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", params.limit);
    if (params.q) qs.set("q", params.q);
    if (params.projectId) qs.set("projectId", params.projectId);
    const query = qs.toString();
    return request(`/history${query ? `?${query}` : ""}`);
  },

  fetchSettings: () => request("/admin/settings"),

  updateSettings: (settings) =>
    request("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings })
    }),

  dailyReportStatus: () => request("/admin/daily-report/status"),

  verifyEmail: () =>
    request("/admin/daily-report/verify-smtp", { method: "POST" }),

  sendDailyReport: () =>
    request("/admin/daily-report/send", { method: "POST" }),

  fetchNotifications: () => request("/notifications"),

  markNotificationsRead: (body) =>
    request("/notifications/read", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  fetchChatChannels: () => request("/chat/channels"),

  fetchChatMessages: (channel, params = {}) => {
    const qs = new URLSearchParams({ channel });
    if (params.after) qs.set("after", params.after);
    if (params.limit) qs.set("limit", params.limit);
    return request(`/chat/messages?${qs}`);
  },

  sendChatMessage: (channel, body) =>
    request("/chat/messages", {
      method: "POST",
      body: JSON.stringify({ channel, body })
    }),

  markChatRead: (channel, throughMessageId) =>
    request("/chat/read", {
      method: "POST",
      body: JSON.stringify({ channel, throughMessageId })
    }),

  fetchPersistence: () => request("/admin/persistence"),

  fetchBackups: () => request("/admin/backups"),

  runBackup: () => request("/admin/backups/run", { method: "POST" }),

  restoreBackup: (filename) =>
    request(`/admin/backups/${encodeURIComponent(filename)}/restore`, {
      method: "POST"
    }),

  downloadBackup: async (filename) => {
    const token = getToken();
    const res = await fetch(
      `${API_BASE}/api/admin/backups/${encodeURIComponent(filename)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
