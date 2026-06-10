import { PRODUCTION_LEAD } from "./workflowData.js";
import {
  normalizeDeliveryDate,
  subtractBusinessDays
} from "../shared/businessDays.js";

export function applyBusinessDayDates(project) {
  if (!project) return project;

  const next = { ...project };

  if (next.deliveryDate) {
    next.deliveryDate = normalizeDeliveryDate(next.deliveryDate);
    next.productionStartDate = subtractBusinessDays(
      next.deliveryDate,
      PRODUCTION_LEAD
    );
  }

  if (next.supplierDeadlines && typeof next.supplierDeadlines === "object") {
    const supplierDeadlines = { ...next.supplierDeadlines };
    for (const [key, value] of Object.entries(supplierDeadlines)) {
      if (value) {
        supplierDeadlines[key] = normalizeDeliveryDate(value);
      }
    }
    next.supplierDeadlines = supplierDeadlines;
  }

  return next;
}
