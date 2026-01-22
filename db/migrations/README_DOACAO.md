# 🔄 Migração: Adicionar "Doação" às Movimentações

## Problema
Quando você marca uma ave como "Doado" (🟣) e o sistema tenta criar uma movimentação automática, pode dar erro se o banco de dados não aceitar o tipo "Doação".

## Solução
Execute o SQL no Supabase para atualizar a constraint da tabela `movements`.

## Como Executar

### 1. Acesse o Supabase
1. Vá para https://app.supabase.com
2. Selecione seu projeto **avigestao**
3. Clique em **SQL Editor** (ícone de terminal na sidebar esquerda)

### 2. Execute a Migração
1. Clique em **+ New query**
2. Copie o conteúdo do arquivo `003_add_doacao_to_movements.sql`
3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)

### 3. Verifique
Após executar, tente:
1. Marcar uma ave como "Doado" (🟣) no plantel
2. O sistema deve criar automaticamente uma movimentação tipo "Doação"
3. Verificar se aparece na aba de Movimentações

## O que o SQL faz?
- Remove qualquer constraint antiga de tipo
- Adiciona nova constraint que aceita: 'Óbito', 'Fuga', 'Transporte', 'Venda', **'Doação'**

## Nota
Se você já tiver movimentações criadas manualmente e salvou como "Doado" ou outro nome, elas podem continuar no banco mas o TypeScript agora espera "Doação".
