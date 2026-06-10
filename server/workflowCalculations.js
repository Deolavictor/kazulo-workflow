import {
  ACTIVITY_DEPENDENCIES,
  CHECKLIST_LABELS,
  PRODUCTION_GATE_KEYS,
  PRODUCTION_LEAD,
  SECTOR_CHECKLISTS
} from "./workflowData.js";
import {
  subtractBusinessDays,
  normalizeDeliveryDate,
  isBusinessDay
} from "../shared/businessDays.js";

export { subtractBusinessDays as subtractDays, normalizeDeliveryDate, isBusinessDay };

export function formatDateBr(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function isItemLate(dueDateStr) {
  if (!dueDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDateStr) < today;
}

export function getDaysLate(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((today - due) / (1000 * 60 * 60 * 24));
}

function getProjectActivities(project) {
  if (project.activities) return project.activities;
  const activities = {};
  for (const key of Object.keys(SECTOR_CHECKLISTS).flatMap((s) =>
    Object.keys(SECTOR_CHECKLISTS[s])
  )) {
    activities[key] = false;
  }
  Object.entries(project.checklist || {}).forEach(([key, value]) => {
    if (key in activities) activities[key] = value === true;
  });
  return activities;
}

export function isActivityDone(project, itemKey) {
  return getProjectActivities(project)[itemKey] === true;
}

function isActivityInProgress(project, itemKey) {
  return getProjectActivities(project)[itemKey] === "in_progress";
}

function isActivityLiberated(project, itemKey) {
  const deps = ACTIVITY_DEPENDENCIES[itemKey];
  if (!deps?.length) return true;
  return deps.every((dep) => isActivityDone(project, dep));
}

export function getActivityStatus(project, itemKey) {
  if (!isActivityLiberated(project, itemKey)) return "locked";
  if (isActivityDone(project, itemKey)) return "done";
  if (isActivityInProgress(project, itemKey)) return "progress";
  const due = project.checklistDates?.[itemKey];
  if (isItemLate(due)) return "late";
  return "liberated";
}

export function getSectorItems(stage) {
  return Object.keys(SECTOR_CHECKLISTS[stage] || {});
}

export function isProjectFullyComplete(project) {
  const keys = Object.keys(SECTOR_CHECKLISTS).flatMap((s) =>
    Object.keys(SECTOR_CHECKLISTS[s])
  );
  return keys.every((key) => isActivityDone(project, key));
}

export function isActivityOverdueForKpi(project, itemKey) {
  if (isActivityDone(project, itemKey)) return false;
  const prodStart =
    project.productionStartDate ||
    subtractDays(project.deliveryDate, PRODUCTION_LEAD);
  if (PRODUCTION_GATE_KEYS.includes(itemKey) && isItemLate(prodStart)) return true;
  const due = project.checklistDates?.[itemKey];
  return due ? isItemLate(due) : false;
}

export function getOpenDelayDays(project, itemKey) {
  const prodStart =
    project.productionStartDate ||
    subtractDays(project.deliveryDate, PRODUCTION_LEAD);
  if (PRODUCTION_GATE_KEYS.includes(itemKey) && isItemLate(prodStart)) {
    return getDaysLate(prodStart);
  }
  const due = project.checklistDates?.[itemKey];
  return due && isItemLate(due) ? getDaysLate(due) : 0;
}

function statusLabel(status) {
  if (status === "locked") return "Bloqueado";
  if (status === "progress") return "Em andamento";
  if (status === "late") return "Atrasado";
  return "Liberado";
}

/** Lista de atrasos por setor (mesma regra dos Relatórios) */
export function buildSectorOverdueList(projects, stage) {
  const overdue = [];
  const itemKeys = getSectorItems(stage);

  for (const project of projects) {
    if (project.completed || isProjectFullyComplete(project)) continue;

    for (const key of itemKeys) {
      if (isActivityDone(project, key)) continue;
      if (!isActivityOverdueForKpi(project, key)) continue;

      const status = getActivityStatus(project, key);
      overdue.push({
        projectId: project.id,
        projectName: project.name,
        client: project.client || "",
        itemKey: key,
        label: CHECKLIST_LABELS[key],
        dueDate: project.checklistDates?.[key] || null,
        status,
        statusLabel: statusLabel(status),
        daysLate: getOpenDelayDays(project, key)
      });
    }
  }

  overdue.sort((a, b) => b.daysLate - a.daysLate);
  return overdue;
}
