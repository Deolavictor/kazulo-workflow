import { KANBAN_STAGES } from "./workflowRules.js";
import { ACTIVITY_SECTOR } from "./workflowRules.js";
import {
  CHECKLIST_LABELS,
  PRODUCTION_GATE_KEYS
} from "./workflowData.js";
import {
  buildSectorOverdueList,
  formatDateBr,
  getDaysLate,
  isActivityDone,
  isProjectFullyComplete
} from "./workflowCalculations.js";
import {
  buildComprasSupplierBlockers,
  getProductionStartDate
} from "./workflowCompras.js";

function todayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isItemLate(dueDateStr) {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < todayAtMidnight();
}

function getDaysUntilDelivery(deliveryDate) {
  if (!deliveryDate) return null;
  const today = todayAtMidnight();
  const due = new Date(deliveryDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function notificationId(parts) {
  return parts.filter(Boolean).join(":");
}

function sectorsForUser(user) {
  if (user.role === "admin") return KANBAN_STAGES;
  return user.sector ? [user.sector] : [];
}

function userSeesSector(user, sector) {
  if (user.role === "admin") return true;
  return user.sector === sector;
}

export function buildUserNotifications(projects, user) {
  const list = [];
  const sectors = sectorsForUser(user);
  const active = projects.filter((p) => !p.completed && !isProjectFullyComplete(p));

  for (const stage of sectors) {
    for (const row of buildSectorOverdueList(active, stage)) {
      list.push({
        id: notificationId(["overdue", row.projectId, row.itemKey]),
        type: "overdue",
        priority: row.daysLate >= 3 ? "high" : "medium",
        projectId: row.projectId,
        projectName: row.projectName,
        client: row.client,
        sector: stage,
        itemKey: row.itemKey,
        label: row.label,
        daysLate: row.daysLate,
        message: `${row.label} — ${row.daysLate} dia(s) em atraso`,
        href: { menu: "Projetos", projectId: row.projectId }
      });
    }
  }

  for (const project of active) {
    for (const b of buildComprasSupplierBlockers(project)) {
      list.push({
        id: notificationId(["supplier", project.id, b.key]),
        type: "production_blocker",
        priority: "high",
        projectId: project.id,
        projectName: project.name,
        client: project.client || "",
        sector: "Compras",
        itemKey: b.key,
        label: b.label,
        daysLate: b.daysLate,
        message: `Prazo do fornecedor (${b.label}) não atende o início de produção — entrega ${formatDateBr(b.dueDate)}, início ${formatDateBr(getProductionStartDate(project))}`,
        at: new Date().toISOString(),
        href: { menu: "Previsoes", projectId: project.id }
      });
    }

    for (const key of PRODUCTION_GATE_KEYS) {
      if (isActivityDone(project, key)) continue;
      const due = project.checklistDates?.[key];
      if (!due || !isItemLate(due)) continue;
      const sector = ACTIVITY_SECTOR[key];
      if (!userSeesSector(user, sector)) continue;

      const daysLate = getDaysLate(due);
      list.push({
        id: notificationId(["gate", project.id, key]),
        type: "production_blocker",
        priority: "high",
        projectId: project.id,
        projectName: project.name,
        client: project.client || "",
        sector,
        itemKey: key,
        label: CHECKLIST_LABELS[key],
        daysLate,
        message: `Bloqueio produção: ${CHECKLIST_LABELS[key]} (${daysLate}d)`,
        href: { menu: "Previsoes", projectId: project.id }
      });
    }

    const daysLeft = getDaysUntilDelivery(project.deliveryDate);
    if (daysLeft != null && daysLeft >= 0 && daysLeft <= 3) {
      list.push({
        id: notificationId(["delivery", project.id]),
        type: "delivery_risk",
        priority: daysLeft === 0 ? "high" : "medium",
        projectId: project.id,
        projectName: project.name,
        client: project.client || "",
        sector: null,
        label: "Entrega",
        daysLate: null,
        daysUntilDelivery: daysLeft,
        message:
          daysLeft === 0
            ? `Entrega hoje — ${project.name}`
            : `Entrega em ${daysLeft} dia(s) — ${project.name}`,
        href: { menu: "Projetos", projectId: project.id }
      });
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const n of list) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    const deliveryDate =
      n.type === "delivery_risk" ? projectDeliveryDate(active, n.projectId) : null;
    deduped.push({
      ...n,
      at: new Date().toISOString(),
      dueLabel: deliveryDate ? formatDateBr(deliveryDate) : null
    });
  }

  deduped.sort((a, b) => {
    const prio = { high: 0, medium: 1 };
    const pd = (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2);
    if (pd !== 0) return pd;
    return (b.daysLate || 0) - (a.daysLate || 0);
  });

  return deduped;
}

function projectDeliveryDate(projects, id) {
  const p = projects.find((x) => x.id === id);
  return p?.deliveryDate || null;
}
