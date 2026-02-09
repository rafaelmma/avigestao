# 🚀 Guia Rápido - Portal Administrativo AviGestão

## Como Acessar

```
Login → Dashboard → Sidebar → Administração → Gerenciar Usuários
```

## Interface Principal

### Cabeçalho
```
┌─────────────────────────────────────────────────┐
│ Gerenciamento de Usuários    Total: 42 usuários │
│                         [Exportar] [Atualizar]   │
└─────────────────────────────────────────────────┘
```

### Filtros
```
┌───────────────────────────────────────────────┐
│ 🔍 Buscar por nome ou ID...                  │
│                                              │
│ 🔽 Status: [Todos ▼] [Ativos ▼] [Inativos] │
│ 🔽 Ordenar: [Data ▼] [Nome] [Plano]        │
└───────────────────────────────────────────────┘
```

### Tabela de Usuários
```
┌──────────────┬──────────┬─────┬────────┬────────┬──────────────┐
│ Criador      │ Plano    │ Aves│ Status │ Admin  │ Ações        │
├──────────────┼──────────┼─────┼────────┼────────┼──────────────┤
│ Criatório XY │Profissio │ 45  │ Ativo  │ ✓ Admin│ 👁️ 🔒 🛡️    │
│ id: abc123   │          │     │        │        │              │
│              │          │     │        │        │              │
│ Criador ZW   │ Básico   │ 12  │ Inativo│ ✗      │ 👁️ 🔓 🛡️    │
│ id: xyz789   │          │     │        │        │              │
└──────────────┴──────────┴─────┴────────┴────────┴──────────────┘
```

## Ações Disponíveis

### 1️⃣ Ver Detalhes (👁️)
Clique no ícone de olho para abrir modal com:
- Informações completo do usuário
- Plano e data de membro
- Número de aves e estatísticas
- Botões de ação (disable/enable, admin/remove, mudar plano)

### 2️⃣ Habilitar/Desabilitar (🔒/🔓)
- Vermelho 🔒 = Usuário ATIVO → Clique para DESABILITAR
- Verde 🔓 = Usuário INATIVO → Clique para HABILITAR
- Usuário desabilitado não consegue fazer login

### 3️⃣ Promover/Remover Admin (🛡️)
- Azul 🛡️ = Admin → Clique para REMOVER
- Cinza 🛡️ = Não-admin → Clique para PROMOVER
- ⚠️ Você NÃO pode remover suas próprias permissões

### 4️⃣ Mudar Plano (⚡)
- **Upgrade para Profissional** (botão gradiente azul)
  - Transforma Básico → Profissional
  - Usuário ganha acesso a TODAS as features Pro
  
- **Downgrade para Básico** (botão cinza)
  - Transforma Profissional → Básico
  - Usuário perde acesso aos features exclusivos Pro
  - ⚠️ Aves não são deletadas, apenas ficam sem acesso a features Pro

## Exemplos de Uso

### Exemplo 1: Liberar Acesso para Novo Usuário

```
1. Novo usuário se cadastra
2. Você vê ele na lista com status "Inativo"
3. Clique no ícone 🔓 (Unlock)
4. Status muda para "Ativo"
5. Usuário já pode fazer login e usar o sistema
```

### Exemplo 2: Promover Usuário a Administrador

```
1. Localize o usuário na tabela
2. Clique no ícone 👁️ (olho) para abrir modal
3. Clique em "Promover a Admin"
4. Aguarde a confirmação (toast verde)
5. Usuário agora tem acesso ao menu de Administração
```

### Exemplo 3: Desabilitar Usuário Problemático

```
1. Procure o usuário na tabela
2. Clique no ícone 🔒 (Lock/Cadeado)
3. Status muda para "Inativo"
4. Usuário é imediatamente desconectado
5. Não consegue mais fazer login
```

### Exemplo 4: Exportar Lista

```
1. Configure os filtros (se quiser)
2. Clique no botão "Exportar" no topo
3. Um arquivo CSV é baixado automaticamente
4. Arquivo contém: Nome, Plano, Aves, Status, Admin, Data
5. Abra no Excel/Google Sheets para análise
```

## Dicas Úteis

### Busca Eficiente
- ✅ Digite o início do nome: "Cria" encontra "Criatório XY"
- ✅ Use IDs: "abc" encontra usuário com ID "abc123"
- ✅ Busca é em tempo real, sem lag

### Filtros Inteligentes
- Filtrar por "Inativos" para ver quem não usa
- Ordenar por "Plano" para ver Profissionais primeiro
- Combinação: "Ativos" + "Básico" para ver users do plano básico

### Performance
- Tabela carrega em ~2 segundos
- Ações completam em ~500ms
- Modal abre instantaneamente

## Campos Explicados

| Campo | Significado |
|-------|-------------|
| **ID** | UUID único do usuário no Firebase |
| **Plano** | Básico ou Profissional |
| **Aves** | Total de aves cadastradas |
| **Status** | Ativo (verde) = Login permitido / Inativo (vermelho) = Login bloqueado |
| **Admin** | Sim = Tem acesso ao Portal Admin / Não = Não tem acesso |
| **Data Criação** | Quando se registrou na plataforma |

## Avisos & Cuidados

### ⚠️ Importante
- Uma vez desabilitado, usuário PERDE acesso imediato
- Admin se promove clicando um botão → Cuidado com cliques duplos!
- Exportação inclui dados sensíveis → Compartilhe com cuidado
- Não há "desfazer" → Tenha certeza antes de desabilitar

### ✅ Bom Saber
- Todas ações têm timestamp no Firestore
- Você pode habilitar novamente um usuário desabilitado
- Mudar admin não afeta dados dos usuários
- Usuários veem um aviso se estiverem desabilitados

## Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `Ctrl + F` | Busca na página (browser) |
| `Escape` | Fecha modal aberta |
| `Tab` | Navega pelos botões |

## Troubleshooting Rápido

### "Vejo a mensagem 'Carregando...' infinitamente"
- Recarregue a página (F5)
- Verifique sua conexão de internet
- Tente novamente em alguns segundos

### "Botões não respondendo"
- Aguarde terminar ação anterior (veja spinner)
- Clique uma única vez (não duplo-clique)
- Feche a modal se estiver aberta

### "Não vejo a seção de Admin"
- Você é realmente admin? Cheque Firestore
- Deslogue e faça login novamente
- Limpe cookies (Ctrl + Shift + Delete)

### "Erro ao exportar"
- Tente com menos filtros
- Exporte novamente sem atualizar página
- Verifique pop-up blocker do navegador

## 📊 Dados Visíveis

A tabela mostra:
- ✅ Nome do criador + UUID
- ✅ Plano (com cor: ouro para Pro, cinza para Básico)
- ✅ Quantidade de aves
- ✅ Status ativo/inativo (com ícone)
- ✅ Se é admin (com ícone)

## 🔐 Segurança

- ✅ Acesso restrito a admins (verificado no login)
- ✅ Ações são imediatas (sem buffer de espera)
- ✅ Timestamps registram quando cada ação foi feita
- ✅ Senha de usuário nunca é mostrada
- ✅ Dados sensíveis protegidos

## 📞 Precisa de Ajuda?

- 📧 Email: contato@avigestao.com.br
- 📚 Documentação completa: `PORTAL_ADMINISTRATIVO.md`
- 🔧 Implementação técnica: `ADMIN_IMPLEMENTATION_SUMMARY.md`

---

**Versão**: 1.0.0  
**Data**: Fevereiro 8, 2026  
**Status**: ✅ Produção  

Happy managing! 🎉
