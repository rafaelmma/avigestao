# 🏆 Sistema de Torneios - AviGestão

## O que é?

O Sistema de Torneios permite criar, gerenciar e participar de competições de pássaros. É uma plataforma pública onde qualquer criador autenticado pode criar torneios e outros podem se inscrever diretamente com seus pássaros.

---

## Como Funciona?

### 1️⃣ **Quem Pode Criar Torneios?**

✅ **Qualquer usuário LOGADO** pode criar torneios
- Não precisa ser admin
- Basta estar autenticado no sistema
- Você se torna o "organizador" do torneio que criar

### 2️⃣ **Processo de Criação**

1. **Acesse**: Menu → "Gerenciar Torneios"
2. **Clique**: Botão "+ Criar Torneio"
3. **Preencha**:
   - **Nome**: Ex: "Copa de Canto 2026"
   - **Descrição**: Detalhes do torneio
   - **Data Início/Fim**: Período do evento
   - **Espécies Permitidas**: Curió, Bicudo, Coleiro, etc.
   - **Status**: Próximo / Em Andamento / Finalizado
   - **Max Participantes**: Limite de inscrições
   - **Organizador**: Nome da entidade ou pessoa responsável
   - **Número de Etapas**: Quantas fases o torneio terá
   - **Endereço Completo**: Local do evento
   - **Cidade/Estado**: Localização
   - **Regras**: (Opcional) Regulamento detalhado

4. **Salve**: Sistema mostra "Torneio salvo com sucesso!"

### 3️⃣ **Visualização Pública na Tela Inicial**

✅ **Torneios aparecem SEM precisar login!**
- Widget no Dashboard mostra próximos 3 torneios
- Mostra: Nome, data, local, organizador, espécies
- Botão "Inscrever-se" disponível
- Link "Ver todos" leva para lista completa

### 4️⃣ **Como o Usuário Se Inscreve?**

#### Processo de Inscrição (3 passos):

1. **Ver Torneio**
   - Dashboard inicial (sem login) mostra torneios públicos
   - Ou acesse "Gerenciar Torneios" para ver todos

2. **Clicar "Inscrever-se"**
   - Sistema verifica se está logado
   - Se não: pede login
   - Se sim: abre modal de inscrição

3. **Selecionar Pássaro**
   - Sistema filtra automaticamente seus pássaros
   - Mostra apenas pássaros das espécies permitidas
   - Ex: Se torneio é só Curió, mostra apenas seus Curiós
   - Selecione o pássaro e confirme

**Pronto!** Inscrição realizada ✅

#### Validações Automáticas:
- ✅ Verifica se usuário está logado
- ✅ Filtra pássaros compatíveis com espécies do torneio
- ✅ Impede inscrição sem pássaro compatível
- ✅ Salva: Nome do pássaro, espécie, criador, data

### 5️⃣ **O Que Acontece Depois da Criação?**

#### Para o Organizador (Quem Criou):
- ✏️ Pode editar o torneio (ícone lápis)
- 🗑️ Pode deletar o torneio (ícone lixeira)
- 👥 Pode visualizar inscritos
- 📊 Pode gerenciar classificação e resultados

#### Para Outros Usuários:
- 👀 Podem VER o torneio (público no dashboard)
- 📝 Podem SE INSCREVER com seus pássaros
- 🔔 Veem organizador, local e número de etapas
- ❌ NÃO podem editar/deletar (só o criador pode)

### 6️⃣ **Gerenciamento de Inscrições**

O organizador pode:
- Ver lista de todos os inscritos
- Ver detalhes: Nome do criador, ave inscrita, data de registro
- Adicionar colocação (1º, 2º, 3º lugar)
- Adicionar pontuação
- Remover inscrição (se necessário)

### 7️⃣ **Visualização Pública**

**SEM LOGIN necessário:**
- ✅ Dashboard inicial mostra próximos 3 torneios
- ✅ Card com: Nome, descrição, data, local
- ✅ Organizador e número de etapas visíveis
- ✅ Espécies permitidas em chips
- ✅ Botão "Inscrever-se" (pede login se não estiver)

**Informações Visíveis:**
- Nome do torneio
- Descrição curta
- Data início
- Cidade/Estado
- Organizador
- Limite de participantes
- Espécies permitidas

**Para se inscrever**: Login obrigatório

---

## Regras do Firestore

### Permissões de Segurança:

```javascript
// Torneios (coleção raiz)
tournaments/{tournamentId}
  ✅ Qualquer pessoa pode LER
  ✅ Usuários autenticados podem CRIAR
  ✅ Apenas o CRIADOR pode EDITAR/DELETAR

// Inscrições (coleção raiz)
tournament_inscriptions/{inscriptionId}
  ✅ Qualquer pessoa pode LER
  ✅ Usuários autenticados podem SE INSCREVER
  ✅ Apenas o DONO pode EDITAR/DELETAR sua inscrição
```

---

## Estrutura de Dados

### Torneio:
```typescript
{
  id: "abc123",
  name: "Copa de Canto 2026",
  description: "Torneio regional de canto",
  startDate: "2026-03-01",
  endDate: "2026-03-15",
  species: ["Curió", "Bicudo"],
  status: "upcoming",
  createdBy: "uid_do_usuario",
  createdAt: "2026-02-05",
  maxParticipants: 50,
  rules: "Regras detalhadas...",
  
  // NOVOS CAMPOS:
  organizer: "Associação de Criadores ABC",
  numberOfStages: 3,
  address: "Rua das Aves, 123",
  city: "São Paulo",
  state: "SP"
}
```

### Inscrição:
```typescript
{
  id: "xyz789",
  tournamentId: "abc123",
  userId: "uid_do_criador",
  userName: "Rafael Silva",
  birdName: "Curió Campeão",
  birdId: "bird_123",
  birdSpecies: "Curió", // NOVO: espécie do pássaro
  registeredAt: "2026-02-10",
  status: "registered",
  placement: 1,
  score: 95.5
}
```

---

## Feedback Visual

### Estados do Botão:
- **Salvando...**: Durante o salvamento (botão desabilitado)
- **✅ Torneio salvo com sucesso!**: Caixa verde após salvar
- **❌ Erro ao salvar**: Caixa vermelha se houver problema

### Mensagens de Erro:
- "Você precisa estar logado para criar torneios!" → Se não estiver autenticado
- "Erro ao salvar torneio. Verifique sua conexão." → Se falhar salvamento

---

## Casos de Uso

### 1. Associação de Criadores
Uma associação pode:
- Criar torneios oficiais
- Gerenciar inscrições
- Publicar resultados
- Criar regulamentos

### 2. Criador Individual
Um criador pode:
- Criar desafio entre amigos
- Organizar mini-torneios locais
- Compartilhar com comunidade

### 3. Participante
Um participante pode:
- Ver torneios disponíveis
- Se inscrever em competições
- Acompanhar resultados

---

## Próximas Funcionalidades

### ✅ Implementado:
- [x] Widget público de torneios no dashboard (SEM login)
- [x] Sistema de inscrição com seleção de pássaro
- [x] Filtro automático por espécie compatível
- [x] Campos: endereço, organizador, número de etapas
- [x] Validação de login para inscrição
- [x] Feedback visual de sucesso/erro

### Em Desenvolvimento:
- [ ] Notificações de novos torneios
- [ ] Ranking geral de criadores
- [ ] Histórico de participações do pássaro
- [ ] Sistema de categorias/divisões
- [ ] Upload de fotos das aves inscritas
- [ ] Edição de inscrição pelo próprio criador
- [ ] Limite de inscrições por torneio

### Modo Associação (Futuro):
- [ ] Tipo de conta especial para associações
- [ ] Torneios oficiais vs amistosos
- [ ] Sistema de validação de membros
- [ ] Certificados digitais

---

## Como Testar?

### 1. Criar Torneio:
1. Acesse: https://avigestao-cf5fe.web.app
2. Faça login com sua conta
3. Menu → "Gerenciar Torneios"
4. Clique "+ Criar Torneio"
5. Preencha TODOS os campos (nome, descrição, datas, local, organizador, etc)
6. Selecione espécies permitidas
7. Clique "Salvar Torneio"
8. Aguarde mensagem de sucesso ✅

### 2. Ver Torneio na Tela Inicial:
1. Saia do sistema (ou abra aba anônima)
2. Acesse: https://avigestao-cf5fe.web.app
3. **SEM fazer login**, você verá o widget "Próximos Torneios"
4. O torneio criado deve aparecer lá!

### 3. Inscrever-se no Torneio:
1. Faça login
2. Na tela inicial, veja o widget de torneios
3. Clique "Inscrever-se" no torneio desejado
4. Selecione um pássaro compatível (espécie deve coincidir)
5. Clique "Confirmar Inscrição"
6. Aguarde mensagem de sucesso ✅

### 4. Verificar Inscrição:
1. Menu → "Gerenciar Torneios"
2. Clique no ícone 👥 "Inscritos" do torneio
3. Sua inscrição deve aparecer na lista!

**Importante**: Se não aparecer, pressione F5 para recarregar.

---

## Problemas Resolvidos

### ❌ Problema Anterior:
- Torneios não estavam sendo salvos no Firebase
- Regras do Firestore estavam incorretas
- Faltava capturar usuário autenticado

### ✅ Solução Aplicada:
- ✔️ Regras do Firestore atualizadas
- ✔️ Código captura `auth.currentUser`
- ✔️ Feedback visual de erro/sucesso
- ✔️ Deploy completo realizado

---

## Suporte

Se encontrar problemas:
1. Verifique se está logado
2. Veja o console do navegador (F12)
3. Recarregue a página (F5)
4. Teste com dados simples primeiro

**Status**: ✅ Totalmente funcional e implantado!
