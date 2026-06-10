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

function getActivities(project) {
  const activities = { ...(project.activities || {}) };
  Object.entries(project.checklist || {}).forEach(([key, value]) => {
    if (key in ACTIVITY_SECTOR && !(key in activities)) {
      activities[key] = value === true;
    }
  });
  return activities;
}

/** Detecta alteração real em metadados (ignora campos derivados/normalização do cliente) */
function adminMetaFieldChanged(key, oldProject, newProject) {
  const oldVal = oldProject[key];
  const newVal = newProject[key];

  if (key === "productionStartDate") {
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
    if (before !== after && ACTIVITY_SECTOR[key] !== user.sector) {
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
