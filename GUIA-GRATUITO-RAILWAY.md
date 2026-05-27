# Publicar o KAZULO Workflow de graça (Railway + GitHub)

Guia para quem **não tem verba** agora. O conselho de usar **GitHub + Railway + SQLite** faz sentido para o seu tamanho de projeto.

---

## O que é realmente grátis no seu caso

| Item | Grátis? | Observação |
|------|---------|------------|
| Cursor (desenvolver) | Sim | Plano free |
| GitHub (código + backup) | Sim | Repositório privado grátis |
| React + Node + Express | Sim | Open source |
| SQLite (`kazulo.db`) | Sim | Arquivo no servidor |
| **Railway** | Créditos mensais | Plano Hobby: ~**US$ 5 de crédito/mês** (não é “ilimitado”, mas costuma bastar para poucos usuários) |
| Domínio `.com.br` | Não | R$ 40–70/ano — **opcional**; use o link `.up.railway.app` grátis |

### O que o ChatGPT acertou

- Dá para validar com a equipe **sem pagar domínio** no começo.
- Sistema interno pequeno costuma rodar **meses** nesse modelo.
- Railway pode **demorar alguns segundos** na primeira abertura do dia (hibernação / cold start).

### O que precisa de cuidado

1. **SQLite sem disco persistente** → ao redeploy, **perde projetos**. No Railway você **precisa criar um Volume** e apontar `DB_PATH` para ele.
2. **Render plano Free** → mesmo problema (dados somem); por isso antes sugerimos plano pago. No Railway o volume entra nos créditos — para MVP pequeno costuma caber no free.
3. **Não crie várias contas Cursor** para burlar limite — não é necessário para publicar o site.

---

## Visão geral (3 peças)

```
[GitHub]  guarda o código
    ↓
[Railway]  roda o site 24h (link público)
    ↓
[Volume]   guarda kazulo.db (não perde dados)
```

URL final algo como: `https://kazulo-workflow-production.up.railway.app`

---

# PASSO A PASSO — Railway (gratuito / baixo custo)

## 1. Subir o código no GitHub

Se ainda não fez:

```powershell
cd C:\Users\victor\Desktop\workflow-pdv\workflow-pdv
git init
git add .
git commit -m "Kazulo workflow"
```

1. https://github.com/new → repositório **privado** `kazulo-workflow`  
2. Sem README inicial  
3. Conecte e envie:

```powershell
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/kazulo-workflow.git
git push -u origin main
```

---

## 2. Conta no Railway

1. https://railway.com  
2. **Login with GitHub**  
3. Autorize o Railway  

> Pode pedir cartão no plano Hobby em alguns casos; muitas vezes só cobra se passar dos créditos. Leia a tela antes de confirmar.

---

## 3. Novo projeto a partir do GitHub

1. **New Project**  
2. **Deploy from GitHub repo**  
3. Escolha `kazulo-workflow`  
4. Railway detecta Node e usa `npm install` + start (ou o `railway.toml` do projeto)

---

## 4. Variáveis de ambiente

Clique no serviço → **Variables** → **RAW Editor** e cole (ajuste as senhas):

```env
NODE_ENV=production
JWT_SECRET=coloque-uma-frase-longa-aleatoria-aqui-minimo-32-caracteres
ADMIN_PASSWORD=SuaSenhaAdminForte123
DEFAULT_USER_PASSWORD=SuaSenhaSetoresForte123
DB_PATH=/data/kazulo.db
BACKUP_DIR=/data/backups
BACKUP_ON_STARTUP=true
BACKUP_ON_CHANGE=true
BACKUP_ON_SHUTDOWN=true
AUTO_RESTORE_FROM_BACKUP=true
```

| Variável | Para quê |
|----------|---------|
| `JWT_SECRET` | Segurança do login |
| `ADMIN_PASSWORD` | Senha do usuário `admin` (só na 1ª criação do banco) |
| `DEFAULT_USER_PASSWORD` | Senha de design, pcp, compras, etc. |
| `DB_PATH` | Caminho do SQLite **dentro do volume** |

---

## 5. Volume (OBRIGATÓRIO — não pule)

Sem volume, cada deploy apaga os projetos.

1. No projeto Railway: serviço → aba **Volumes**  
2. **Add Volume**  
3. **Mount path:** `/data`  
4. Confirme que `DB_PATH=/data/kazulo.db` (igual acima)  
5. **Redeploy** o serviço (Deployments → ⋮ → Redeploy)

---

## 6. Porta pública

Railway define `PORT` automaticamente. O `server/index.js` já usa `process.env.PORT` — não precisa mudar código.

1. **Settings** → **Networking** → **Generate Domain**  
2. Copie a URL `https://....up.railway.app`

---

## 7. Testar

1. Abra a URL no celular (fora do Wi‑Fi da fábrica, se possível)  
2. Login `admin` + senha do `ADMIN_PASSWORD`  
3. Crie um projeto de teste  
4. Faça redeploy de teste e veja se o projeto **continua lá** (confirma volume OK)

---

## 8. Enviar link para a equipe

| Usuário | Uso |
|---------|-----|
| `admin` | Tudo |
| `design` | Só checklist Design |
| `processos` | Só Processos |
| `desenvolvimento` | Só Desenvolvimento |
| `pcp` | Só PCP |
| `compras` | Só Compras |

Senha dos setores = `DEFAULT_USER_PASSWORD` (a que você definiu nas variáveis).

---

## 9. Importar dados do seu PC (se já tinha projetos locais)

1. No PC, abra o site local como admin (se ainda existir)  
2. Ou use o banner **Importar para o servidor** no site novo (admin, lista vazia)  
3. Dados antigos vinham do `localStorage` do navegador

---

## Atualizar o site depois

```powershell
git add .
git commit -m "minha alteracao"
git push
```

Railway faz deploy automático.

---

# Quanto “crédito” vai gastar?

Depende de:

- tempo ligado  
- RAM/CPU do serviço  
- tamanho do volume  

Para **5–15 usuários**, checklist, sem uploads pesados: muitas vezes fica **dentro dos US$ 5/mês** do Hobby.

Acompanhe: Railway → **Usage**.

Se um mês estourar, o serviço pode pausar até o próximo ciclo ou pedir upgrade — para MVP interno isso é raro.

---

# Alternativa 100% grátis (sem Railway)

**PC da empresa ligado o dia todo + Cloudflare Tunnel**

- Custo: R$ 0  
- No PC: `npm run build` → `npm run start`  
- Tunnel aponta para `localhost:3001`  
- Detalhes no **GUIA-PUBLICAR-SITE.md** → Caminho B  

Bom se já existe um computador que não desliga.

---

# Comparativo rápido

| Opção | Custo | Dados seguros? | Facilidade |
|-------|-------|----------------|------------|
| **Railway + Volume** | ~US$ 0–5/mês | Sim (com volume) | ⭐⭐⭐ |
| Render Free | R$ 0 | **Não** (SQLite some) | ⭐⭐ |
| Render Starter | ~US$ 7/mês | Sim | ⭐⭐⭐ |
| PC + Cloudflare Tunnel | R$ 0 | Sim (no PC) | ⭐⭐ |

**Recomendação sem verba:** Railway com volume **ou** PC + Tunnel.

---

# Checklist antes de divulgar

- [ ] Volume montado em `/data`  
- [ ] `DB_PATH=/data/kazulo.db`  
- [ ] Senhas fortes (não `admin123` / `kazulo123`)  
- [ ] Testou login em outro dispositivo  
- [ ] Testou redeploy sem perder projeto  

---

# Problemas comuns

**Build falha em `better-sqlite3`**  
→ Normal no Railway (Linux). Deixe o Railway rodar `npm install` no servidor; não suba `node_modules` no Git.

**502 / Application Error**  
→ Veja **Deploy Logs**. Confirme `npm run build` e `npm run start`.

**Login não aceita senha**  
→ Usuários são criados na **primeira** subida com as variáveis atuais. Se mudou senha depois, precisa resetar banco ou recriar volume.

**Site demora 10–30 s para abrir**  
→ Cold start do plano gratuito/créditos. Aceitável para uso interno; depois pode otimizar.

---

# Resumo em uma frase

**GitHub guarda o código, Railway roda o site de graça (com créditos mensais), Volume guarda o `kazulo.db` — use o link `.up.railway.app` e só pague domínio quando fizer sentido.**
