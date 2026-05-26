import html2pdf from "html2pdf.js";

export async function exportElementToPdf(element, filename) {
  if (!element) {
    throw new Error("Nada para exportar");
  }

  const options = {
    margin: [8, 10, 8, 10],
    filename: filename || `kazulo-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`,
    image: { type: "jpeg", quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: [".kpi-panel", ".sector-activity-report"] }
  };

  await html2pdf().set(options).from(element).save();
}

export function buildReportFilename(scope, sector) {
  const date = new Date().toISOString().slice(0, 10);
  if (scope === "full") return `kazulo-relatorio-completo-${date}.pdf`;
  if (sector && sector !== "Todos") {
    return `kazulo-relatorio-${sector.toLowerCase().replace(/\s+/g, "-")}-${date}.pdf`;
  }
  return `kazulo-relatorio-geral-${date}.pdf`;
}
