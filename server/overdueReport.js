import { KANBAN_STAGES } from "./workflowRules.js";
import { buildSectorOverdueList, formatDateBr } from "./workflowCalculations.js";

export function buildDailyOverdueReport(projects) {
  const now = new Date();
  const dateLabel = formatDateBr(now.toISOString().split("T")[0]);

  const sectors = KANBAN_STAGES.map((stage) => ({
    stage,
    overdue: buildSectorOverdueList(projects, stage)
  }));

  const totalOverdue = sectors.reduce((sum, s) => sum + s.overdue.length, 0);

  return {
    generatedAt: now.toISOString(),
    dateLabel,
    sectors,
    totalOverdue,
    activeProjects: projects.filter((p) => !p.completed).length
  };
}
