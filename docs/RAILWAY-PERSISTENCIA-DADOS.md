# Por que os dados somem no Railway (e como corrigir)

## O que acontece

No Railway, cada **deploy** ou **crash** recria o container da aplicação. Tudo que fica **dentro** do container (pasta `/app`, etc.) é **apagado**.

Os projetos, usuários e chat ficam no arquivo **`kazulo.db`** (SQLite). Se esse arquivo não estiver em um **Volume** persistente, o sistema abre um banco **novo e vazio** — parece que “apagou tudo”.

Alterar o código no GitHub **não apaga** dados por si só. O que apaga é o banco estar no disco **temporário** do container.

## Solução (faça uma vez no Railway)

### 1. Volume

1. Abra o projeto no [Railway](https://railway.app)
2. Clique no **serviço** do workflow (não no projeto inteiro)
3. Aba **Volumes** → **Add Volume**
4. **Mount Path:** `/data`
5. Salve

### 2. Variáveis de ambiente

No serviço → **Variables**:

```env
DB_PATH=/data/kazulo.db
BACKUP_DIR=/data/backups
BACKUP_ENABLED=true
BACKUP_ON_STARTUP=true
BACKUP_ON_CHANGE=true
BACKUP_ON_SHUTDOWN=true
AUTO_RESTORE_FROM_BACKUP=true
```

Com isso o sistema:
- **Salva cópia** ao alterar projetos, ao subir, ao desligar (deploy) e todo dia às 03h
- **Restaura sozinho** se o banco abrir vazio mas existir backup com projetos no volume

Confirme também `NODE_ENV=production` e `JWT_SECRET` (não mude `JWT_SECRET` depois de já estar em uso, senão todos precisam logar de novo).

### 3. Redeploy

**Deployments** → ⋮ no deploy mais recente → **Redeploy**

### 4. Conferir no site

1. Login como **admin**
2. **Configurações** → seção **Persistência dos dados**
3. Deve aparecer **“Dados protegidos”** e caminho `/data/kazulo.db`

Crie um projeto de teste, faça outro redeploy e veja se o projeto **continua lá**.

## Backup (recomendado)

Com o volume em `/data`, os backups automáticos podem ir para `/data/backups`.

Em **Configurações → Backup**, use **Executar backup agora** e **Baixar** o `.db` para o seu PC de vez em quando.

## Deploy crashed

Se o deploy **falhou** (Crashed):

- Com **volume correto**: os dados **devem** continuar no volume; só corrija o erro de build/start nos logs e redeploy.
- **Sem volume**: cada tentativa pode gerar banco vazio de novo — configure o volume **antes** de recadastrar tudo.

## Recuperar dados antigos

| Origem | Como |
|--------|------|
| Backup baixado em Configurações | Substitua o arquivo no volume (suporte técnico) ou peça restauração |
| Navegador (localStorage) | Admin → importar, se ainda existir export local |
| PC local `server/data/kazulo.db` | Copie para o volume como `/data/kazulo.db` com o serviço parado |

## Resumo

| Configuração | Resultado |
|--------------|-----------|
| Sem Volume + sem `DB_PATH=/data/...` | **Perde dados** a cada deploy/crash |
| Volume `/data` + `DB_PATH=/data/kazulo.db` | **Mantém dados** entre deploys |

Guia completo de publicação: `GUIA-GRATUITO-RAILWAY.md`
