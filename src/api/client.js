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
    })
};
