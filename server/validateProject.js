import { ACTIVITY_SECTOR, canUserEditProjectMeta } from "./workflowRules.js";

const META_KEYS = [
  "name",
  "client",
  "deliveryDate",
  "productionStartDate",
  "priority",
  "observations",
  "completed",
  "checklistDates"
];

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
    for (const key of META_KEYS) {
      if (JSON.stringify(oldProject[key]) !== JSON.stringify(newProject[key])) {
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

  const oldActs = oldProject.activities || {};
  const newActs = newProject.activities || {};

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

  return { ok: true };
}
