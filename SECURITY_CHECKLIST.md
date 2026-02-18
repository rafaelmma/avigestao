# 🔒 Segurança AviGestão - Checklist de Produção

## ✅ Já Implementado (Código + Regras)

### 1. **DevTools Blocker** (App.tsx)
- ✅ Bloqueia F12
- ✅ Bloqueia Ctrl+Shift+I (Inspect)
- ✅ Bloqueia Ctrl+Shift+C (Element picker)
- ✅ Bloqueia Ctrl+Shift+J (Console)
- ✅ Bloqueia Ctrl+Shift+K (DevTools)
- ✅ Bloqueia Right-click → Inspect
- ✅ Detecta abertura lateral de DevTools (limpa página se detectado)
- ⚠️ **Nota**: Em produção (`import.meta.env.PROD`), desabilitado em dev local

### 2. **Firestore Security Rules** (firestore.rules)
**Autenticação & Autorização:**
- ✅ Toda escrita requer autenticação (`isAuthenticated()`)
- ✅ Ownership check obrigatório (isOwner check)
- ✅ Validação de admin para ações críticas
- ✅ Pro access validation para limite de aves

**Proteção de Settings:**
- ✅ Remover `allow read: if true` (era vulnerável)
- ✅ Apenas dono + admin podem ler settings
- ✅ Campos permitidos na escrita strict list:
  ```
  region, state, city, breederName, phone,
  isPublic, communityOptIn, communityAllowContact,
  temperatureUnit, preferredLanguage, lastUpdated
  ```
- ✅ Impede que usuários alterem campos críticos

**Proteção de Dados Comunitários:**
- ✅ Community posts com visibilidade validada
- ✅ Mensagens privadas - apenas remetente/destinatário podem ler
- ✅ Reports de moderação - apenas admin pode gerenciar

### 3. **Storage Security Rules** (storage.rules)
**Validação de Upload:**
- ✅ Máximo 5MB por arquivo
- ✅ Mínimo 1KB (evita uploads vazios)
- ✅ Apenas imagens: `image/(jpeg|jpg|png|webp|gif)`
- ✅ Apenas usuários autenticados podem fazer upload

**Restrição de Deleção:**
- ✅ Deleção desabilitada para usuários direto
- ✅ Apenas admin via Console ou Cloud Functions

**Logos (Branding):**
- ✅ Proprietário pode upload/ler
- ✅ Acesso público controlado
- ✅ Validação de tamanho (5MB) e tipo (image/*)

---

## 📋 Próximas Ações (Firebase Console)

### 4. **Restrição de API Key** - ⚠️ FAZER MANUALMENTE
Seu site está usando uma API Key que é públca (normal em SPAs). Para protegê-la:

**Passos:**
1. Acesse [Firebase Console](https://console.firebase.google.com/project/avigestao-cf5fe/apikeys)
2. Clique em seu projeto → Settings (⚙️) → Chaves de API
3. Procure a key padrão (sem nome específico)
4. Clique nela e vá para "API Restrictions"
5. Selecione apenas:
   - ✅ Cloud Firestore API
   - ✅ Firebase Authentication API  
   - ✅ Firebase Cloud Storage API
   - ✅ Firebase Realtime Database API (se usar)
   - ❌ Remova todas as outras APIs geral que não usa
6. Vá para "HTTP referrers (websites)"
7. Adicione:
   ```
   https://avigestao-cf5fe.web.app/*
   https://seu-dominio-customizado.com/*  (quando tiver)
   ```
8. Clique "Save"

**Por que?** Impede que alguém use sua API Key em outro site.

---

## 🛡️ Proteção em Camadas

```
Layer 4: API Key Restrictions
        ↓
Layer 3: Storage Rules (validação de upload)
        ↓
Layer 2: Firestore Rules (autenticação + ownership)
        ↓
Layer 1: DevTools Blocker (dificulta engenharia reversa)
        ↓
Cliente (seu navegador)
```

---

## 🔍 O que Está Protegido Agora

| Dado | Proteção | Risco |
|------|----------|-------|
| **Senhas** | Firebase Auth (hash bcrypt) | 🟢 Seguro |
| **Pássaros** | Ownership + Firestore Rules | 🟢 Seguro |
| **Pedigrees** | Ownership + estrutura validada | 🟢 Seguro |
| **Mensagens** | Remetente/Destinatário check | 🟢 Seguro |
| **Uploads** | Tamanho + tipo + autenticação | 🟢 Seguro |
| **Settings** | Whitelist de campos editáveis | 🟢 Seguro |
| **Admin functions** | Apenas admins | 🟢 Seguro |
| **Código JS** | DevTools blocker + Firestore rules | 🟡 Difícil (não é criptografia) |

⚠️ **Nota:** Código JavaScript no cliente PODE ser acessado via Chrome DevTools mesmo com bloqueador (é apenas um deterrent). Lógica crítica deve estar em **Cloud Functions** apenas.

---

## 🚀 Recomendações Futuras (Sem custo extra)

1. **Cloud Functions para operações críticas** (ex: transferência de aves, pagamentos)
   - Move lógica do cliente para backend seguro
   - Com Firestore Rules como segunda camada de proteção

2. **Audit Logs** (via Cloud Logging - free tier generoso)
   ```
   - Quem deletou o quê
   - Quem transferiu aves
   - Tentativas de acesso negado
   ```

3. **Rate Limiting** nas rules (simples com timestamp)
   - Evita brute force em senhas
   - Limita uploads dos usuários

4. **2FA (Two-Factor Authentication)**
   - Firebase Auth suporta nativamente
   - Free, apenas ativa na console

---

## ✅ Deploy Status

- ✅ DevTools Blocker: **ATIVO**
- ✅ Firestore Rules: **DEPLOYED**
- ✅ Storage Rules: **DEPLOYED**
- ⏳ API Key Restrictions: **AGUARDANDO AÇÃO MANUAL**
- ✅ Hosting: **LIVE** em https://avigestao-cf5fe.web.app

---

**Data:** 18 de Fevereiro 2026  
**Ambiente:** Produção  
**Próximo Review:** Após implementar API Key restrictions
