/** Mapa atividade → setor (espelha o frontend) */
export const ACTIVITY_SECTOR = {
  projeto: "Design",
  listaMateriais: "Design",
  graficaStampnow: "Design",
  manualMontagem: "Design",
  fo: "Processos",
  foProducao: "Processos",
  caixa: "Processos",
  programaLaser: "Processos",
  piloto: "Desenvolvimento",
  matrizes: "Desenvolvimento",
  maquinas: "Desenvolvimento",
  reuniaoAnalises: "Desenvolvimento",
  solicitacaoCompras: "PCP",
  opFo: "PCP",
  kitDeItens: "PCP",
  caixaCompras: "Compras",
  tinta: "Compras",
  mpAco: "Compras",
  componentesKit: "Compras",
  componentesEletrica: "Compras",
  mpPsai: "Compras"
};

export const KANBAN_STAGES = [
  "Design",
  "Processos",
  "Desenvolvimento",
  "PCP",
  "Compras"
];

export function canUserEditActivity(user, itemKey) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return ACTIVITY_SECTOR[itemKey] === user.sector;
}

export function canUserEditProjectMeta(user) {
  return user?.role === "admin";
}
