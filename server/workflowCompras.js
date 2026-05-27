import { SECTOR_CHECKLISTS, CHECKLIST_LABELS } from "./workflowData.js";
import { PRODUCTION_LEAD } from "./workflowData.js";
import { subtractDays } from "./workflowCalculations.js";

export const COMPRAS_ITEM_KEYS = Object.keys(SECTOR_CHECKLISTS.Compras || {});

export function getProductionStartDate(project) {
  return (
    project.productionStartDate ||
    subtractDays(project.deliveryDate, PRODUCTION_LEAD)
  );
}

/** Fornecedor entrega depois do início de produção → impacta produção */
export function isSupplierDeadlineBlockingProduction(project, itemKey) {
  if (!COMPRAS_ITEM_KEYS.includes(itemKey)) return false;
  const activities = project.activities || {};
  if (activities[itemKey] === true) return false;

  const supplier = project.supplierDeadlines?.[itemKey];
  if (!supplier) return false;

  const sup = new Date(supplier);
  const prod = new Date(getProductionStartDate(project));
  sup.setHours(0, 0, 0, 0);
  prod.setHours(0, 0, 0, 0);
  return sup > prod;
}

export function getSupplierProductionGapDays(project, itemKey) {
  if (!isSupplierDeadlineBlockingProduction(project, itemKey)) return 0;
  const supplier = project.supplierDeadlines[itemKey];
  const sup = new Date(supplier);
  const prod = new Date(getProductionStartDate(project));
  sup.setHours(0, 0, 0, 0);
  prod.setHours(0, 0, 0, 0);
  return Math.ceil((sup - prod) / (1000 * 60 * 60 * 24));
}

export function buildComprasSupplierBlockers(project) {
  return COMPRAS_ITEM_KEYS.map((key) => {
    if (!isSupplierDeadlineBlockingProduction(project, key)) return null;
    const gap = getSupplierProductionGapDays(project, key);
    return {
      key,
      label: CHECKLIST_LABELS[key],
      sector: "Compras",
      dueDate: project.supplierDeadlines[key],
      supplierDeadline: true,
      daysLate: gap,
      productionStart: getProductionStartDate(project)
    };
  }).filter(Boolean);
}

export function projectHasComprasSupplierProductionRisk(project) {
  return COMPRAS_ITEM_KEYS.some((key) =>
    isSupplierDeadlineBlockingProduction(project, key)
  );
}
