# Um link para acessar de qualquer lugar (celular, casa, fábrica)

Este é o caminho certo se você quer **só mandar o link** e qualquer pessoa abrir no navegador — sem VPN, sem IP `192.168...`.

Exemplo do que você terá:

`https://kazulo-workflow.up.railway.app`

---

## O que você precisa saber em 30 segundos

| Pergunta | Resposta |
|----------|----------|
| Funciona no celular? | **Sim** |
| Precisa instalar app? | **Não**, só o navegador |
| Os dados ficam onde? | No servidor na nuvem (arquivo `kazulo.db` em disco persistente) |
| É grátis no começo? | **Sim**, com Railway (créditos mensais; costuma bastar para equipe pequena) |
| Precisa de GitHub? | **Recomendado** (mais fácil). Sem GitHub dá com upload manual — veja final do guia |

---

## Passo 1 — Conta no GitHub (15 min)

1. https://github.com/signup  
2. Crie o repositório **privado**: https://github.com/new → nome `kazulo-workflow`  
3. No PowerShell, na pasta do projeto:

```powershell
cd C:\Users\victor\Desktop\workflow-pdv\workflow-pdv
git init
git add .
git commit -m "Versao publica Kazulo"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/kazulo-workflow.git
git push -u origin main
```

*(Troque `SEU_USUARIO`. Na primeira vez o GitHub pede login no navegador.)*

---

## Passo 2 — Conta no Railway (5 min)

1. https://railway.com  
2. **Login with GitHub**  
3. Autorize o Railway  

---

## Passo 3 — Criar o site (10 min)

1. **New Project** → **Deploy from GitHub repo**  
2. Escolha `kazulo-workflow`  
3. Aguarde o primeiro deploy (pode falhar até você configurar variáveis — normal)

---

## Passo 4 — Variáveis de ambiente (obrigatório)

No serviço → **Variables** → cole e **ajuste as senhas**:

```env
NODE_ENV=production
JWT_SECRET=frase-secreta-longa-minimo-32-caracteres-aleatorios
ADMIN_PASSWORD=SuaSenhaAdmin2026!
DEFAULT_USER_PASSWORD=SuaSenhaSetores2026!
DB_PATH=/data/kazulo.db
```

| Variável | Uso |
|----------|-----|
| `ADMIN_PASSWORD` | Login **admin** |
| `DEFAULT_USER_PASSWORD` | Login design, pcp, compras, etc. |
| `JWT_SECRET` | Segurança (não compartilhe) |

---

## Passo 5 — Disco persistente (NÃO PULE)

Sem isso, os projetos **somem** quando o Railway reinicia.

1. Aba **Volumes** → **Add Volume**  
2. **Mount Path:** `/data`  
3. Confirme `DB_PATH=/data/kazulo.db`  
4. **Redeploy** (menu Deployments → Redeploy)

---

## Passo 6 — Gerar o link público

1. **Settings** → **Networking** → **Generate Domain**  
2. Railway cria algo como: `https://kazulo-workflow-production.up.railway.app`  
3. Abra no **celular com 4G** (não no Wi‑Fi da fábrica) para testar  
4. Login: `admin` + senha do `ADMIN_PASSWORD`  

**Esse link é o que você envia para donos, setores e equipe.**

---

## Passo 7 — Quem usa qual login

| Usuário | Senha (padrão que você definiu) | Pode editar |
|---------|----------------------------------|-------------|
| `admin` | `ADMIN_PASSWORD` | Tudo |
| `design` | `DEFAULT_USER_PASSWORD` | Só Design |
| `processos` | idem | Só Processos |
| `desenvolvimento` | idem | Só Desenvolvimento |
| `pcp` | idem | Só PCP |
| `compras` | idem | Só Compras |

---

## Passo 8 — Importar projetos do seu PC (se já tinha dados)

1. Entre como **admin** no link novo  
2. Se tinha dados só no navegador do seu PC: botão **Importar para o servidor**  
3. Ou acesse uma última vez o `localhost` e importe  

---

## Atualizar o site depois

Alterou o código no PC:

```powershell
git add .
git commit -m "descricao"
git push
```

O Railway atualiza sozinho em alguns minutos. O link **não muda**.

---

## Custos e limites (honesto)

- Plano **Hobby** Railway: créditos grátis por mês (~US$ 5)  
- Uso leve (poucos usuários, checklist): muitas vezes **R$ 0** no começo  
- Primeira abertura do dia pode demorar **5–20 segundos** (servidor “acordando”)  
- Acompanhe uso em **Railway → Usage**  

Domínio bonito (`workflow.kazulo.com.br`) é **opcional** e pago depois; o link `.up.railway.app` já resolve.

---

## Problemas comuns

**“Application failed to respond”**  
→ Veja **Deploy Logs**. Build: `npm install && npm run build`. Start: `npm run start`.

**Projetos sumiram**  
→ Faltou **Volume** em `/data` + `DB_PATH=/data/kazulo.db`.

**Login não entra**  
→ Usuários são criados na **primeira** subida com as senhas das variáveis.

---

## Sem GitHub? (alternativa)

No Railway: **New Project** → **Empty Project** → instale **Railway CLI** e faça deploy da pasta. É mais chato; **GitHub é o caminho mais simples** para manter o link atualizado.

---

## Resumo

1. GitHub = código  
2. Railway = site no ar + link HTTPS  
3. Volume `/data` = dados guardados por meses  
4. Mande o link para todos  

**Objetivo alcançado:** qualquer dispositivo, qualquer lugar, só o link.
