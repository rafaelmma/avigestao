# 🔑 Como Obter Chave de Serviço Firebase

## Passo 1: Abrir Firebase Console
1. Acesse: https://console.firebase.google.com
2. Selecione projeto: **avigestao-cf5fe**

## Passo 2: Acessar Settings
1. Clique no ⚙️ (Settings) no canto superior esquerdo
2. Vá em "Project Settings"

## Passo 3: Gerar Chave
1. Vá até a aba **"Service Accounts"**
2. Clique em **"Generate New Private Key"**
3. Um arquivo JSON será baixado (tipo: `avigestao-cf5fe-xxxxx.json`)

## Passo 4: Salvar a Chave
1. Renomeie o arquivo para: **`firebase-key.json`**
2. Coloque na pasta: `c:\avigestao\scripts\`

## Passo 5: Rodar o Script
Depois que tiver o arquivo, execute:

```powershell
cd c:\avigestao
node scripts/create-admin-user.js
```

---

⚠️ **IMPORTANTE:**
- A chave é confidencial - não compartilhe!
- Não commite para Git (já está no .gitignore)
- Guarde em local seguro

Quando tiver a chave salva, me avise para executar o script! 🚀
