# 🛡️ Portal Administrativo AviGestão

## Visão Geral

O Portal Administrativo é um painel exclusivo para administradores do sistema que permite gerenciar usuários, controlar acessos e visualizar métricas da plataforma.

## 🎯 Funcionalidades Principais

### 1. **Gerenciamento de Usuários**
- ✅ Listar todos os usuários cadastrados
- ✅ Buscar usuários por nome ou ID
- ✅ Filtrar por status (Ativo/Inativo)
- ✅ Ordenar por data, nome ou plano

### 2. **Ações Administrativas**
Cada usuário pode ter as seguintes ações executadas:

#### 🔓 Habilitar/Desabilitar Acesso
- **Desabilitar**: Impede que um usuário acesse a plataforma
- **Habilitar**: Restaura o acesso de um usuário desabilitado
- Status é imediatamente atualizado no banco de dados

#### 👑 Promover/Remover Admin
- **Promover a Admin**: Concede permissões administrativas ao usuário
- **Remover Admin**: Revoga permissões administrativas
- ⚠️ Você não pode remover suas próprias permissões de admin

### 3. **Visualizar Detalhes do Usuário**
Clique no ícone de olho (👁️) para abrir uma modal com:
- Nome do criatório
- ID único do usuário
- Plano (Básico/Profissional)
- Quantidade de aves
- Status (Ativo/Inativo)
- Data de membro desde
- Último acesso
- Status de admin

### 4. **Exportar Dados**
Exporte a lista filtrada de usuários em formato CSV:
- Incluir nome, plano, aves, status, admin, data de criação
- Arquivo nomeado com data atual

## 📍 Como Acessar

### Para Administradores:
1. Faça login na plataforma
2. Abra a Sidebar (menu lateral)
3. Procure pela seção **"Administração"**
4. Clique em **"Gerenciar Usuários"**

### Permissões Necessárias:
- Você deve ter `isAdmin: true` no seu documento de usuário no Firestore

## 🔍 Filtros e Busca

### Busca Rápida
- Digite o nome do criador ou o ID do usuário
- A busca é em tempo real

### Filtros Disponíveis
1. **Status**: Todos / Ativos / Inativos
2. **Ordenação**: 
   - Por Data (recentes primeiro)
   - Por Nome (A-Z)
   - Por Plano (Profissional primeiro)

## 🗄️ Estrutura do Banco de Dados

### Documento de Usuário (`users/{userId}`)
```typescript
{
  isAdmin: boolean;           // Indica se é admin
  disabled: boolean;          // Indica se está desabilitado
  createdAt: Timestamp;       // Data de criação
  updatedAt: Timestamp;       // Última atualização
  plan: string;               // Plano do usuário
  trialEndDate?: string;      // Data fim do teste (se houver)
  subscriptionStatus?: string; // Status da assinatura
  lastLogin?: string;         // Último acesso
}
```

### Settings do Usuário (`users/{userId}/settings/preferences`)
```typescript
{
  breederName: string;  // Nome do criatório
  plan: string;         // Plano (Básico/Profissional)
  logoUrl?: string;     // Logo do criatório
  // ... outros campos
}
```

### Aves do Usuário (`users/{userId}/birds/{birdId}`)
```typescript
{
  id: string;
  breederId: string;
  name: string;
  species: string;
  // ... dados do pássaro
}
```

## 📊 Tabela de Usuários

| Coluna | Descrição |
|--------|-----------|
| **Criador** | Nome do criatório + ID do usuário |
| **Plano** | Básico ou Profissional (com cor) |
| **Aves** | Quantidade total de aves cadastradas |
| **Status** | Ativo (verde) ou Inativo (vermelho) |
| **Admin** | Indicador se é administrador |
| **Ações** | Botões de: Ver detalhes, Toggle status, Toggle admin |

## ⚡ Ações Rápidas

### Na tabela:
- 👁️ **Ver Detalhes**: Abre modal com informações completas
- 🔒/🔓 **Lock/Unlock**: Desabilita/habilita acesso (cor âmbar)
- 🛡️ **Shield**: Promove/remove admin (cor azul ou vermelho)

### Na modal de detalhes:
Acesso às mesmas ações com interface mais intuitiva

## 🔐 Segurança

### Proteção de Dados
- ✅ Apenas usuários com `isAdmin: true` podem acessar
- ✅ Verificação no App.tsx com `checkIfUserIsAdmin()`
- ✅ Operações limitadas (não pode deletar usuários permanentemente)

### Restrições Importantes
- ⚠️ Você NÃO pode remover suas próprias permissões de admin
- ⚠️ Usuários desabilitados não podem fazer login
- ⚠️ Todas as ações são registradas no timestamp `updatedAt`

## 🚀 Recursos Futuros

### Planejado para próximas versões:
- [ ] Deletar usuários permanentemente (com confirmação dupla)
- [ ] Editar dados do usuário (nome do criatório, email, etc)
- [ ] Enviar notificações para usuários
- [ ] Visualizar histórico de ações (auditoria)
- [ ] Gráficos de estatísticas de usuários
- [ ] Gestão de quotas e limites de uso
- [ ] Exportar em outros formatos (Excel, PDF)

## 📝 Exemplos de Uso

### Exemplo 1: Desabilitar um usuário
1. Localize o usuário na tabela
2. Clique no ícone 🔒 (Lock) na coluna Ações
3. Status muda de "Ativo" para "Inativo"
4. Usuário não consegue mais fazer login

### Exemplo 2: Promover um usuário a admin
1. Abra a modal clicando no ícone 👁️
2. Clique em "Promover a Admin"
3. O usuário agora tem acesso ao portal administrativo
4. Seção "Administração" aparece na sidebar dele

### Exemplo 3: Exportar lista de usuários
1. Configure os filtros desejados
2. Clique no botão "Exportar"
3. Um arquivo CSV é baixado com a data atual

## 🐛 Troubleshooting

### "Erro ao carregar usuários"
- Verifique conexão com a internet
- Verifique permissões do Firestore
- Tente recarregar a página (F5)

### "Não consigo ver o menu de Admin"
- Você é administrador? Verifique o Firestore
- Deslogue e faça login novamente
- Limpe o cache do navegador

### "Ação não completou"
- Verifique sua conexão
- Tente novamente em alguns segundos
- Recarregue a página se o problema persistir

## 📞 Suporte

Para reportar problemas ou solicitar novos recursos, entre em contato com: **contato@avigestao.com.br**

---

**Última atualização**: Fevereiro de 2026  
**Versão**: 1.0.0  
**Desenvolvido com ❤️ para AviGestão**
