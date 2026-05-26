import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Cores oficiais Kazulo (espelham --blue do site) */
export const KAZULO = {
  navy: "#123d7a",
  navyDark: "#0c2d5c",
  navyDeep: "#071f3f",
  soft: "#e8f0fb",
  softBorder: "#c5d9f2",
  accent: "#2f6fc4",
  accentLight: "#4a8fe7",
  white: "#ffffff",
  text: "#0f172a",
  muted: "#5c6b82",
  gold: "#f59e0b",
  goldBg: "#fffbeb"
};

let logoDataUriCache = null;

function getLogoDataUri() {
  if (logoDataUriCache) return logoDataUriCache;
  try {
    const svgPath = path.join(__dirname, "..", "public", "kazulo-logo-email.svg");
    const svg = readFileSync(svgPath, "utf8");
    logoDataUriCache = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    logoDataUriCache = "";
  }
  return logoDataUriCache;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FEATURES = [
  { icon: "📊", title: "Fluxo Kanban", desc: "Projetos por setor, prioridade por prazo e urgência" },
  { icon: "✓", title: "Checklist inteligente", desc: "Dependências, liberação e andamento por atividade" },
  { icon: "▣", title: "Dashboard", desc: "Indicadores e comparativo entre todos os setores" },
  { icon: "📅", title: "Calendário", desc: "Visão semanal com atrasos em destaque" },
  { icon: "⚠", title: "Previsões", desc: "Alertas de risco para o início de produção" },
  { icon: "📄", title: "Relatórios PDF", desc: "KPIs e listas para reuniões e decisões" }
];

const SECTORS = ["Design", "Processos", "Desenvolvimento", "PCP", "Compras"];

function featureCard(feature) {
  return `
    <td width="50%" style="padding:8px;vertical-align:top">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="background:${KAZULO.white};border:1px solid ${KAZULO.softBorder};border-radius:12px">
        <tr>
          <td style="padding:16px 18px">
            <div style="width:40px;height:40px;line-height:40px;text-align:center;
              background:linear-gradient(135deg,${KAZULO.navy} 0%,${KAZULO.accent} 100%);
              border-radius:10px;font-size:18px;color:#fff;margin-bottom:12px">${feature.icon}</div>
            <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${KAZULO.navy}">${feature.title}</p>
            <p style="margin:0;font-size:13px;line-height:1.45;color:${KAZULO.muted}">${feature.desc}</p>
          </td>
        </tr>
      </table>
    </td>`;
}

function featureRowsHtml() {
  const rows = [];
  for (let i = 0; i < FEATURES.length; i += 2) {
    const left = featureCard(FEATURES[i]);
    const right = FEATURES[i + 1] ? featureCard(FEATURES[i + 1]) : "<td width=\"50%\"></td>";
    rows.push(`<tr>${left}${right}</tr>`);
  }
  return rows.join("");
}

function sectorPillsHtml() {
  return SECTORS.map(
    (s) =>
      `<span style="display:inline-block;margin:4px 6px 4px 0;padding:6px 14px;
        background:${KAZULO.white};color:${KAZULO.navy};font-size:12px;font-weight:600;
        border-radius:99px;border:1px solid ${KAZULO.softBorder}">${s}</span>`
  ).join("");
}

export function buildWelcomeEmailHtml({ siteUrl, loginUser, loginPassword }) {
  const logoSrc = getLogoDataUri() || `${siteUrl}/kazulo-logo-email.svg`;
  const loginRows = loginPassword
    ? `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${KAZULO.softBorder}">
            <span style="font-size:11px;font-weight:700;color:${KAZULO.muted};text-transform:uppercase;letter-spacing:0.08em">Link</span><br>
            <a href="${escapeHtml(siteUrl)}" style="font-size:14px;color:${KAZULO.accent};text-decoration:none;font-weight:600">${escapeHtml(siteUrl)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${KAZULO.softBorder}">
            <span style="font-size:11px;font-weight:700;color:${KAZULO.muted};text-transform:uppercase;letter-spacing:0.08em">Usuário</span><br>
            <span style="font-size:16px;font-weight:700;color:${KAZULO.navy};font-family:Consolas,Monaco,monospace">${escapeHtml(loginUser)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0">
            <span style="font-size:11px;font-weight:700;color:${KAZULO.muted};text-transform:uppercase;letter-spacing:0.08em">Senha</span><br>
            <span style="font-size:16px;font-weight:700;color:${KAZULO.navy};font-family:Consolas,Monaco,monospace">${escapeHtml(loginPassword)}</span>
          </td>
        </tr>`
    : `<tr><td style="padding:12px 0;font-size:14px;color:${KAZULO.muted}">Credenciais com a equipe de Processos.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KAZULO Workflow Industrial</title>
</head>
<body style="margin:0;padding:0;background:#dce8f8;font-family:'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#dce8f8;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:600px;width:100%;background:${KAZULO.white};border-radius:16px;overflow:hidden;
          box-shadow:0 12px 40px rgba(7,31,63,0.18)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(145deg,${KAZULO.navyDeep} 0%,${KAZULO.navy} 45%,${KAZULO.accent} 100%);
              padding:36px 32px 32px;text-align:center">
              <img src="${logoSrc}" alt="KAZULO Workflow Industrial" width="220" height="56"
                style="display:block;margin:0 auto 20px;border:0;max-width:220px;height:auto" />
              <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);
                letter-spacing:0.12em;text-transform:uppercase">Nova era na gestão de projetos</p>
              <h1 style="margin:14px 0 0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.25">
                Controle total da produção<br>em um só lugar
              </h1>
            </td>
          </tr>

          <!-- Saudação -->
          <tr>
            <td style="padding:32px 32px 8px">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${KAZULO.text}">
                Prezados <strong style="color:${KAZULO.navy}">Rodolfo</strong>,
                <strong style="color:${KAZULO.navy}">Walter</strong> e
                <strong style="color:${KAZULO.navy}">Cristian</strong>,
              </p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:${KAZULO.muted}">
                Apresentamos o <strong style="color:${KAZULO.navy}">KAZULO Workflow Industrial</strong> —
                a plataforma que unifica o fluxo de trabalho da fábrica, com prazos, dependências e visão
                em tempo real do que está em dia ou em atraso.
              </p>
            </td>
          </tr>

          <!-- Setores -->
          <tr>
            <td style="padding:8px 32px 24px">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:${KAZULO.soft};border-radius:12px;border:1px solid ${KAZULO.softBorder}">
                <tr>
                  <td style="padding:18px 20px;text-align:center">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${KAZULO.navy};
                      letter-spacing:0.1em;text-transform:uppercase">Cinco setores integrados</p>
                    ${sectorPillsHtml()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td style="padding:0 24px 8px">
              <p style="margin:0 0 12px;font-size:18px;font-weight:800;color:${KAZULO.navy};text-align:center">
                O que o sistema entrega
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${featureRowsHtml()}
              </table>
            </td>
          </tr>

          <!-- Alerta relatório -->
          <tr>
            <td style="padding:16px 32px">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:linear-gradient(90deg,${KAZULO.goldBg} 0%,#fff 100%);
                border-left:4px solid ${KAZULO.gold};border-radius:12px">
                <tr>
                  <td style="padding:18px 20px">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:${KAZULO.navy}">
                      📬 Relatório automático no fim do dia
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:${KAZULO.muted}">
                      De <strong>segunda a sexta, às 17h</strong> (Brasília), vocês recebem por e-mail o resumo das
                      <strong>atividades em atraso</strong>, organizadas por setor — pronto para a reunião de fechamento.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Login -->
          <tr>
            <td style="padding:8px 32px 24px">
              <p style="margin:0 0 14px;font-size:18px;font-weight:800;color:${KAZULO.navy};text-align:center">
                Acesso para a diretoria
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:${KAZULO.soft};border-radius:12px;border:1px solid ${KAZULO.softBorder}">
                <tr>
                  <td style="padding:20px 22px">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${loginRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:8px 32px 36px;text-align:center">
              <a href="${escapeHtml(siteUrl)}"
                style="display:inline-block;background:linear-gradient(135deg,${KAZULO.navy} 0%,${KAZULO.accentLight} 100%);
                color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:10px;
                font-size:16px;font-weight:700;letter-spacing:0.02em;
                box-shadow:0 6px 20px rgba(18,61,122,0.35)">
                Acessar o KAZULO Workflow →
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:${KAZULO.muted}">
                Funciona no computador e no celular — basta o navegador.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${KAZULO.navyDeep};padding:24px 32px;text-align:center">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#ffffff">
                Equipe KAZULO — Workflow Industrial
              </p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.55)">
                Contamos com vocês para manter os prazos atualizados e fortalecer a comunicação entre setores.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#7a8da8;text-align:center">
          E-mail de apresentação · Kazulo Workflow
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
