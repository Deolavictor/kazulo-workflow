# KAZULO Workflow Industrial

Sistema de acompanhamento de projetos (Kanban por setor, dashboard, calendário, previsões, relatórios PDF, e-mail diário de atrasos).

## Desenvolvimento local

```bash
npm install
npm run dev:all
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001  

Copie `.env.example` para `.env` e ajuste senhas/chaves.

## Produção (Railway)

```bash
npm run build
npm start
```

Variáveis importantes: `JWT_SECRET`, `BREVO_API_KEY`, `DAILY_REPORT_TO`, `DB_PATH` (volume `/data` **obrigatório** no Railway — ver `docs/RAILWAY-PERSISTENCIA-DADOS.md`).

## Etapas do produto

| Etapa | Conteúdo |
|-------|----------|
| 1 | Usuários, configurações (painel), histórico geral |
| 2 | Notificações, logo, backup automático, PWA, guia de domínio |

### Notificações

Alertas por atraso de atividade, bloqueio de produção e entrega em até 3 dias — filtrados por setor (ou todos para admin). Marcar como lidas no sino.

### Backup

Cópias em `server/data/backups` (ou `BACKUP_DIR`). Agendamento padrão: 03:00 diário. Admin: **Configurações → Backup**.

### PWA

Após deploy, abra o site no Chrome/Edge → instalar aplicativo. Service worker em `/sw.js` (cache da interface; API sempre online).

### Domínio próprio

Passo a passo: [docs/DOMINIO.md](docs/DOMINIO.md)
