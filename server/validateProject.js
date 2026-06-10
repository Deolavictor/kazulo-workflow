import { normalizeDeliveryDate } from "../shared/businessDays.js";
import { ACTIVITY_SECTOR, canUserEditProjectMeta } from "./workflowRules.js";
import { COMPRAS_ITEM_KEYS } from "./workflowCompras.js";

/** Campos que só o admin pode editar diretamente */
const ADMIN_META_KEYS = [
  "name",
  "client",
  "deliveryDate",
  "productionStartDate",
  "priority",
  "observations"
];

function normalizeActivityValue(value) {
  if (value === true || value === "in_progress") return value;
  return false;
}

function getActivities(project) {
  const activities = {};
  for (const key of Object.keys(ACTIVITY_SECTOR)) {
    activities[key] = false;
  }
  Object.assign(activities, project.activities || {});
  Object.entries(project.checklist || {}).forEach(([key, value]) => {
    if (key in ACTIVITY_SECTOR && !(key in (project.activities || {}))) {
      activities[key] = value === true;
    }
  });
  for (const key of Object.keys(activities)) {
    activities[key] = normalizeActivityValue(activities[key]);
  }
  return activities;
}

function activityValueChanged(before, after) {
  return normalizeActivityValue(before) !== normalizeActivityValue(after);
}

function deliveryDatesEquivalent(oldProject, newProject) {
  const oldD = normalizeDeliveryDate(oldProject.deliveryDate || "");
  const newD = normalizeDeliveryDate(newProject.deliveryDate || "");
  return Boolean(oldD) && oldD === newD;
}

/** Detecta alteração real em metadados (ignora campos derivados/normalização do cliente) */
function adminMetaFieldChanged(key, oldProject, newProject) {
  const oldVal = oldProject[key];
  const newVal = newProject[key];

  if (key === "deliveryDate") {
    return normalizeDeliveryDate(oldVal || "") !== normalizeDeliveryDate(newVal || "");
  }

  if (key === "productionStartDate") {
    if (deliveryDatesEquivalent(oldProject, newProject)) return false;
    if (!oldVal && newVal) return false;
  }

  if (key === "checklistDates") {
    const oldDates = oldVal || {};
    const newDates = newVal || {};
    for (const dateKey of Object.keys(oldDates)) {
      if (oldDates[dateKey] !== newDates[dateKey]) return true;
    }
    return false;
  }

  return JSON.stringify(oldVal) !== JSON.stringify(newVal);
}

export function validateProjectUpdate(user, oldProject, newProject) {
  if (!oldProject || !newProject) {
    return { ok: false, error: "Projeto inválido" };
  }

  if (String(oldProject.id) !== String(newProject.id)) {
    return { ok: false, error: "ID do projeto não pode mudar" };
  }

  if (user.role === "admin") {
    return { ok: true };
  }

  if (!canUserEditProjectMeta(user)) {
    for (const key of ADMIN_META_KEYS) {
      if (adminMetaFieldChanged(key, oldProject, newProject)) {
        return {
          ok: false,
          error: "Somente administradores podem alterar dados gerais do projeto"
        };
      }
    }

    if (JSON.stringify(oldProject.history) !== JSON.stringify(newProject.history)) {
      const oldLen = (oldProject.history || []).length;
      const newLen = (newProject.history || []).length;
      if (newLen !== oldLen + 1) {
        return { ok: false, error: "Alteração de histórico não permitida" };
      }
    }
  }

  const oldActs = getActivities(oldProject);
  const newActs = getActivities(newProject);

  for (const key of Object.keys(ACTIVITY_SECTOR)) {
    const before = oldActs[key];
    const after = newActs[key];
    if (!activityValueChanged(before, after)) continue;
    if (ACTIVITY_SECTOR[key] !== user.sector) {
      return {
        ok: false,
        error: `Sem permissão para alterar "${key}" (setor ${ACTIVITY_SECTOR[key]})`
      };
    }
  }

  const oldSup = oldProject.supplierDeadlines || {};
  const newSup = newProject.supplierDeadlines || {};
  if (JSON.stringify(oldSup) !== JSON.stringify(newSup)) {
    if (user.role !== "admin" && user.sector !== "Compras") {
      return {
        ok: false,
        error: "Somente o setor Compras pode alterar prazo do fornecedor"
      };
    }
    for (const key of Object.keys(newSup)) {
      if (!COMPRAS_ITEM_KEYS.includes(key)) {
        return { ok: false, error: `Prazo de fornecedor inválido: ${key}` };
      }
    }
  }

  return { ok: true };
}
