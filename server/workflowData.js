/** Constantes espelhadas do frontend (App.jsx) */

export const PRODUCTION_LEAD = 8;

export const ACTIVITY_DEPENDENCIES = {
  fo: ["projeto"],
  programaLaser: ["projeto"],
  caixa: ["projeto"],
  solicitacaoCompras: ["listaMateriais"],
  foProducao: ["reuniaoAnalises"],
  opFo: ["foProducao"],
  piloto: ["fo"],
  matrizes: ["fo"],
  maquinas: ["fo"],
  reuniaoAnalises: ["fo"],
  tinta: ["solicitacaoCompras"],
  mpAco: ["solicitacaoCompras"],
  componentesKit: ["solicitacaoCompras"],
  componentesEletrica: ["solicitacaoCompras"],
  mpPsai: ["solicitacaoCompras"],
  caixaCompras: ["caixa"]
};

export const SECTOR_CHECKLISTS = {
  Design: {
    projeto: false,
    listaMateriais: false,
    graficaStampnow: false,
    manualMontagem: false
  },
  Processos: {
    fo: false,
    foProducao: false,
    caixa: false,
    programaLaser: false
  },
  Desenvolvimento: {
    piloto: false,
    matrizes: false,
    maquinas: false,
    reuniaoAnalises: false
  },
  PCP: {
    solicitacaoCompras: false,
    opFo: false
  },
  Compras: {
    caixaCompras: false,
    tinta: false,
    mpAco: false,
    componentesKit: false,
    componentesEletrica: false,
    mpPsai: false
  }
};

export const CHECKLIST_LABELS = {
  projeto: "Projeto",
  listaMateriais: "Lista de materiais",
  graficaStampnow: "Gráfica (Stampnow)",
  manualMontagem: "Manual de montagem",
  fo: "F.O. para Desenvolver",
  foProducao: "F.O. para produção",
  caixa: "Caixa",
  programaLaser: "Programa laser",
  piloto: "Piloto",
  matrizes: "Matrizes",
  maquinas: "Máquinas",
  reuniaoAnalises: "Reunião de análises",
  solicitacaoCompras: "Solicitação compras",
  opFo: "O.P./F.O.",
  caixaCompras: "Caixa",
  tinta: "Tinta",
  mpAco: "M.P. (Aço)",
  componentesKit: "Componentes Kit",
  componentesEletrica: "Componentes Elétrica",
  mpPsai: "M.P. (PSAI)"
};

export const PRODUCTION_GATE_KEYS = [
  "projeto",
  "listaMateriais",
  "fo",
  "programaLaser",
  "foProducao",
  "solicitacaoCompras",
  "opFo",
  "mpAco",
  "mpPsai"
];

export const ALL_ACTIVITY_KEYS = Object.keys(
  Object.fromEntries(
    Object.values(SECTOR_CHECKLISTS).flatMap((items) =>
      Object.keys(items).map((k) => [k, true])
    )
  )
);
