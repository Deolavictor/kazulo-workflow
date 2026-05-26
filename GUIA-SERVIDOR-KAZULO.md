# Rodar o KAZULO no servidor da Kazulo (dados na empresa)

Você **não é obrigado** a usar Railway, Render ou outra nuvem.

O banco já é um arquivo **`kazulo.db`** (SQLite). Ele fica **onde o programa Node estiver rodando**. Se isso for um PC/servidor da Kazulo, os dados ficam **na Kazulo**, por meses ou anos, desde que:

1. O servidor fique ligado (ou religue após queda de energia)  
2. O arquivo `.db` esteja em uma **pasta fixa** (não temporária)  
3. Alguém faça **backup** dessa pasta de vez em quando  

---

## Comparativo rápido

| Onde roda | Onde ficam os dados | Quem paga nuvem | Bom para |
|-----------|---------------------|-----------------|----------|
| Railway / Render | Disco deles | Créditos/mensalidade | Quem não tem servidor |
| **Servidor Kazulo** | **HD do servidor Kazulo** | **R$ 0 de hospedagem** | **Manter dados meses, controle total** |

Para “não perder nada por meses”, **servidor na empresa** costuma ser a melhor escolha.

---

## O que você precisa na Kazulo

| Item | Mínimo sugerido |
|------|------------------|
| Máquina | PC fixo ou Windows Server que fica ligado no horário de trabalho (ideal: 24h) |
| Sistema | Windows 10/11 ou Windows Server |
| Rede | Wi‑Fi/cabo da empresa (mesma rede dos PCs) |
| Node.js | Versão 20 LTS — https://nodejs.org |
| Pasta de dados | Ex.: `D:\Kazulo\dados\` (não use pasta Temp) |

Não precisa instalar MySQL nem PostgreSQL — só o arquivo `kazulo.db`.

---

# PASSO A PASSO — Servidor Windows na Kazulo

## 1. Escolher o computador “servidor”

- Um PC que **não** é desligado todo dia à noite, **ou**  
- Um PC que liga automaticamente de manhã e o sistema sobe sozinho (passo 7)  

Anote o **IP fixo** na rede (ex.: `192.168.1.50`).  
No roteador, pode reservar IP para esse PC (DHCP reservation).

---

## 2. Instalar Node.js no servidor

1. https://nodejs.org → baixar **LTS**  
2. Instalar (Next, Next)  
3. Abrir **PowerShell** e testar:

```powershell
node -v
npm -v
```

Deve aparecer versão (ex.: `v20.x`).

---

## 3. Copiar o projeto para o servidor

Opção A — pasta copiada do seu PC:

```
D:\Kazulo\workflow-pdv\
```

Opção B — Git (se usar GitHub):

```powershell
cd D:\Kazulo
git clone https://github.com/SEU_USUARIO/kazulo-workflow.git workflow-pdv
cd workflow-pdv
```

---

## 4. Criar pasta só para o banco (importante)

```powershell
mkdir D:\Kazulo\dados
```

O banco ficará em:

`D:\Kazulo\dados\kazulo.db`

Assim, mesmo que você atualize o programa, **os dados não misturam** com a pasta do código.

---

## 5. Arquivo `.env` no servidor

Na pasta do projeto (`D:\Kazulo\workflow-pdv`), copie:

```powershell
copy .env.example .env
notepad .env
```

Conteúdo sugerido:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=uma-frase-longa-secreta-só-da-kazulo-minimo-32-caracteres
ADMIN_PASSWORD=senha-forte-do-admin
DEFAULT_USER_PASSWORD=senha-forte-dos-setores
DB_PATH=D:\Kazulo\dados\kazulo.db
```

Salve. **Não** compartilhe esse arquivo por WhatsApp.

---

## 6. Instalar e subir o sistema (primeira vez)

```powershell
cd D:\Kazulo\workflow-pdv
npm install
npm run build
npm run start
```

Deve aparecer:

`[kazulo] API em http://localhost:3001`

### Testar no próprio servidor

Abra o navegador: **http://localhost:3001**

### Testar em outro PC da empresa (mesma rede)

**http://192.168.1.50:3001** (troque pelo IP do servidor)

Se não abrir:

1. **Firewall do Windows** no servidor → permitir porta **3001** (regra entrada TCP)  
2. Confirme o IP com `ipconfig` no servidor  

---

## 7. Deixar rodando sempre (recomendado)

Se alguém fechar a janela do PowerShell, o site cai. Use **PM2** (gerenciador gratuito):

```powershell
npm install -g pm2
cd D:\Kazulo\workflow-pdv
pm2 start npm --name kazulo -- start
pm2 save
pm2 startup
```

O último comando mostra uma linha para colar no PowerShell **como Administrador** — assim o site sobe quando o Windows reinicia.

Comandos úteis:

```powershell
pm2 status          # está rodando?
pm2 logs kazulo     # ver erros
pm2 restart kazulo  # reiniciar após atualização
```

---

## 8. Backup mensal (para não perder meses de dados)

O backup é **copiar o arquivo** `kazulo.db`.

### Manual (1 vez por semana)

Copie `D:\Kazulo\dados\kazulo.db` para:

- Outro HD  
- Pen drive  
- Pasta na nuvem da empresa (OneDrive/Google Drive **da empresa**)  

### Automático (script no servidor)

Na pasta do projeto existe:

`scripts\backup-banco.ps1`

Agende no **Agendador de Tarefas** do Windows (diário, 23h):

- Programa: `powershell.exe`  
- Argumentos: `-File D:\Kazulo\workflow-pdv\scripts\backup-banco.ps1`  

Backups vão para `D:\Kazulo\backups\` (últimos 30 dias).

---

## 9. Acesso de fora da fábrica (opcional)

| Situação | Solução |
|----------|---------|
| Só dentro da Kazulo | IP interno `http://192.168.1.50:3001` basta |
| Casa / viagem | **VPN** da empresa **ou** Cloudflare Tunnel (grátis) apontando para `localhost:3001` |

**Não** é obrigatório colocar na Railway se todos acessam na rede ou por VPN.

---

## 10. Atualizar o sistema depois

No servidor:

```powershell
cd D:\Kazulo\workflow-pdv
# Se usar Git:
git pull
npm install
npm run build
pm2 restart kazulo
```

Os dados em `D:\Kazulo\dados\kazulo.db` **permanecem**.

---

# Perguntas frequentes

### “O banco fica na nuvem?”

**Só se** você subir o programa na nuvem (Railway, etc.).  
**No servidor Kazulo**, o banco fica no **HD da Kazulo** — caminho que você definiu em `DB_PATH`.

### “Aguenta meses de projeto?”

Sim. SQLite aguenta bem volume de checklist e histórico para dezenas de projetos. O limite prático é espaço em disco e backup.

### “E se o PC queimar?”

Por isso o **backup** semanal do `kazulo.db` em outro lugar é essencial.

### “Preciso de MySQL?”

Não para o estágio atual. Se um dia tiver centenas de usuários simultâneos, aí sim vale migrar — não é o caso agora.

### “Vários PCs acessam ao mesmo tempo?”

Sim. Todos apontam para o **mesmo** servidor (`http://IP:3001`). Um único `kazulo.db` centralizado.

---

# Resumo

1. Escolha um PC servidor na Kazulo  
2. `DB_PATH=D:\Kazulo\dados\kazulo.db`  
3. `npm run build` + `pm2 start`  
4. Equipe acessa `http://IP-DO-SERVIDOR:3001`  
5. Backup semanal do `.db`  

**Seus dados ficam na Kazulo, por meses, sem pagar hospedagem na nuvem.**
