# Implantação KAZULO Workflow na empresa

> **Só um link, acessar de qualquer lugar (celular/casa):**  
> **[GUIA-SITE-LINK-PUBLICO.md](./GUIA-SITE-LINK-PUBLICO.md)** ← use este  
>  
> Outros: [Servidor na Kazulo](./GUIA-SERVIDOR-KAZULO.md) · [Railway detalhado](./GUIA-GRATUITO-RAILWAY.md)

## Visão geral

- **Frontend**: React (Vite)
- **Backend**: Node + Express + SQLite
- **Login**: cada setor com usuário próprio; **admin** com acesso total
- **Regra**: todos **veem** tudo; cada setor **só edita** checklist do seu setor

## Usuários padrão (primeira execução)

| Usuário | Setor / papel | Senha padrão |
|---------|----------------|--------------|
| `admin` | Administrador | `ADMIN_PASSWORD` (padrão: `admin123`) |
| `design` | Design | `DEFAULT_USER_PASSWORD` (padrão: `kazulo123`) |
| `processos` | Processos | idem |
| `desenvolvimento` | Desenvolvimento | idem |
| `pcp` | PCP | idem |
| `compras` | Compras | idem |

Altere as senhas no `.env` **antes** da primeira subida em produção.

## Desenvolvimento no seu PC

```bash
npm install
npm run dev:all
```

- Site: http://localhost:5173  
- API: http://localhost:3001  

## Migrar dados do localStorage

1. Entre como **admin**
2. Se aparecer o banner, clique em **Importar para o servidor**
3. Ou exporte manualmente: no console do navegador, copie `localStorage.getItem('kazulo-workflow')` e use o endpoint `POST /api/admin/import`

## Produção (um servidor na empresa ou VPS)

1. Copie o projeto para o servidor
2. Crie `.env` a partir de `.env.example` e defina `JWT_SECRET` forte
3. Build e start:

```bash
npm install
npm run build
npm run start
```

4. Acesse `http://IP-DO-SERVIDOR:3001` (app + API no mesmo processo)

### HTTPS e domínio (recomendado)

Use **Nginx** ou **Caddy** na frente:

- `workflow.suaempresa.com` → proxy para `localhost:3001`
- Certificado Let's Encrypt

## Hospedagem em nuvem (alternativa)

- **Railway / Render / Fly.io**: deploy do repositório, variáveis de `.env`, comando `npm run build && npm run start`
- Monte volume persistente em `server/data` para não perder o SQLite

## Permissões

| Ação | Admin | Setor |
|------|-------|-------|
| Ver kanban, dashboard, detalhes | Sim | Sim |
| Marcar checklist do próprio setor | Sim | Sim |
| Marcar checklist de outro setor | Sim | Não |
| Criar / excluir projeto | Sim | Não |
| Alterar data de entrega / observações | Sim | Não |

## E-mail diário (atividades em atraso)

No fim do dia útil o servidor pode enviar um e-mail com **todas as tarefas em atraso**, separadas por setor (mesma regra da aba Relatórios).

### Variáveis no Railway / `.env`

**No plano Hobby do Railway, SMTP (Outlook/Gmail porta 587) não funciona.** Use **Brevo** (grátis, API HTTPS).

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `DAILY_REPORT_ENABLED` | `true` | `false` desliga o agendamento |
| `DAILY_REPORT_TO` | `Nome <email@...>, ...` | Destinatários (vírgula) |
| `DAILY_REPORT_CRON` | `0 17 * * 1-5` | 17h seg–sex |
| `DAILY_REPORT_TZ` | `America/Sao_Paulo` | Fuso |
| `BREVO_API_KEY` | chave da Brevo | **Obrigatório no Railway** |
| `EMAIL_SENDER_EMAIL` | `kazuloworkflow@outlook.com` | Remetente (validar na Brevo) |
| `EMAIL_SENDER_NAME` | `KAZULO Workflow` | Nome do remetente |

1. Crie conta em [brevo.com](https://www.brevo.com)  
2. **Remetentes** → adicione e confirme o e-mail remetente  
3. **SMTP & API** → copie a **Chave API v3** → `BREVO_API_KEY`

### Testar antes do horário

Com login **admin**, envie manualmente:

```http
POST /api/admin/daily-report/send
Authorization: Bearer <token>
```

Status da configuração: `GET /api/admin/daily-report/status`

### E-mail de apresentação (diretoria)

| Variável | Exemplo |
|----------|---------|
| `PUBLIC_SITE_URL` | `https://kazulo-workflow-production.up.railway.app` |
| `WELCOME_LOGIN_USER` | `admin` |
| `WELCOME_LOGIN_PASSWORD` | senha exibida no e-mail (ex.: para diretores) |

No site, admin → **Relatórios** → **Prévia e-mail apresentação** / **Enviar apresentação**.

Para o login `admin` funcionar com essa senha, defina também `ADMIN_PASSWORD` igual **antes da primeira criação do banco**, ou altere a senha do admin no banco depois.

## Próximos passos (opcional)

- Trocar senhas por usuário na interface
- Backup automático de `server/data/kazulo.db`
- PostgreSQL se crescer muito o volume
