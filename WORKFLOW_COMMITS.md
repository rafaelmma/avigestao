# 🔄 Workflow de Commits - Padrão Avigestão

## 📋 Rotina Após Cada Alteração

A partir de agora, sempre que fizer alterações no projeto, seguirei este fluxo:

### 1. **npm build** ✅
```bash
npm run build
```
- Verifica se há erros de compilação
- Valida TypeScript/JSX
- Gera build otimizado

### 2. **git add** ✅
```bash
git add -A
```
- Adiciona todos os arquivos modificados

### 3. **git commit** ✅
```bash
git commit -m "tipo: descrição curta

- Detalhes da mudança 1
- Detalhes da mudança 2
- Arquivos alterados"
```

**Tipos de commit:**
- `fix:` - Correção de bugs
- `feat:` - Nova funcionalidade
- `refactor:` - Refatoração de código
- `docs:` - Documentação
- `perf:` - Melhorias de performance
- `style:` - Formatação/estilos
- `test:` - Testes

### 4. **git push** ✅
```bash
git push origin main
```
- Envia para repositório remoto

### 5. **Resumo** 📝
Trazer um resumo visual:
```
✅ RESUMO DAS ALTERAÇÕES

📦 Commit: [hash]
📝 Mensagem: [descrição]

📝 Arquivos Modificados:
- App.tsx
- lib/birdSync.ts
- pages/BirdManager.tsx

📊 Estatísticas:
- 4 arquivos alterados
- 239 adições
- 78 deletions

🔗 Status: ✅ Enviado para origin/main
```

---

## 📋 Exemplo - Fluxo Completo

```
[1] Fazer alterações no código
     ↓
[2] npm run build → ✅ Sem erros
     ↓
[3] git add -A
     ↓
[4] git commit -m "fix: descrição"
     ↓
[5] git push origin main → ✅ Enviado
     ↓
[6] Mostrar resumo ao usuário
```

---

## ⚠️ Possíveis Cenários

### Cenário A: Build com erros
```
❌ npm run build → FALHA
   └─ Mostrar erro ao usuário
   └─ NÃO fazer commit
   └─ Aguardar correção
```

### Cenário B: Push falhar
```
✅ npm run build → OK
✅ git add -A
✅ git commit ✅ OK
❌ git push → FALHA (conflito?)
   └─ Mostrar erro
   └─ Aguardar resolução
```

### Cenário C: Tudo OK
```
✅ npm run build → OK
✅ git add -A
✅ git commit → OK
✅ git push → OK
📝 Mostrar resumo detalhado
```

---

## 🔍 Informações no Resumo

Cada resumo incluirá:
- ✅ Status de cada etapa (build, commit, push)
- 📝 Mensagem do commit
- 📊 Número de arquivos alterados
- 🔗 Hash do commit
- 🎯 Branch atual

---

## 📌 Observações

1. **npm build**: Será feito se Node.js estiver disponível
2. **git**: Sempre será executado (já configurado no Windows)
3. **Resumo**: Sempre entregue ao final de cada alteração
4. **Commits**: Seguir padrão Conventional Commits

---

## ✅ Último Commit (28/01/2026)

```
88bf7f2 - fix: melhorar fluxo de salvamento de aves (localStorage principal + Supabase backup)
├─ 4 arquivos alterados
├─ 239 adições
├─ 78 deletions
└─ Status: ✅ Enviado
```
