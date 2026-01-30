# Migração Supabase → Firebase

## Status: EM ANDAMENTO 🚧

### ✅ Concluído

#### 1. Configuração Inicial do Firebase
- ✅ Projeto criado no Firebase Console
- ✅ SDK do Firebase instalado (`npm install firebase`)
- ✅ Arquivo de configuração criado: `src/lib/firebase.ts`
- ✅ Serviços do Firebase exportados: `auth`, `db`, `storage`

#### 2. Estrutura de Serviços Criada
- ✅ **authService.ts**: Funções de autenticação (login, logout, cadastro, reset de senha)
- ✅ **firestoreService.ts**: Operações CRUD para Firestore (birds, pairs, medications, etc)
- ✅ **storageService.ts**: Upload/download de arquivos (imagens de pássaros, documentos)

#### 3. Integração no App.tsx
- ✅ Importações do Firebase Auth adicionadas
- ✅ Estado `firebaseUser` criado
- ✅ Listener `onAuthStateChanged` adicionado
- ✅ Mantido Supabase funcionando em paralelo (modo compatibilidade)

#### 4. Migração de Autenticação
- ✅ **Auth.tsx**: Migrado para Firebase Auth (login, cadastro, reset)
- ✅ **ResetPassword.tsx**: Migrado para Firebase Auth (confirmação de senha)

---

## 🔄 Próximos Passos

### Fase 1: Migração de Autenticação ✅ CONCLUÍDA
1. ✅ Migrar página Auth.tsx
2. ✅ Migrar ResetPassword.tsx
3. ⏳ Atualizar lógica de sessão no App.tsx (parcialmente feito)

### Fase 2: Configurar Firebase Authentication no Console
1. **Ativar provedores de autenticação**
   - Email/Password (obrigatório)
   - Google (opcional)
   - Configurar templates de email personalizados

2. **Configurar domínio autorizado**
   - Adicionar seu domínio em Authentication > Settings > Authorized domains

### Fase 3: Migração de Banco de Dados
1. **Criar estrutura no Firestore**
   - Coleções: `users/{userId}/birds`, `users/{userId}/pairs`, etc
   - Configurar índices compostos necessários
   - Definir regras de segurança (Security Rules)

2. **Exportar dados do Supabase**
   - Script para exportar todos os dados em JSON
   - Backup completo antes da migração

3. **Importar dados para o Firestore**
   - Script de importação em lote
   - Validar integridade dos dados

4. **Migrar páginas para usar Firestore**
   - BirdManager.tsx → usar `firestoreService.getBirds()`, etc
   - BreedingManager.tsx → usar `firestoreService.getPairs()`, etc
   - MedsManager.tsx, MovementsManager.tsx, etc

### Fase 3: Migração de Storage
1. **Exportar arquivos do Supabase Storage**
   - Download de todas as imagens de pássaros
   - Download de documentos

2. **Upload para Firebase Storage**
   - Recriar estrutura de pastas
   - Atualizar URLs no banco de dados

3. **Atualizar código de upload**
   - Substituir chamadas do Supabase Storage por `storageService`

### Fase 4: Migração de APIs/Functions
1. **Criar Cloud Functions**
   - Inicializar Firebase Functions: `firebase init functions`
   - Migrar APIs de `/api/` (Vercel) para Cloud Functions

2. **APIs a migrar:**
   - `create-checkout.ts` (Stripe)
   - `stripe-webhook.ts` (Stripe)
   - `get-subscription.ts`
   - `sync-subscription.ts`
   - Admin APIs

3. **Configurar variáveis de ambiente**
   - Stripe keys
   - Outras secrets necessárias

### Fase 5: Realtime/Subscriptions
1. **Migrar Realtime do Supabase para Firestore Realtime**
   - Substituir `supabase.channel()` por `onSnapshot()`
   - Atualizar listeners de mudanças em tempo real

### Fase 6: Limpeza e Deploy
1. **Remover dependências do Supabase**
   - Desinstalar `@supabase/supabase-js`
   - Remover `lib/supabase.ts`
   - Remover imports e referências ao Supabase

2. **Remover dependências da Vercel**
   - Remover arquivos `/api/`
   - Atualizar `vercel.json` ou removê-lo

3. **Configurar Firebase Hosting**
   - `firebase init hosting`
   - Configurar build e deploy
   - Testar deploy

4. **Configurar domínio customizado**
   - Apontar DNS para Firebase Hosting
   - Configurar SSL

---

## 📋 Checklist de Validação

### Autenticação
- [ ] Login funciona
- [ ] Cadastro funciona
- [ ] Logout funciona
- [ ] Reset de senha funciona
- [ ] Sessão persiste entre reloads

### Banco de Dados
- [ ] CRUD de birds funciona
- [ ] CRUD de pairs funciona
- [ ] CRUD de medications funciona
- [ ] CRUD de movements funciona
- [ ] CRUD de transactions funciona
- [ ] CRUD de tasks funciona
- [ ] CRUD de tournaments funciona
- [ ] Settings são salvos corretamente

### Storage
- [ ] Upload de imagens de pássaros funciona
- [ ] Upload de documentos funciona
- [ ] URLs das imagens funcionam
- [ ] Deleção de arquivos funciona

### Funcionalidades Avançadas
- [ ] Realtime updates funcionam
- [ ] APIs de pagamento (Stripe) funcionam
- [ ] Admin dashboard funciona
- [ ] Export/import de dados funciona

### Performance
- [ ] Carregamento inicial é rápido
- [ ] Queries são otimizadas
- [ ] Cache funciona corretamente
- [ ] Offline persistence (opcional)

---

## 🔧 Comandos Úteis

### Firebase CLI
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar Functions
firebase init functions

# Inicializar Hosting
firebase init hosting

# Deploy completo
firebase deploy

# Deploy apenas Functions
firebase deploy --only functions

# Deploy apenas Hosting
firebase deploy --only hosting

# Emuladores locais
firebase emulators:start
```

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 📝 Notas Importantes

1. **Compatibilidade durante migração**: O código atual mantém Supabase e Firebase em paralelo até migração completa.
2. **Backup**: SEMPRE faça backup dos dados antes de qualquer operação de migração.
3. **Testes**: Teste cada funcionalidade após migração antes de remover código antigo.
4. **Security Rules**: Configure regras de segurança do Firestore e Storage antes de deploy em produção.
5. **Custos**: Monitore custos do Firebase (especialmente reads/writes do Firestore e bandwidth do Storage).

---

## 🎯 Objetivo Final

Substituir completamente:
- ❌ Supabase Auth → ✅ Firebase Auth
- ❌ Supabase Postgres → ✅ Firestore
- ❌ Supabase Storage → ✅ Firebase Storage
- ❌ Supabase Realtime → ✅ Firestore Realtime
- ❌ Vercel Serverless Functions → ✅ Firebase Cloud Functions
- ❌ Vercel Hosting → ✅ Firebase Hosting
