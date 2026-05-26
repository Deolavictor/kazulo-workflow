import cron from "node-cron";
import { sendDailyOverdueEmail, getDailyEmailConfigStatus } from "./dailyEmail.js";

let scheduledTask = null;

export function startDailyReportScheduler() {
  const status = getDailyEmailConfigStatus();

  if (!status.enabled) {
    console.log("[email] Relatório diário desativado (DAILY_REPORT_ENABLED=false).");
    return;
  }

  if (!status.ready) {
    console.log(
      "[email] Relatório diário não agendado — configure DAILY_REPORT_TO e SMTP_* no servidor."
    );
    return;
  }

  const expression = status.cron;
  if (!cron.validate(expression)) {
    console.error(`[email] CRON inválido: ${expression}`);
    return;
  }

  scheduledTask = cron.schedule(
    expression,
    async () => {
      try {
        const result = await sendDailyOverdueEmail();
        console.log(
          `[email] Relatório enviado para ${result.recipients.join(", ")} — ${result.totalOverdue} atrasos`
        );
      } catch (err) {
        console.error("[email] Falha ao enviar relatório diário:", err.message);
      }
    },
    { timezone: status.timezone }
  );

  console.log(
    `[email] Relatório diário agendado: "${expression}" (${status.timezone}) → ${status.recipients.join(", ")}`
  );
}

export function stopDailyReportScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
