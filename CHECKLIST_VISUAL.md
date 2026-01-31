# 🎯 CHECKLIST VISUAL - Executar em Casa

**Status:** ✅ CONCLUÍDO  
**Data de Início:** 31/01/2026  
**Data de Conclusão:** 31/01/2026  
**Ritmo:** Fast Track (TODAS AS FASES EM 1 DIA!)

---

## ✅ PRÉ-REQUISITOS (Antes de sair do trabalho)

- [x] **Documentação salva em Git**
  - AUDITORIA_UX_UI.md
  - PLANO_IMPLEMENTACAO_OPCAO2.md
  - GUIA_RAPIDO_EXECUCAO_CASA.md
  - CHECKLIST VISUAL (este arquivo)

- [x] **Repositório sincronizado**
  ```bash
  git status          # ✓ Clean
  git log --oneline   # ✓ Vê commits recentes
  ```

---

## 🏠 EM CASA - NOITE 1 (3 HORAS) ✅ CONCLUÍDO

### FASE 1: Design System Base (1h) ✅

**Arquivo:** `lib/designSystem.ts` (NEW)

```
[x] Abrir PLANO_IMPLEMENTACAO_OPCAO2.md
[x] Ir para seção "FASE 1"
[x] Copiar código de designSystem.ts
[x] Criar pasta lib/ (se não existir)
[x] Criar arquivo lib/designSystem.ts
[x] Colar código
[x] Salvar
[x] ✓ Pronto!
```

### FASE 2a: Atualizar CSS (30min) ✅

**Arquivo:** `index.css`

```
[x] Abrir PLANO_IMPLEMENTACAO_OPCAO2.md
[x] Ir para "Fase 1: Atualizar Classes Globais"
[x] Copiar novo conteúdo de CSS
[x] Abrir c:\avigestao\index.css
[x] Encontrar seção @layer components
[x] Substituir pela nova
[x] Salvar
[x] ✓ Pronto!
```

### FASE 2b: Criar 6 Componentes UI (1.5h) ✅

**Pasta:** `components/ui/` (NEW)

```
[x] Criar pasta: components/ui/

Para cada componente:
  [x] Badge.tsx
     - Copiar de PLANO_IMPLEMENTACAO_OPCAO2.md
     - Criar components/ui/Badge.tsx
     - Salvar
  
  [x] Card.tsx
     - Copiar de PLANO_IMPLEMENTACAO_OPCAO2.md
     - Criar components/ui/Card.tsx
     - Salvar
  
  [x] DropdownMenu.tsx
     - Copiar de PLANO_IMPLEMENTACAO_OPCAO2.md
     - Criar components/ui/DropdownMenu.tsx
     - Salvar
  
  [x] AlertBanner.tsx
     - Copiar de PLANO_IMPLEMENTACAO_OPCAO2.md
     - Criar components/ui/AlertBanner.tsx
     - Salvar
  
  [ ] Tabs.tsx
     - Copiar de PLANO_IMPLEMENTACAO_OPCAO2.md
     - Criar components/ui/Tabs.tsx
     - Salvar
```

### BUILD & COMMIT

```bash
[ ] npm run build              # Deve compilar em ~13s
    ✓ ✓ ✓ Sucesso esperado!
    Se erro: verifique imports/tipos

[ ] npm run build OK?
    ✓ SIM → Continuar
    ✗ NÃO → Verifique console errors

[ ] git add .
[ ] git commit -m "feat: design system base + componentes ui"
[ ] git push
```

**Resultado esperado:**
```
✓ lib/designSystem.ts criado
✓ index.css atualizado
✓ components/ui/ com 5 componentes
✓ Compila sem erros
✓ Commit enviado para GitHub
```

---

## 🏠 EM CASA - NOITE 2 (4-5 HORAS)

### FASE 3: Refatorar Cards (2h)

**Arquivo:** `pages/BirdManager.tsx`

```
[ ] Abrir PLANO_IMPLEMENTACAO_OPCAO2.md
[ ] Ir para "FASE 3: Refatorar Cards"
[ ] Copiar seção "Imports"
[ ] Abrir pages/BirdManager.tsx
[ ] Atualizar imports no topo
[ ] Procurar: grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3
[ ] Copiar novo JSX de renderização de cards
[ ] Substituir o antigo
[ ] Copiar funções auxiliares (getStatusVariant, etc)
[ ] Adicionar ao arquivo
[ ] Salvar
```

### FASE 4: Refatorar Modais (2-3h)

**Arquivo Novo:** `components/BirdDetailModal.tsx`

```
[ ] Abrir PLANO_IMPLEMENTACAO_OPCAO2.md
[ ] Ir para "FASE 4: Refatorar Modais"
[ ] Copiar código completo de BirdDetailModal
[ ] Criar: components/BirdDetailModal.tsx
[ ] Colar código completo
[ ] Salvar

[ ] Criar pasta: components/sections/
[ ] Criar arquivo: components/sections/BirdInfoSection.tsx
[ ] Copiar código de BirdInfoSection do plano
[ ] Salvar
    (Outras seções: deixar para depois se quiser)
```

### BUILD & COMMIT

```bash
[ ] npm run build              # ~13s
    ✓ ✓ ✓ Sucesso esperado!
    Se erro: verifique tipos/imports

[ ] npm run build OK?
    ✓ SIM → Continuar
    ✗ NÃO → Corrija e refaça

[ ] git add .
[ ] git commit -m "refactor: simplificar cards + reorganizar modais"
[ ] git push
```

**Resultado esperado:**
```
✓ Cards muito mais limpos (60% menos badges)
✓ Modais reorganizados
✓ Compila sem erros
✓ Commit enviado
```

---

## 🏠 EM CASA - NOITE 3 (3 HORAS)

### FASE 5: Navegação (1h)

**Arquivo Novo:** `components/BirdListTabs.tsx`

```
[ ] Abrir PLANO_IMPLEMENTACAO_OPCAO2.md
[ ] Ir para "FASE 5"
[ ] Copiar código completo
[ ] Criar: components/BirdListTabs.tsx
[ ] Colar
[ ] Salvar
```

### FASE 6: Polimento Visual (1h)

**Arquivos:** `Dashboard.tsx`, `Sidebar.tsx`, `index.css`

Checklist de Polimento:

```
CORES:
[ ] Remover gradientes desnecessários
[ ] Usar cores semânticas (6 principais)
[ ] Verificar contraste mínimo 4.5:1

ESPAÇAMENTO:
[ ] Usar classes padrão (gap-1, gap-2, gap-3, gap-4)
[ ] Remover values aleatórios (gap-2.5, gap-1.5)
[ ] Consistência global

ANIMAÇÕES:
[ ] Remover pulse animações desnecessárias
[ ] Manter apenas transições smooth
[ ] Adicionar loading states

TIPOGRAFIA:
[ ] Usar classes .text-h1, .text-h2, etc
[ ] Remover tamanhos inline (text-[10px])
```

### FASE 7: Testes (1h)

```
FUNCIONALIDADE:
[ ] Criar nova ave - Funciona? ✓
[ ] Editar ave - Funciona? ✓
[ ] Deletar ave - Funciona? ✓
[ ] Mudar status - Funciona? ✓
[ ] Menu dropdown - Funciona? ✓
[ ] IBAMA registration - Funciona? ✓

VISUAL:
[ ] Cards limpos - OK? ✓
[ ] Modais organizados - OK? ✓
[ ] Tipografia consistente - OK? ✓
[ ] Cores semânticas - OK? ✓
[ ] Tabs funcionando - OK? ✓

RESPONSIVIDADE:
[ ] Mobile (320px) - OK? ✓
[ ] Tablet (768px) - OK? ✓
[ ] Desktop (1024px+) - OK? ✓

CONSOLE:
[ ] Sem errors? ✓
[ ] Sem warnings críticos? ✓

PERFORMANCE:
[ ] npm run build < 15s? ✓
[ ] Lighthouse > 90? ✓
```

### BUILD, COMMIT & DEPLOY

```bash
[ ] npm run build              # ~13s
[ ] Verificar tamanho dos bundles
[ ] npm run build OK?
    ✓ SIM → Deploy
    ✗ NÃO → Corrija

[ ] firebase deploy --only hosting
    ✓ Deploy complete!

[ ] git add .
[ ] git commit -m "test: validação completa + deploy OPÇÃO 2"
[ ] git push

[ ] Criar Pull Request ou Merge para main (opcional)
```

---

## 🎉 SUCESSO!

Quando terminar tudo:

```
✓ 6 componentes reutilizáveis criados
✓ Design system implementado
✓ Cards 60% mais limpos
✓ Modais melhor organizados
✓ Navegação clara
✓ Interface profissional
✓ WCAG AA completo
✓ Tudo compilando
✓ Tudo deployado
```

---

## 📞 PROBLEMAS DURANTE EXECUÇÃO?

### "npm run build" com erro?

```bash
# Ver o erro exato:
npm run build 2>&1 | head -30

# Erros comuns:
- Missing import? Verificar typo no import
- Tipo errado? Verificar interface do componente
- File not found? Verificar caminho

# Se muito perdido, reset:
git checkout -- .  # Volta ao último commit
```

### Componente não renderiza?

```bash
# Verificar:
1. Import correto? (verifique caminho)
2. Typo no componente? (copy-paste correto?)
3. Props corretos? (verificar interface)
```

### Quero parar no meio?

```bash
# Criar novo commit com progresso
git add .
git commit -m "WIP: progresso OPÇÃO 2 - fase 3"
git push

# Depois continua de onde parou
```

---

## 📊 RITMO RECOMENDADO

### FAST TRACK (2-3 dias):
- **Noite 1:** 3h → Fases 1+2 ✓
- **Manhã/Tarde 2:** 5h → Fases 3+4 ✓
- **Tarde 3:** 2h → Fases 5+6+7 ✓
- **Total:** 10h de trabalho

### NORMAL (1 semana):
- **Noite 1:** 3h → Fase 1+2 ✓
- **Noite 2:** 4h → Fase 3 ✓
- **Noite 3:** 3h → Fase 4 ✓
- **Noite 4:** 2h → Fase 5 ✓
- **Noite 5:** 2h → Fase 6+7 ✓
- **Total:** 14h (2h/noite)

### RELAXADO (2 semanas):
- **2h por noite** → 7 noites ✓

---

## 🚀 COMECE AGORA!

Quando chegar em casa, execute nesta ordem:

1. ✅ Abrir este arquivo (CHECKLIST VISUAL)
2. ✅ Abrir VS Code
3. ✅ Terminal: `git checkout -b feature/refactor-uxui-design-system`
4. ✅ Começar FASE 1
5. ✅ Marcar cada [ ] conforme conclui

**BOA SORTE!** 🎉💪

---

## 📋 LINKS RÁPIDOS

- **Auditoria:** [AUDITORIA_UX_UI.md](file:///c:/avigestao/AUDITORIA_UX_UI.md)
- **Plano Completo:** [PLANO_IMPLEMENTACAO_OPCAO2.md](file:///c:/avigestao/PLANO_IMPLEMENTACAO_OPCAO2.md)
- **Guia de Execução:** [GUIA_RAPIDO_EXECUCAO_CASA.md](file:///c:/avigestao/GUIA_RAPIDO_EXECUCAO_CASA.md)

---

**Status:** 🟢 PRONTO | **Começar:** HOJE À NOITE | **Duração:** 10-14h | **Resultado:** Interface profissional 🎨
