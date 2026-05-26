# Guia passo a passo: colocar o KAZULO Workflow na internet

Este guia explica como sair do **localhost** (só no seu PC) e ter um **link normal** que qualquer pessoa da empresa abre no navegador, de casa ou do trabalho.

---

## O que você vai ter no final

- Um endereço tipo: `https://kazulo-workflow.onrender.com` (ou domínio próprio depois)
- Tela de **login** para cada setor
- Os **mesmos dados** para todos (salvos no servidor, não no PC de cada um)
- **HTTPS** (cadeado no navegador)

---

## Como o sistema funciona (resumo)

| Onde roda | O que é |
|-----------|---------|
| **Seu PC hoje** | `npm run dev:all` → só você acessa `localhost` |
| **Na internet** | Um **servidor na nuvem** fica ligado 24h com o site + banco de dados |

O projeto já está preparado: um único comando (`npm run start`) sobe o site e a API juntos.

---

## Escolha o caminho

| Caminho | Para quem | Custo aproximado | Dificuldade |
|---------|-----------|------------------|-------------|
| **A – Railway** | **Sem verba** — MVP e equipe pequena | ~US$ 0–5/mês (créditos Hobby) | ⭐⭐ Médio |
| **B – Render.com** | Quem aceita ~US$ 7/mês com disco garantido | ~US$ 7/mês (Starter) | ⭐⭐ Médio |
| **C – PC da empresa + Cloudflare Tunnel** | PC ligado o dia todo na fábrica | R$ 0 | ⭐⭐⭐ Mais passos |

**Sem verba agora?** Use **[GUIA-GRATUITO-RAILWAY.md](./GUIA-GRATUITO-RAILWAY.md)** (passo a passo Railway + volume).

**Recomendação com orçamento zero:** Railway com volume **ou** Caminho C (Tunnel).

---

# CAMINHO A — Render.com (recomendado)

## Parte 1 — Preparar o código no GitHub

O Render puxa o código do **GitHub**. Você precisa subir a pasta do projeto lá uma vez.

### Passo A1 — Criar conta no GitHub

1. Abra: https://github.com/signup  
2. Crie usuário e senha (anote).  
3. Confirme o e-mail se pedirem.

### Passo A2 — Instalar o Git no Windows (se ainda não tiver)

1. Baixe: https://git-scm.com/download/win  
2. Instale com **Next** em tudo (padrão).  
3. Abra o **PowerShell** ou **Terminal** no Cursor.

### Passo A3 — Enviar o projeto para o GitHub

No terminal, dentro da pasta do projeto:

```powershell
cd C:\Users\victor\Desktop\workflow-pdv\workflow-pdv

git init
git add .
git commit -m "Kazulo workflow - versao para publicar"

```

Crie um repositório **vazio** no GitHub:

1. https://github.com/new  
2. Nome: `kazulo-workflow` (ou outro)  
3. **Não** marque “Add README”  
4. Clique **Create repository**

O GitHub mostra comandos. Use estes (troque `SEU_USUARIO`):

```powershell
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/kazulo-workflow.git
git push -u origin main
```

- Vai pedir login do GitHub (navegador ou token).  
- Se der erro de `git` não encontrado, feche e abra o terminal de novo após instalar o Git.

**Importante:** o arquivo `.env` **não** vai pro GitHub (está no `.gitignore`). Isso é correto — senhas ficam só no Render.

---

## Parte 2 — Conta e serviço no Render

### Passo A4 — Criar conta Render

1. https://render.com  
2. **Get Started** → entrar com **GitHub**  
3. Autorize o Render a ver seus repositórios.

### Passo A5 — Criar o “Web Service”

1. No painel Render: **New +** → **Web Service**  
2. Conecte o repositório `kazulo-workflow`  
3. Preencha:

| Campo | Valor |
|-------|--------|
| **Name** | `kazulo-workflow` |
| **Region** | Oregon ou São Paulo (se existir) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Instance type** | **Starter** (necessário para disco persistente) |

> O plano **Free** do Render **não guarda** o banco SQLite entre reinícios. Use **Starter** (~US$ 7/mês) para os projetos não sumirem.

### Passo A6 — Disco persistente (obrigatório para não perder dados)

1. Na mesma tela (ou em **Settings** depois): **Disks** → **Add Disk**  
2. **Mount Path:** `/var/data`  
3. **Size:** 1 GB  
4. Salve.

### Passo A7 — Variáveis de ambiente

Em **Environment** → **Add Environment Variable**:

| Chave | Valor (exemplo) | O que é |
|-------|------------------|---------|
| `NODE_ENV` | `production` | Modo produção |
| `JWT_SECRET` | uma frase longa aleatória, ex: `Kazulo2026!MinhaEmpresa#ChaveSecreta` | Segurança do login |
| `ADMIN_PASSWORD` | senha forte só do admin | Senha do usuário `admin` |
| `DEFAULT_USER_PASSWORD` | senha forte dos setores | Senha de design, pcp, etc. |
| `DB_PATH` | `/var/data/kazulo.db` | Onde o SQLite fica no disco |

**Gere o JWT_SECRET:** pode usar https://randomkeygen.com (copie uma “CodeIgniter Encryption Keys”).

Clique **Save Changes**.

### Passo A8 — Publicar (Deploy)

1. **Create Web Service** (ou **Manual Deploy** → **Deploy latest commit**)  
2. Aguarde 5–10 minutos. Log deve mostrar:
   - `npm run build` ✓  
   - `[kazulo] API em http://localhost:...`  
   - `Usuários padrão criados` (só na **primeira** vez)

### Passo A9 — Testar o site

1. Render mostra a URL: `https://kazulo-workflow-xxxx.onrender.com`  
2. Abra no celular ou em outro PC (não precisa ser o seu).  
3. Login:
   - **admin** + senha que você colocou em `ADMIN_PASSWORD`  
   - **design** + senha de `DEFAULT_USER_PASSWORD`  

Se abrir a tela de login, **está no ar**.

### Passo A10 — Passar o link para a equipe

- Envie a URL por WhatsApp/e-mail  
- Cada setor usa seu usuário (`design`, `processos`, `pcp`, `compras`, `desenvolvimento`)  
- **admin** continua com poder total  

### Passo A11 — Importar projetos do seu PC (opcional)

1. No **seu PC**, com dados antigos no navegador, abra o site local ou o novo site como admin  
2. Se ainda tiver dados só no `localStorage`, use o botão **Importar para o servidor** (admin, lista vazia)

---

## Parte 3 — Domínio próprio (opcional, depois)

Ex.: `workflow.kazulo.com.br`

1. Compre domínio (Registro.br, Cloudflare, etc.)  
2. No Render: **Settings** → **Custom Domains** → adicione o domínio  
3. No DNS do domínio, crie o CNAME que o Render indicar  

---

# CAMINHO B — PC na empresa + Cloudflare Tunnel (grátis)

Use se um computador da empresa pode ficar **ligado sempre** com o projeto rodando.

### Passo B1 — No PC servidor

```powershell
cd C:\Users\victor\Desktop\workflow-pdv\workflow-pdv
copy .env.example .env
# Edite .env com Notepad: JWT_SECRET, ADMIN_PASSWORD, etc.

npm install
npm run build
npm run start
```

Deixe essa janela aberta (ou configure como serviço Windows depois).

### Passo B2 — Cloudflare Tunnel

1. Conta em https://dash.cloudflare.com  
2. **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**  
3. Instale `cloudflared` no Windows (link que o painel mostra)  
4. Aponte o tunnel para `http://localhost:3001`  
5. Escolha um subdomínio, ex: `workflow.suaempresa.com`  

Assim o site fica na internet **sem abrir porta no roteador**.

---

# Checklist de segurança (faça antes de divulgar)

- [ ] Trocou `ADMIN_PASSWORD` e `DEFAULT_USER_PASSWORD` (não use `admin123` / `kazulo123`)  
- [ ] `JWT_SECRET` longo e único  
- [ ] Só quem precisa tem o link  
- [ ] Fez backup: no Render, baixe cópia de `/var/data/kazulo.db` periodicamente  

---

# Problemas comuns

### “Application failed to respond”

- Veja **Logs** no Render  
- Confirme **Start Command:** `npm run start`  
- Confirme **Build** terminou sem erro  

### Projetos sumiram após reiniciar

- Falta **disco persistente** + `DB_PATH=/var/data/kazulo.db`  
- Plano Free sem disco → migre para Starter  

### Login não funciona

- Usuários são criados na **primeira** subida com as senhas do `.env` / variáveis Render  
- Se mudou `ADMIN_PASSWORD` depois, precisa resetar no banco ou recriar serviço com banco novo  

### Site lento ao abrir

- Render “dorme” serviço inativo no plano Free; Starter mantém ativo  

### `better-sqlite3` erro no build

- Render usa Linux; o `npm install` no servidor compila o módulo. Não copie a pasta `node_modules` do Windows para o Git — só o código.

---

# Comandos úteis (referência)

| Situação | Comando |
|----------|---------|
| Desenvolver no PC | `npm run dev:all` |
| Testar produção local | `npm run build` depois `npm run start` → http://localhost:3001 |
| Atualizar site no Render | `git add .` → `git commit -m "atualizacao"` → `git push` (deploy automático) |

---

# Precisa de ajuda?

Quando pedir suporte, envie:

1. URL do site  
2. Print da aba **Logs** do Render (últimas 30 linhas)  
3. O que você clicou e a mensagem de erro  

---

**Resumo em 5 frases:**  
1) Suba o código no GitHub.  
2) Crie conta no Render e conecte o repositório.  
3) Use plano **Starter** + disco em `/var/data` + variáveis de ambiente.  
4) Deploy → copie a URL `https://....onrender.com`.  
5) Equipe acessa essa URL e faz login com usuário do setor.
