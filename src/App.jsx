import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { api } from "./api/client";

// LEAD TIMES: dias antes do início de produção
const itemLeadTimes = {
  projeto: 12,
  listaMateriais: 12,
  graficaStampnow: 1,
  manualMontagem: 1,
  fo: 3,
  foProducao: 3,
  caixa: 11,
  programaLaser: 1,
  piloto: 2,
  matrizes: 2,
  maquinas: 2,
  reuniaoAnalises: 2,
  solicitacaoCompras: 11,
  opFo: 1,
  caixaCompras: 10,
  tinta: 7,
  mpAco: 7,
  componentesKit: 7,
  componentesEletrica: 7,
  mpPsai: 10
};

// Dias de antecedência do início de produção em relação à entrega
const PRODUCTION_LEAD = 8;

function subtractDays(dateStr, days) {

  const d = new Date(dateStr);

  let remainingDays = days;

  while (remainingDays > 0) {

    d.setDate(d.getDate() - 1);

    const day = d.getDay();

    // 0 = domingo
    // 6 = sábado

    if (day !== 0 && day !== 6) {
      remainingDays--;
    }
  }

  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function isItemLate(dueDateStr) {
  if (!dueDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDateStr) < today;
}

function getDaysUntilDelivery(deliveryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDateStr);
  delivery.setHours(0, 0, 0, 0);
  return Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
}

function formatDateTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MENU_ITEMS = [
  { id: "Dashboard", icon: "▣" },
  { id: "Projetos", icon: "☰" },
  { id: "Calendario", icon: "📅" },
  { id: "Historico", icon: "🕐" },
  { id: "Relatorios", icon: "📊" },
  { id: "Usuarios", icon: "👥" },
  { id: "Configuracoes", icon: "⚙" }
];

const STATUS_LEGEND = [
  { label: "Bloqueado", color: "#94a3b8" },
  { label: "Liberado", variant: "liberado" },
  { label: "Em andamento", color: "#3b82f6" },
  { label: "Concluído", color: "#22c55e" },
  { label: "Atrasado", color: "#ef4444" }
];

const STAGE_THEMES = {
  Design: { bg: "#eef2ff", accent: "#4f46e5", icon: "🎨" },
  Processos: { bg: "#fff7ed", accent: "#ea580c", icon: "⚙" },
  Desenvolvimento: { bg: "#f0fdf4", accent: "#16a34a", icon: "🔧" },
  PCP: { bg: "#eff6ff", accent: "#2563eb", icon: "📋" },
  Compras: { bg: "#fdf4ff", accent: "#9333ea", icon: "🛒" },
  "Concluído": { bg: "#f1f5f9", accent: "#64748b", icon: "✓" }
};

// Dependências entre ATIVIDADES (não entre setores).
// Regras: tudo começa em "projeto"; setores trabalham em paralelo conforme liberação.
const ACTIVITY_DEPENDENCIES = {
  // Processos — liberado quando Projeto (Design) estiver concluído
  fo: ["projeto"],
  programaLaser: ["projeto"],
  caixa: ["projeto"],

  // PCP
  solicitacaoCompras: ["listaMateriais"],

  // Processos / PCP — cadeia após Desenvolvimento
  foProducao: ["reuniaoAnalises"],
  opFo: ["foProducao"],

  // Desenvolvimento — tudo liberado quando F.O. estiver concluída
  piloto: ["fo"],
  matrizes: ["fo"],
  maquinas: ["fo"],
  reuniaoAnalises: ["fo"],

  // Compras — liberado pela Solicitação compras, exceto Caixa (compras)
  tinta: ["solicitacaoCompras"],
  mpAco: ["solicitacaoCompras"],
  componentesKit: ["solicitacaoCompras"],
  componentesEletrica: ["solicitacaoCompras"],
  mpPsai: ["solicitacaoCompras"],

  // Caixa (Compras) — depende da Caixa (Processos), não da solicitação
  caixaCompras: ["caixa"]
};

const KANBAN_STAGES = ["Design", "Processos", "Desenvolvimento", "PCP", "Compras"];

const SECTOR_CHECKLISTS = {
  Design: {
    projeto: false,
    listaMateriais: false,
    graficaStampnow: false,
    manualMontagem: false
  },
  Processos: {
    fo: false,
    foProducao: false,
    caixa: false,
    programaLaser: false
  },
  Desenvolvimento: {
    piloto: false,
    matrizes: false,
    maquinas: false,
    reuniaoAnalises: false
  },
  PCP: {
    solicitacaoCompras: false,
    opFo: false
  },
  Compras: {
    caixaCompras: false,
    tinta: false,
    mpAco: false,
    componentesKit: false,
    componentesEletrica: false,
    mpPsai: false
  }
};

const CHECKLIST_LABELS = {
  projeto: "Projeto",
  listaMateriais: "Lista de materiais",
  graficaStampnow: "Gráfica (Stampnow)",
  manualMontagem: "Manual de montagem",
  fo: "F.O. para Desenvolver",
  foProducao: "F.O. para produção",
  caixa: "Caixa",
  programaLaser: "Programa laser",
  piloto: "Piloto",
  matrizes: "Matrizes",
  maquinas: "Máquinas",
  reuniaoAnalises: "Reunião de análises",
  solicitacaoCompras: "Solicitação compras",
  opFo: "O.P./F.O.",
  caixaCompras: "Caixa",
  tinta: "Tinta",
  mpAco: "M.P. (Aço)",
  componentesKit: "Componentes Kit",
  componentesEletrica: "Componentes Elétrica",
  mpPsai: "M.P. (PSAI)"
};

const ACTIVITY_SECTOR = {};
Object.entries(SECTOR_CHECKLISTS).forEach(([stage, items]) => {
  Object.keys(items).forEach((key) => {
    ACTIVITY_SECTOR[key] = stage;
  });
});

const ALL_ACTIVITY_KEYS = Object.keys(ACTIVITY_SECTOR);

const DEPENDENCY_CHAIN = ALL_ACTIVITY_KEYS.map((key) => ({
  key,
  label: CHECKLIST_LABELS[key],
  stage: ACTIVITY_SECTOR[key]
}));

function buildEmptyActivities() {
  const activities = {};
  ALL_ACTIVITY_KEYS.forEach((key) => {
    activities[key] = false;
  });
  return activities;
}

function buildAllChecklistDates(productionStartDate) {
  const dates = {};
  ALL_ACTIVITY_KEYS.forEach((item) => {
    const lead = itemLeadTimes[item];
    dates[item] = lead !== undefined
      ? subtractDays(productionStartDate, lead)
      : productionStartDate;
  });
  return dates;
}

function getProjectActivities(project) {
  if (project.activities) return project.activities;
  const activities = buildEmptyActivities();
  Object.entries(project.checklist || {}).forEach(([key, value]) => {
    if (key in activities) activities[key] = value === true;
  });
  return activities;
}

function isActivityDone(project, itemKey) {
  return getProjectActivities(project)[itemKey] === true;
}

function isActivityInProgress(project, itemKey) {
  return getProjectActivities(project)[itemKey] === "in_progress";
}

function isActivityLiberated(project, itemKey) {
  const deps = ACTIVITY_DEPENDENCIES[itemKey];
  if (!deps || deps.length === 0) return true;
  return deps.every((dep) => isActivityDone(project, dep));
}

/** Itens que dependem deste (direta ou indiretamente) */
function getTransitiveDependents(rootKey) {
  const dependents = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, deps] of Object.entries(ACTIVITY_DEPENDENCIES)) {
      if (dependents.has(key)) continue;
      if (deps?.some((dep) => dep === rootKey || dependents.has(dep))) {
        dependents.add(key);
        changed = true;
      }
    }
  }
  return dependents;
}

function getActivityStatus(project, itemKey) {
  if (!isActivityLiberated(project, itemKey)) return "locked";
  if (isActivityDone(project, itemKey)) return "done";
  if (isActivityInProgress(project, itemKey)) return "progress";
  const due = project.checklistDates?.[itemKey];
  if (isItemLate(due)) return "late";
  return "liberated";
}

function getSectorItems(stage) {
  return Object.keys(SECTOR_CHECKLISTS[stage] || {});
}

function isProjectFullyComplete(project) {
  return ALL_ACTIVITY_KEYS.every((key) => isActivityDone(project, key));
}

function sectorHasActiveCard(project, stage) {
  if (isProjectFullyComplete(project)) return false;
  const items = getSectorItems(stage);
  if (items.length === 0) return false;
  const statuses = items.map((item) => getActivityStatus(project, item));
  return !statuses.every((s) => s === "done");
}

function sectorHasCompletedWork(project, stage) {
  return getSectorItems(stage).some((item) => isActivityDone(project, item));
}

function countSectorDoneItems(project, stage) {
  return getSectorItems(stage).filter((item) => isActivityDone(project, item)).length;
}

function getSectorProgress(project, stage) {
  const items = getSectorItems(stage);
  if (items.length === 0) return 0;
  const done = items.filter((item) => isActivityDone(project, item)).length;
  return Math.round((done / items.length) * 100);
}

function isActivityOverdue(project, itemKey) {
  if (isActivityDone(project, itemKey)) return false;
  const due = project.checklistDates?.[itemKey];
  return isItemLate(due);
}

function sectorHasLateItem(project, stage) {
  return getSectorItems(stage).some((item) => isActivityOverdue(project, item));
}

function getProjectProgress(project) {
  const done = ALL_ACTIVITY_KEYS.filter((key) => isActivityDone(project, key)).length;
  return Math.round((done / ALL_ACTIVITY_KEYS.length) * 100);
}

function getActivityCompletionDate(project, itemKey) {
  const label = CHECKLIST_LABELS[itemKey];
  const marker = `"${label}" concluído`;
  const events = (project.history || [])
    .filter((ev) => ev.type === "check" && ev.message?.includes(marker))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  if (!events.length) return null;
  return events[0].at.split("T")[0];
}

function wasActivityDeliveredOnTime(project, itemKey) {
  const due = project.checklistDates?.[itemKey];
  if (!due) return true;
  const completedDate = getActivityCompletionDate(project, itemKey);
  if (!completedDate) return !isItemLate(due);
  return completedDate <= due;
}

function getProjectDeliveryStatus(project) {
  if (project.completed || isProjectFullyComplete(project)) return "CONCLUIDO";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(project.deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  return today > delivery ? "ATRASADO" : "NO_PRAZO";
}

function buildSectorDashboardStats(projects) {
  return KANBAN_STAGES.map((stage) => {
    let onTime = 0;
    let late = 0;
    let openOnTime = 0;
    let openLate = 0;
    const projectIds = new Set();
    const activeProjectIds = new Set();

    projects.forEach((project) => {
      getSectorItems(stage).forEach((item) => {
        if (isActivityDone(project, item)) {
          projectIds.add(project.id);
          if (wasActivityDeliveredOnTime(project, item)) onTime++;
          else late++;
        } else if (isActivityOverdue(project, item)) {
          openLate++;
        } else {
          openOnTime++;
        }
      });
      if (
        !isProjectFullyComplete(project) &&
        getSectorItems(stage).some((item) => !isActivityDone(project, item))
      ) {
        activeProjectIds.add(project.id);
      }
    });

    const deliveries = onTime + late;
    const openTotal = openOnTime + openLate;
    const activityTotal = deliveries + openTotal;
    const progressSum = projects.reduce((sum, p) => sum + getSectorProgress(p, stage), 0);
    const avgProgress = projects.length ? Math.round(progressSum / projects.length) : 0;

    const pieSegments =
      activityTotal > 0
        ? buildConicGradient([
            { value: onTime, color: "#22c55e" },
            { value: late, color: "#ef4444" },
            { value: openLate, color: "#f59e0b" },
            { value: openOnTime, color: "#94a3b8" }
          ])
        : null;

    const checklistItemCount = getSectorItems(stage).length;

    return {
      stage,
      theme: STAGE_THEMES[stage],
      onTime,
      late,
      openOnTime,
      openLate,
      deliveries,
      openTotal,
      activityTotal,
      checklistItemCount,
      projectsWithDeliveries: projectIds.size,
      activeProjects: activeProjectIds.size,
      avgProgress,
      onTimePct: deliveries ? Math.round((onTime / deliveries) * 100) : 0,
      latePct: deliveries ? Math.round((late / deliveries) * 100) : 0,
      pieSegments
    };
  });
}

function pctOfSectorTotal(sector, count) {
  if (!sector.activityTotal) return 0;
  return (count / sector.activityTotal) * 100;
}

function buildConicGradient(segments) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (!total) return "conic-gradient(#e2e8f0 0% 100%)";
  let cursor = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = cursor;
      cursor += (s.value / total) * 100;
      return `${s.color} ${start}% ${cursor}%`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}

function buildGlobalDashboardInsights(projects, sectorStats) {
  const activeProjects = projects.filter((p) => !isProjectFullyComplete(p)).length;
  const completedProjects = projects.filter(
    (p) => p.completed || isProjectFullyComplete(p)
  ).length;
  const deliveryLate = projects.filter((p) => getProjectDeliveryStatus(p) === "ATRASADO").length;
  const atRisk = projects.filter((p) => {
    if (p.completed || isProjectFullyComplete(p)) return false;
    const days = getDaysUntilDelivery(p.deliveryDate);
    return days >= 0 && days <= 3;
  }).length;

  const ranked = [...sectorStats]
    .filter((s) => s.deliveries > 0)
    .sort((a, b) => b.onTimePct - a.onTimePct);
  const bestSector = ranked[0];
  const worstSector = ranked.length ? ranked[ranked.length - 1] : null;

  const mostOpenLate = [...sectorStats].sort((a, b) => b.openLate - a.openLate)[0];

  return {
    activeProjects,
    completedProjects,
    deliveryLate,
    atRisk,
    bestSector,
    worstSector,
    mostOpenLate
  };
}

function migrateProject(project) {
  const activities = buildEmptyActivities();
  Object.assign(activities, project.activities || {});
  Object.entries(project.checklist || {}).forEach(([key, value]) => {
    if (key in activities) activities[key] = value === true;
  });

  const productionStartDate =
    project.productionStartDate ||
    subtractDays(project.deliveryDate, PRODUCTION_LEAD);

  const checklistDates = {
    ...buildAllChecklistDates(productionStartDate),
    ...(project.checklistDates || {})
  };

  return {
    ...project,
    activities,
    checklistDates,
    productionStartDate,
    completed: project.completed ?? isProjectFullyComplete({ ...project, activities }),
    stage: undefined
  };
}

function App() {
  const { user, logout, isAdmin } = useAuth();

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [detailTab, setDetailTab] = useState("historico");
  const [showNewProject, setShowNewProject] = useState(false);
  const [sectorTabs, setSectorTabs] = useState(() =>
    Object.fromEntries(KANBAN_STAGES.map((s) => [s, "open"]))
  );

  const displayName = user?.name || "Usuário";
  const userInitials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canEditActivity = useCallback(
    (itemKey) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return ACTIVITY_SECTOR[itemKey] === user.sector;
    },
    [user]
  );

  function pushHistory(project, entry) {
    const event = {
      id: Date.now() + Math.random(),
      at: new Date().toISOString(),
      user: displayName,
      ...entry
    };
    return { ...project, history: [event, ...(project.history || [])] };
  }

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setSyncError("");
    try {
      const { projects: list } = await api.fetchProjects();
      setProjects(
        list.map((p) => {
          const migrated = migrateProject(p);
          return {
            ...migrated,
            history: p.history?.length
              ? p.history
              : [
                  {
                    id: 1,
                    at: new Date().toISOString(),
                    message: "Projeto cadastrado no sistema",
                    user: displayName,
                    type: "create"
                  }
                ]
          };
        })
      );
    } catch (err) {
      setSyncError(err.message || "Erro ao carregar projetos");
    } finally {
      setProjectsLoading(false);
    }
  }, [displayName]);

  useEffect(() => {
    if (user) loadProjects();
  }, [user, loadProjects]);

  async function saveProject(project) {
    const { project: saved } = await api.updateProject(project);
    const migrated = migrateProject(saved);
    setProjects((prev) => prev.map((p) => (p.id === migrated.id ? migrated : p)));
    setSelectedProject((prev) => (prev?.id === migrated.id ? migrated : prev));
    return migrated;
  }

  async function importFromLocalStorage() {
    const saved = localStorage.getItem("kazulo-workflow");
    if (!saved) {
      alert("Nenhum dado local encontrado (kazulo-workflow).");
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      await api.importProjects(parsed);
      await loadProjects();
      alert(`${parsed.length} projeto(s) importado(s) para o servidor.`);
    } catch (err) {
      alert(err.message || "Falha na importação");
    }
  }

  async function createProject() {
    if (!isAdmin) return;
    if (!projectName || !client || !deliveryDate) {
      alert("Preencha todos os campos");
      return;
    }

    const productionStartDate = subtractDays(deliveryDate, PRODUCTION_LEAD);
    const checklistDates = buildAllChecklistDates(productionStartDate);

    const newProject = pushHistory(
      {
        id: Date.now(),
        name: projectName,
        client,
        deliveryDate,
        productionStartDate,
        priority,
        completed: false,
        observations: "",
        activities: buildEmptyActivities(),
        checklistDates,
        history: []
      },
      { message: "Projeto criado", type: "create" }
    );

    try {
      const { project: created } = await api.createProject(newProject);
      setProjects((prev) => [...prev, migrateProject(created)]);
      setShowNewProject(false);
      setProjectName("");
      setClient("");
      setDeliveryDate("");
      setPriority("Normal");
    } catch (err) {
      alert(err.message || "Erro ao criar projeto");
    }
  }

  async function updateChecklist(projectId, item) {
    if (!canEditActivity(item)) {
      alert(`Você só pode alterar itens do setor ${user?.sector || "autorizado"}.`);
      return;
    }
    const updated = projects.map((project) => {
      if (project.id !== projectId) return project;

      const status = getActivityStatus(project, item);
      if (status === "locked") return project;

      const activities = { ...getProjectActivities(project) };
      let nextValue = false;
      let message = "";

      if (status === "liberated" || status === "late") {
        nextValue = "in_progress";
        message = `"${CHECKLIST_LABELS[item]}" em andamento (${ACTIVITY_SECTOR[item]})`;
      } else if (status === "progress") {
        nextValue = true;
        message = `"${CHECKLIST_LABELS[item]}" concluído (${ACTIVITY_SECTOR[item]})`;
      } else if (status === "done") {
        nextValue = false;
        message = `"${CHECKLIST_LABELS[item]}" reaberto`;
      }

      const wasParentDone = isActivityDone(project, item);
      activities[item] = nextValue;

      const dependentsToReset =
        wasParentDone && nextValue !== true ? getTransitiveDependents(item) : null;

      if (dependentsToReset) {
        dependentsToReset.forEach((depKey) => {
          if (activities[depKey]) activities[depKey] = false;
        });
      }

      let next = {
        ...project,
        activities,
        completed: ALL_ACTIVITY_KEYS.every((key) => activities[key] === true)
      };

      const historyEntry = {
        message,
        type:
          nextValue === "in_progress"
            ? "progress"
            : nextValue === true
              ? "check"
              : "edit"
      };

      if (dependentsToReset && dependentsToReset.size > 0) {
        historyEntry.message += ` — ${dependentsToReset.size} item(ns) dependente(s) bloqueado(s) novamente`;
      }

      return pushHistory(next, historyEntry);
    });
    const changed = updated.find((p) => p.id === projectId);
    if (!changed) return;
    try {
      await saveProject(changed);
    } catch (err) {
      alert(err.message || "Erro ao salvar");
      loadProjects();
    }
  }

  async function updateObservations(projectId, text) {
    if (!isAdmin) return;
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    const next = { ...target, observations: text };
    try {
      await saveProject(next);
    } catch (err) {
      alert(err.message || "Erro ao salvar observações");
    }
  }

  async function updateDeliveryDate(projectId, newDeliveryDate) {
    if (!isAdmin) return;
    const updated = projects.map((project) => {
      if (project.id !== projectId) return project;
      const newProductionStart = subtractDays(newDeliveryDate, PRODUCTION_LEAD);
      const withDate = {
        ...project,
        deliveryDate: newDeliveryDate,
        productionStartDate: newProductionStart,
        checklistDates: buildAllChecklistDates(newProductionStart)
      };
      return pushHistory(withDate, {
        message: `Data de entrega alterada para ${formatDate(newDeliveryDate)}`,
        type: "edit"
      });
    });
    const changed = updated.find((p) => p.id === projectId);
    if (!changed) return;
    try {
      await saveProject(changed);
    } catch (err) {
      alert(err.message || "Erro ao atualizar data");
      loadProjects();
    }
  }

  async function deleteProject(id) {
    if (!isAdmin) return;
    if (!window.confirm("Deseja excluir este projeto?")) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedProject(null);
    } catch (err) {
      alert(err.message || "Erro ao excluir");
    }
  }

  const delayedProjects = projects.filter(
    (p) => getProjectDeliveryStatus(p) === "ATRASADO"
  );
  const kanbanStages = KANBAN_STAGES;
  const activeCount = projects.filter((p) => !p.completed && !isProjectFullyComplete(p)).length;
  const atRiskCount = projects.filter((p) => {
    if (p.completed || isProjectFullyComplete(p)) return false;
    const days = getDaysUntilDelivery(p.deliveryDate);
    return days >= 0 && days <= 3;
  }).length;
  const completedMonth = projects.filter(
    (p) => p.completed || isProjectFullyComplete(p)
  ).length;

  const filteredProjects = projects.filter((p) => {
    if (p.completed || isProjectFullyComplete(p)) return false;
    if (sectorFilter !== "Todos" && !sectorHasActiveCard(p, sectorFilter)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q)
    );
  });

  function getProjectBadge(project) {
    if (project.completed || isProjectFullyComplete(project)) {
      return { cls: "done", text: "Concluído" };
    }
    const days = getDaysUntilDelivery(project.deliveryDate);
    if (days < 0) return { cls: "late", text: "Atrasado" };
    if (days <= 3) return { cls: "risk", text: days === 0 ? "Hoje" : `A ${days} dias` };
    return { cls: "ok", text: `+ ${days} dias` };
  }

  function getNodeStatus(project, node) {
    const status = getActivityStatus(project, node.key);
    if (status === "done") return "done";
    if (status === "locked") return "locked";
    if (status === "late") return "late";
    return "progress";
  }

  function selectProject(project) {
    setSelectedProject(project);
    setDetailTab("historico");
  }

  const newProjectForm = (
    <>
      <div className="form-grid">
        <div className="form-field">
          <label>Nome do Projeto</label>
          <input
            placeholder="Digite o nome do projeto"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Cliente</label>
          <input
            placeholder="Nome do cliente"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Data de Entrega</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Prioridade</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>Baixa</option>
            <option>Normal</option>
            <option>Alta</option>
            <option>Urgente</option>
          </select>
        </div>
      </div>
      {deliveryDate && (
        <div className="date-preview">
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Entrega</p>
            <h3 style={{ margin: "5px 0 0", color: "#123D7A" }}>{formatDate(deliveryDate)}</h3>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Início Produção</p>
            <h3 style={{ margin: "5px 0 0", color: "#123D7A" }}>
              {formatDate(subtractDays(deliveryDate, PRODUCTION_LEAD))}
            </h3>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn-primary" onClick={createProject}>+ Criar Projeto</button>
        <button type="button" className="btn-secondary" onClick={() => setShowNewProject(false)}>Cancelar</button>
      </div>
    </>
  );

  return (
    <div className="app-shell">

      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <h1>KAZULO</h1>
            <p>Workflow Industrial</p>
          </div>
          <nav className="sidebar-nav">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeMenu === item.id ? "active" : ""}`}
                onClick={() => setActiveMenu(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.id === "Calendario"
                  ? "Calendário"
                  : item.id === "Historico"
                    ? "Histórico"
                    : item.id === "Relatorios"
                      ? "Relatórios"
                      : item.id === "Usuarios"
                        ? "Usuários"
                        : item.id === "Configuracoes"
                          ? "Configurações"
                          : item.id}
              </button>
            ))}
          </nav>
        </div>
        <button type="button" className="sidebar-logout" onClick={logout} title="Encerrar sessão">
          <span className="logout-icon" aria-hidden>⎋</span>
          Sair / Logout
        </button>
      </aside>

      <div className="main-wrap">


        <div className="top-bar">
          <div className="stats-grid">
            <div className="stat-card blue">
              <div>
                <p className="stat-label">Projetos Ativos</p>
                <p className="stat-value">{activeCount}</p>
              </div>
              <div className="stat-icon">📁</div>
            </div>
            <div className="stat-card warning">
              <div>
                <p className="stat-label">Em Risco</p>
                <p className="stat-value">{atRiskCount}</p>
              </div>
              <div className="stat-icon">⚠</div>
            </div>
            <div className="stat-card danger">
              <div>
                <p className="stat-label">Atrasados</p>
                <p className="stat-value">{delayedProjects.length}</p>
              </div>
              <div className="stat-icon">⏱</div>
            </div>
            <div className="stat-card success">
              <div>
                <p className="stat-label">Concluídos (Mês)</p>
                <p className="stat-value">{completedMonth}</p>
              </div>
              <div className="stat-icon">✓</div>
            </div>
          </div>
          <div className="user-area">
            <button type="button" className="notif-btn" aria-label="Notificações">
              🔔
              <span className="notif-badge">3</span>
            </button>
            <div className="user-chip">
              <div className="user-avatar">{userInitials}</div>
              <div>
                <div className="user-name">{displayName}</div>
                <div className="user-role">
                  {isAdmin ? "Administrador" : `Setor ${user?.sector}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-logout-top"
              onClick={logout}
              title="Encerrar sessão e voltar ao login"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="workspace">
          {syncError && (
            <div className="sync-error-banner">{syncError}</div>
          )}
         
          {projectsLoading ? (
            <div className="board-loading">Carregando projetos…</div>
          ) : activeMenu === "Dashboard" ? (
            <DashboardView projects={projects} />
          ) : (
          <>
          <div className="board-area">
            <div className="fluxo-header">
              <div>
                <h2>Fluxo de Produção</h2>
                <p>Acompanhe o andamento dos projetos por setor</p>
              </div>
              <div className="fluxo-tools">
                <input
                  className="search-input"
                  placeholder="Buscar projeto ou cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="filter-select"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                >
                  <option value="Todos">Todos os setores</option>
                  {kanbanStages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" className="filter-btn" title="Filtros">⚲</button>
                {isAdmin && (
                  <button type="button" className="btn-primary" onClick={() => setShowNewProject(true)}>
                    + Novo Projeto
                  </button>
                )}
              </div>
            </div>

            <div className="status-legend">
              {STATUS_LEGEND.map((s) => (
                <span key={s.label} className="legend-item">
                  <span
                    className={`legend-dot ${s.variant || ""}`}
                    style={s.color ? { background: s.color } : undefined}
                  />
                  {s.label}
                </span>
              ))}
              <span className="legend-hint">Clique: 1× em andamento · 2× concluído · 3× reabre</span>
            </div>

            <div className="kanban-board">
              {kanbanStages.map((stage) => {
                const theme = STAGE_THEMES[stage];
                const columnTab = sectorTabs[stage] || "open";
                const openProjects = filteredProjects.filter((p) =>
                  sectorHasActiveCard(p, stage)
                );
                const doneProjects = filteredProjects.filter((p) =>
                  sectorHasCompletedWork(p, stage)
                );
                const stageProjects =
                  columnTab === "done" ? doneProjects : openProjects;

                return (
                  <div
                    key={stage}
                    className="kanban-column"
                    style={{ background: theme?.bg || "#e9f0fb" }}
                  >
                    <div className="kanban-column-header">
                      <div
                        className="kanban-column-title"
                        style={{ color: theme?.accent || "#123D7A" }}
                      >
                        <span>{theme?.icon}</span>
                        {stage.toUpperCase()}
                      </div>
                      <div className="kanban-count">{stageProjects.length}</div>
                    </div>
                    <div className="kanban-column-tabs">
                      <button
                        type="button"
                        className={`kanban-tab ${columnTab === "open" ? "active" : ""}`}
                        onClick={() =>
                          setSectorTabs((prev) => ({ ...prev, [stage]: "open" }))
                        }
                      >
                        Em aberto ({openProjects.length})
                      </button>
                      <button
                        type="button"
                        className={`kanban-tab ${columnTab === "done" ? "active" : ""}`}
                        onClick={() =>
                          setSectorTabs((prev) => ({ ...prev, [stage]: "done" }))
                        }
                      >
                        Concluídos ({doneProjects.length})
                      </button>
                    </div>
                    <div className="kanban-cards">
                      {stageProjects.length === 0 ? (
                        <p className="kanban-empty-tab">
                          {columnTab === "done"
                            ? "Nenhum item concluído neste setor."
                            : "Nenhum projeto em aberto."}
                        </p>
                      ) : (
                        stageProjects.map((project) => (
                          <KanbanProjectCard
                            key={`${project.id}-${stage}-${columnTab}`}
                            project={project}
                            stage={stage}
                            completedView={columnTab === "done"}
                            selected={selectedProject?.id === project.id}
                            badge={getProjectBadge(project)}
                            onSelect={() => selectProject(project)}
                            canEditActivity={canEditActivity}
                            onToggleChecklist={(item) =>
                              updateChecklist(project.id, item)
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedProject && (
              <div className="dependency-section">
                <h3>Mapa de Dependências — {selectedProject.name}</h3>
                <div className="dependency-flow">
                  {DEPENDENCY_CHAIN.map((node, i) => (
                    <React.Fragment key={node.key}>
                      {i > 0 && <span className="dep-arrow">→</span>}
                      <div className={`dep-node ${getNodeStatus(selectedProject, node)}`}>
                        {node.label}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div className="how-it-works">
                  <strong>Como funciona?</strong>
                  Projeto libera F.O. para Desenvolver, laser e caixa (Processos). F.O. para Desenvolver libera Desenvolvimento (incl. Reunião de análises). Reunião de análises libera F.O. para produção, que libera O.P./F.O. (PCP). Lista de materiais libera Solicitação compras. Solicitação compras libera Compras (exceto caixa de compras → depende da caixa de Processos).
                </div>
              </div>
            )}
          </div>

          {selectedProject && (
            <aside className="detail-panel">
              <div className="detail-panel-header">
                <div>
                  <h3>{selectedProject.name}</h3>
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {selectedProject.client}
                  </p>
                </div>
                <button
                  type="button"
                  className="detail-close"
                  onClick={() => setSelectedProject(null)}
                >
                  ×
                </button>
              </div>
              <div className="detail-tabs">
                {["checklist", "detalhes", "historico"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`detail-tab ${detailTab === tab ? "active" : ""}`}
                    onClick={() => setDetailTab(tab)}
                  >
                    {tab === "checklist" ? "Checklist" : tab === "detalhes" ? "Detalhes" : "Histórico"}
                  </button>
                ))}
              </div>
              <div className="detail-body">
                {detailTab === "historico" && (
                  <div className="timeline">
                    {(selectedProject.history || []).map((ev) => (
                      <div key={ev.id} className="timeline-item">
                        <div className={`timeline-dot ${ev.type || "edit"}`}>
                          {ev.type === "create"
                            ? "+"
                            : ev.type === "advance"
                              ? "→"
                              : ev.type === "check"
                                ? "✓"
                                : ev.type === "progress"
                                  ? "●"
                                  : "✎"}
                        </div>
                        <div className="timeline-content">
                          <div className="time">{formatDateTime(ev.at)}</div>
                          <div className="msg">{ev.message}</div>
                          <div className="user">{ev.user}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {detailTab === "checklist" && (
                  <div className="checklist-panel">
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                      Progresso geral: <strong>{getProjectProgress(selectedProject)}%</strong>
                    </p>
                    {kanbanStages.map((stageName) => (
                      <div key={stageName} className="checklist-sector-group">
                        <p className="checklist-sector-title">{stageName}</p>
                        {getSectorItems(stageName).map((item) => {
                          const status = getActivityStatus(selectedProject, item);
                          const dueDate = selectedProject.checklistDates?.[item];
                          const locked = status === "locked";
                          const late = status === "late";
                          const deps = ACTIVITY_DEPENDENCIES[item];
                          const iconClass =
                            status === "done"
                              ? "done"
                              : status === "locked"
                                ? "locked"
                                : status === "progress"
                                  ? "progress"
                                  : late
                                    ? "late"
                                    : "pending";

                          if (locked) {
                            return (
                              <div
                                key={item}
                                className="checklist-panel-row locked-item"
                              >
                                <span className={`status-icon ${iconClass}`} />
                                <span style={{ flex: 1 }}>
                                  {CHECKLIST_LABELS[item]}
                                  {deps?.length > 0 && (
                                    <span className="dep-hint">
                                      {" "}
                                      — aguarda: {deps.map((d) => CHECKLIST_LABELS[d]).join(", ")}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          }

                          const editable = canEditActivity(item);

                          return (
                            <button
                              key={item}
                              type="button"
                              disabled={!editable}
                              className={`checklist-panel-row ${late ? "late-item" : ""} ${!editable ? "read-only" : ""}`}
                              onClick={() => updateChecklist(selectedProject.id, item)}
                              title={
                                editable
                                  ? undefined
                                  : `Somente o setor ${ACTIVITY_SECTOR[item]} pode alterar`
                              }
                            >
                              <span className={`status-icon ${iconClass}`}>
                                {status === "done"
                                  ? "✓"
                                  : status === "progress"
                                    ? "●"
                                    : late
                                      ? "!"
                                      : ""}
                              </span>
                              <span
                                className={`item-label ${status === "done" ? "done" : ""} ${status === "progress" ? "in-progress" : ""}`}
                                style={{ flex: 1, textAlign: "left" }}
                              >
                                {CHECKLIST_LABELS[item]}
                              </span>
                              {dueDate && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: late && status !== "progress" ? "#dc2626" : "#64748b"
                                  }}
                                >
                                  {formatDate(dueDate)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    {isAdmin && (
                      <div className="detail-actions">
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => deleteProject(selectedProject.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {detailTab === "detalhes" && (
                  <>
                    <div className="form-field" style={{ marginBottom: 12 }}>
                      <label>Data de Entrega</label>
                      <input
                        type="date"
                        value={selectedProject.deliveryDate}
                        disabled={!isAdmin}
                        onChange={(e) => updateDeliveryDate(selectedProject.id, e.target.value)}
                      />
                    </div>
                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                      Início produção: <strong>{formatDate(selectedProject.productionStartDate)}</strong>
                    </p>
                    <textarea
                      className="detail-textarea"
                      placeholder="Observações..."
                      value={selectedProject.observations || ""}
                      readOnly={!isAdmin}
                      onChange={(e) => updateObservations(selectedProject.id, e.target.value)}
                    />
                    {!isAdmin && (
                      <p className="read-only-hint">Dados gerais: somente administrador edita.</p>
                    )}
                  </>
                )}
                <div className="info-box">
                  <dl>
                    <div>
                      <dt>Cliente</dt>
                      <dd>{selectedProject.client}</dd>
                    </div>
                    <div>
                      <dt>Entrega</dt>
                      <dd>{formatDate(selectedProject.deliveryDate)}</dd>
                    </div>
                    <div>
                      <dt>Início Produção</dt>
                      <dd>{formatDate(selectedProject.productionStartDate)}</dd>
                    </div>
                    <div>
                      <dt>Prioridade</dt>
                      <dd>
                        <span className={`priority-pill ${selectedProject.priority}`}>
                          {selectedProject.priority}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </aside>
          )}
          </>
          )}
        </div>
      </div>

      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Novo Projeto</h2>
            <p style={{ color: "#64748b", marginBottom: 8 }}>Cadastre um novo projeto no fluxo</p>
            {newProjectForm}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ projects }) {
  const sectorStats = buildSectorDashboardStats(projects);
  const insights = buildGlobalDashboardInsights(projects, sectorStats);

  const totalProjects = projects.length;
  const totalDeliveries = sectorStats.reduce((sum, s) => sum + s.deliveries, 0);
  const totalOnTime = sectorStats.reduce((sum, s) => sum + s.onTime, 0);
  const totalLate = sectorStats.reduce((sum, s) => sum + s.late, 0);
  const totalOpenLate = sectorStats.reduce((sum, s) => sum + s.openLate, 0);
  const globalOnTimePct = totalDeliveries
    ? Math.round((totalOnTime / totalDeliveries) * 100)
    : 0;

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Indicadores por setor — pontualidade, volume e projetos em andamento</p>
        </div>
      </div>

      <div className="dashboard-summary">
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Projetos cadastrados</p>
          <p className="dashboard-summary-value">{totalProjects}</p>
        </div>
        <div className="dashboard-summary-card success">
          <p className="dashboard-summary-label">Projetos concluídos</p>
          <p className="dashboard-summary-value">{insights.completedProjects}</p>
        </div>
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Projetos ativos</p>
          <p className="dashboard-summary-value">{insights.activeProjects}</p>
        </div>
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Entrega final atrasada</p>
          <p className="dashboard-summary-value late">{insights.deliveryLate}</p>
        </div>
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Em risco (≤3 dias)</p>
          <p className="dashboard-summary-value warning">{insights.atRisk}</p>
        </div>
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Itens no prazo</p>
          <p className="dashboard-summary-value on-time">{totalOnTime}</p>
        </div>
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Itens fora do prazo</p>
          <p className="dashboard-summary-value late">{totalLate + totalOpenLate}</p>
        </div>
        <div className="dashboard-summary-card">
          <p className="dashboard-summary-label">Taxa geral no prazo</p>
          <p className="dashboard-summary-value on-time">{globalOnTimePct}%</p>
        </div>
      </div>

      <div className="dashboard-insights">
        {insights.bestSector && (
          <div className="dashboard-insight-card good">
            <strong>Melhor setor</strong>
            <span>
              {insights.bestSector.theme?.icon} {insights.bestSector.stage} —{" "}
              {insights.bestSector.onTimePct}% das entregas no prazo
            </span>
          </div>
        )}
        {insights.worstSector && insights.worstSector !== insights.bestSector && (
          <div className="dashboard-insight-card warn">
            <strong>Precisa de atenção</strong>
            <span>
              {insights.worstSector.theme?.icon} {insights.worstSector.stage} —{" "}
              {insights.worstSector.latePct}% das entregas concluídas com atraso
            </span>
          </div>
        )}
        {insights.mostOpenLate?.openLate > 0 && (
          <div className="dashboard-insight-card danger">
            <strong>Mais itens em aberto atrasados</strong>
            <span>
              {insights.mostOpenLate.theme?.icon} {insights.mostOpenLate.stage} —{" "}
              {insights.mostOpenLate.openLate} item(ns) vencido(s)
            </span>
          </div>
        )}
      </div>

      <section className="dashboard-panel dashboard-distribution">
        <h3>Composição por setor</h3>
        <p className="dashboard-panel-desc">
          Cada barra representa 100% das atividades daquele setor. Setores com mais itens no
          checklist (ex.: Compras) não “encolhem” os demais — a proporção é sempre interna ao setor.
        </p>
        <div className="dashboard-distribution-list">
          {sectorStats.map((sector) => (
            <div key={sector.stage} className="distribution-row">
              <div className="distribution-row-head">
                <span className="distribution-row-title">
                  {sector.theme?.icon} {sector.stage}
                </span>
                <span className="distribution-row-meta">
                  {sector.checklistItemCount} itens/checklist · {sector.activityTotal} registros
                  {sector.deliveries > 0 && (
                    <> · <strong>{sector.onTimePct}%</strong> entregas no prazo</>
                  )}
                </span>
              </div>
              {sector.activityTotal === 0 ? (
                <div className="distribution-bar distribution-bar--empty">
                  <span>Sem atividades nos projetos</span>
                </div>
              ) : (
                <div
                  className="distribution-bar"
                  role="img"
                  aria-label={`${sector.stage}: ${sector.onTime} no prazo, ${sector.late} atrasadas, ${sector.openLate} em aberto atrasadas, ${sector.openOnTime} em aberto no prazo`}
                >
                  {sector.onTime > 0 && (
                    <div
                      className="distribution-bar-fill on-time"
                      style={{ width: `${pctOfSectorTotal(sector, sector.onTime)}%` }}
                      title={`Concluído no prazo: ${sector.onTime}`}
                    />
                  )}
                  {sector.late > 0 && (
                    <div
                      className="distribution-bar-fill late"
                      style={{ width: `${pctOfSectorTotal(sector, sector.late)}%` }}
                      title={`Concluído com atraso: ${sector.late}`}
                    />
                  )}
                  {sector.openLate > 0 && (
                    <div
                      className="distribution-bar-fill open-late"
                      style={{ width: `${pctOfSectorTotal(sector, sector.openLate)}%` }}
                      title={`Em aberto atrasado: ${sector.openLate}`}
                    />
                  )}
                  {sector.openOnTime > 0 && (
                    <div
                      className="distribution-bar-fill open-ok"
                      style={{ width: `${pctOfSectorTotal(sector, sector.openOnTime)}%` }}
                      title={`Em aberto no prazo: ${sector.openOnTime}`}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="dashboard-legend-row">
          <span><i className="legend-swatch on-time" /> Concluído no prazo</span>
          <span><i className="legend-swatch late" /> Concluído com atraso</span>
          <span><i className="legend-swatch open-late" /> Em aberto atrasado</span>
          <span><i className="legend-swatch open-ok" /> Em aberto no prazo</span>
        </div>
      </section>

      <div className="dashboard-sectors-grid">
        {sectorStats.map((sector) => {
          return (
            <article
              key={sector.stage}
              className="dashboard-sector-card"
              style={{ borderTopColor: sector.theme?.accent || "#123D7A" }}
            >
              <div className="dashboard-sector-head">
                <span className="dashboard-sector-icon">{sector.theme?.icon}</span>
                <div>
                  <h3>{sector.stage}</h3>
                  <p>
                    {sector.activeProjects} projeto(s) ativos · progresso médio{" "}
                    {sector.avgProgress}%
                  </p>
                </div>
              </div>

              {sector.activityTotal === 0 ? (
                <p className="dashboard-empty">Nenhuma atividade registrada neste setor.</p>
              ) : (
                <div className="dashboard-sector-body">
                  <div className="dashboard-pie-wrap">
                    <div
                      className="dashboard-pie"
                      style={
                        sector.pieSegments ? { background: sector.pieSegments } : undefined
                      }
                    >
                      <span className="dashboard-pie-center">
                        {sector.deliveries ? `${sector.onTimePct}%` : "—"}
                      </span>
                    </div>
                    <p className="dashboard-pie-caption">
                      {sector.deliveries ? "entregas no prazo" : "sem entregas"}
                    </p>
                  </div>

                  <div className="dashboard-stacked-wrap">
                    <p className="dashboard-stacked-label">Distribuição do setor (100%)</p>
                    <div className="distribution-bar distribution-bar--card">
                      {sector.onTime > 0 && (
                        <div
                          className="distribution-bar-fill on-time"
                          style={{ width: `${pctOfSectorTotal(sector, sector.onTime)}%` }}
                        />
                      )}
                      {sector.late > 0 && (
                        <div
                          className="distribution-bar-fill late"
                          style={{ width: `${pctOfSectorTotal(sector, sector.late)}%` }}
                        />
                      )}
                      {sector.openLate > 0 && (
                        <div
                          className="distribution-bar-fill open-late"
                          style={{ width: `${pctOfSectorTotal(sector, sector.openLate)}%` }}
                        />
                      )}
                      {sector.openOnTime > 0 && (
                        <div
                          className="distribution-bar-fill open-ok"
                          style={{ width: `${pctOfSectorTotal(sector, sector.openOnTime)}%` }}
                        />
                      )}
                    </div>
                    <div className="dashboard-stat-chips">
                      <span className="chip on-time">✓ {sector.onTime} no prazo</span>
                      <span className="chip late">✗ {sector.late} atrasado</span>
                      <span className="chip open-late">! {sector.openLate} ab. atrasado</span>
                      <span className="chip open-ok">○ {sector.openOnTime} ab. ok</span>
                    </div>
                  </div>

                  <div className="dashboard-sector-totals">
                    <span>
                      <strong>{sector.deliveries}</strong> entregas ·{" "}
                      <strong>{sector.openTotal}</strong> em aberto
                    </span>
                    <span className="on-time-text">
                      {sector.onTimePct}% concluídas no prazo
                    </span>
                  </div>
                </div>
              )}

              <div className="dashboard-projects-foot">
                <div>
                  <span className="dashboard-projects-count">
                    {sector.projectsWithDeliveries}
                  </span>
                  <span> com entregas concluídas</span>
                </div>
                <div className="dashboard-mini-progress">
                  <span>Progresso médio do setor</span>
                  <div className="dashboard-mini-progress-track">
                    <div
                      className="dashboard-mini-progress-fill"
                      style={{
                        width: `${sector.avgProgress}%`,
                        background: sector.theme?.accent || "#123D7A"
                      }}
                    />
                  </div>
                  <strong>{sector.avgProgress}%</strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function KanbanProjectCard({
  project,
  stage,
  selected,
  badge,
  onSelect,
  onToggleChecklist,
  canEditActivity,
  completedView = false
}) {
  const allItems = getSectorItems(stage);
  const items = completedView
    ? allItems.filter((item) => isActivityDone(project, item))
    : allItems;
  const progressPct = getSectorProgress(project, stage);
  const sectorLate = !completedView && sectorHasLateItem(project, stage);

  return (
    <div
      className={`project-card ${selected ? "selected" : ""} ${sectorLate ? "late" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="card-title">{project.name}</div>
      <div className="card-delivery">
        Início produção:{" "}
        {formatDate(
          project.productionStartDate ||
            subtractDays(project.deliveryDate, PRODUCTION_LEAD)
        )}
      </div>
      <div className="card-badges">
        <span className={`badge ${badge.cls}`}>{badge.text}</span>
        <span className="badge ok">{stage} · {progressPct}%</span>
      </div>
      <div className="card-progress">
        <div className="card-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      {items.length > 0 && (
        <div
          className={`checklist-dots ${completedView ? "completed-view" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {completedView && (
            <p className="card-completed-label">
              {countSectorDoneItems(project, stage)} concluído(s) em {stage}
            </p>
          )}
          {items.map((item) => {
            const status = getActivityStatus(project, item);
            const locked = !completedView && status === "locked";
            const done = status === "done";
            const overdue = isActivityOverdue(project, item);
            const late = status === "late" || overdue;
            const inProgress = status === "progress";
            const dueDate = project.checklistDates?.[item];
            const iconClass = done
              ? "done"
              : locked
                ? "locked"
                : inProgress
                  ? "progress"
                  : late
                    ? "late"
                    : "pending";

            const statusLabel = done
              ? "concluído"
              : inProgress
                ? "em andamento"
                : locked
                  ? "bloqueado"
                  : late
                    ? "atrasado"
                    : "liberado";

            const dueDateEl = dueDate ? (
              <span className={`item-due-date ${late && !done ? "overdue" : ""}`}>
                {formatDate(dueDate)}
              </span>
            ) : null;

            if (locked) {
              return (
                <div
                  key={item}
                  className="checklist-dot-row locked"
                  aria-label={`${CHECKLIST_LABELS[item]} — bloqueado${dueDate ? `, prazo ${formatDate(dueDate)}` : ""}`}
                >
                  <span className={`status-icon ${iconClass}`} />
                  <span className="item-label locked">{CHECKLIST_LABELS[item]}</span>
                  {dueDateEl}
                </div>
              );
            }

            const editable = canEditActivity(item);

            return (
              <button
                key={item}
                type="button"
                disabled={!editable}
                className={`checklist-dot-row ${!editable ? "read-only" : ""}`}
                aria-label={`${CHECKLIST_LABELS[item]} — ${statusLabel}${editable ? ". Clique para avançar." : " (somente leitura)"}`}
                title={
                  editable ? undefined : `Edição pelo setor ${ACTIVITY_SECTOR[item]}`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (editable) onToggleChecklist(item);
                }}
              >
                <span className={`status-icon ${iconClass}`}>
                  {done ? "✓" : inProgress ? "●" : late ? "!" : ""}
                </span>
                <span
                  className={`item-label ${done ? "done" : ""} ${inProgress ? "in-progress" : ""}`}
                >
                  {CHECKLIST_LABELS[item]}
                </span>
                {dueDateEl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


export default App;
