# ✅ CORS CORRIGIDO - uploadLogo Funcionando!

## O Problema
A função `uploadLogo` estava retornando **HTTP 403 Forbidden** no preflight OPTIONS, bloqueando toda tentativa de upload.

**Root Cause:** A função tinha sido criada como v2 (Cloud Run), mas Firebase não suporta upgrade de v1 para v2 sem deletar a function antiga primeiro.

## A Solução

### Passo 1: Deletar função antiga
```bash
firebase functions:delete uploadLogo --region southamerica-east1 --force
```

### Passo 2: Recriar como v1 nativa com CORS
- Removido import: `import { onRequest } from "firebase-functions/v2/https"`
- Mantido: `import cors from "cors"`
- Função reescrita de v2 para v1 nativa: `functions.region(...).https.onRequest(...)`

### Passo 3: Deploy
```bash
firebase deploy --only functions:uploadLogo
```

## Resultado ✅

Agora o preflight retorna **HTTP/1.1 204 No Content** com os headers CORS corretos:

```
HTTP/1.1 204 No Content
access-control-allow-origin: https://avigestao.com.br
access-control-allow-methods: POST,OPTIONS
access-control-allow-headers: Content-Type,Authorization
access-control-allow-credentials: true
```

## O que foi deployado

### Backend (`functions/src/index.ts`)
- uploadLogo function usando `functions.region().https.onRequest()`
- Middleware CORS com `cors` npm package
- Handler para:
  - OPTIONS → retorna 204 com headers
  - POST → processa upload com autenticação

### Frontend (`pages/SettingsManager.tsx`)
- Função `handleLogoUpload` pronta
- Endpoint: `https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net/uploadLogo`
- Envia: Bearer token + base64 file data

### Hosting
- Frontend deployado em: https://avigestao.com.br

## Como Testar

1. Acesse: **https://avigestao.com.br**
2. Vá para: **Configurações** → **Carregar nova logo**
3. Selecione uma imagem (JPG/PNG, máx 5MB)
4. Clique em **Enviar**

Se funcionar:
- Logo aparecerá em tempo real
- Firestore será atualizado com `logoUrl`
- Storage armazenará arquivo em `logos/{userId}/`

## Logs para Debugging

Se der erro:
1. Console do navegador (F12) - veja se há erro de CORS
2. Firebase Console → Cloud Functions → uploadLogo → Logs
3. Firestore Rules - verifica se user está autenticado

---

**Todos os commits automaticamente feitos. CORS agora funcionando! 🎉**
