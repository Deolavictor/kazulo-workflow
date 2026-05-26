# Domínio próprio (ex.: workflow.kazulo.com.br)

O app já roda na Railway em `https://kazulo-workflow-production.up.railway.app/`. Para usar um domínio da Kazulo:

## 1. DNS no provedor do domínio

Crie um registro **CNAME** apontando o subdomínio desejado para o host que a Railway mostra em **Settings → Networking → Custom Domain** (algo como `xxxx.up.railway.app`).

| Tipo  | Nome              | Valor                    |
|-------|-------------------|--------------------------|
| CNAME | workflow (ou www) | host fornecido pela Railway |

Propagação: de alguns minutos até 48 h.

## 2. Railway

1. Projeto → **Settings** → **Networking** → **Custom Domain**
2. Adicione `workflow.kazulo.com.br` (ou o nome escolhido)
3. Aguarde o certificado TLS automático (HTTPS)

## 3. Variáveis de ambiente

Atualize no Railway:

```env
PUBLIC_SITE_URL=https://workflow.kazulo.com.br
CLIENT_ORIGIN=https://workflow.kazulo.com.br
```

Salve em **Configurações** do app (painel admin) o mesmo `PUBLIC_SITE_URL`, se já estiver usando `app_settings`.

## 4. Brevo / links em e-mail

O remetente e a API Brevo não mudam. Apenas os links nos e-mails passam a usar o domínio novo via `PUBLIC_SITE_URL`.

## 5. PWA

Após o domínio ativo, reinstale o atalho no celular/desktop a partir da nova URL para o `manifest` e o service worker ficarem no domínio correto.

## 6. Backup em volume

Se usar volume Railway em `/data`, mantenha:

```env
DB_PATH=/data/kazulo.db
BACKUP_DIR=/data/backups
```

Assim backups e banco persistem no mesmo volume.
