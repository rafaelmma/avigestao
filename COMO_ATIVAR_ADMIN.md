# 👑 Como Configurar seu Primeiro Admin

## 🎯 Objetivo
Transformar seu usuário em administrador para acessar o Portal Administrativo.

## ⚠️ Aviso Importante
Você precisa ter acesso ao **Firebase Console** para executar este processo.

---

## Passo 1: Acesse o Firebase Console

1. Vá para [https://console.firebase.google.com](https://console.firebase.google.com)
2. Faça login com sua conta Google
3. Selecione o projeto: **avigestao-cf5fe**
4. Clique em **"Firestore Database"** no menu esquerdo

## Passo 2: Navegue até sua coleção de usuários

1. Na coluna esquerda, clique em **"Data"**
2. Procure pela coleção **"users"**
3. Você verá uma lista de documentos com IDs (esses são os UIDs dos usuários)

## Passo 3: Encontre seu usuário

1. **Copie seu ID de usuário** (você pode encontrar em):
   - Console do navegador (F12): `console.log(session.user.id)`
   - Ou procurando por data de criação na lista

2. Clique no documento com seu ID

## Passo 4: Adicione o campo `isAdmin`

1. No documento aberto, clique em **"Adicionar campo"** (ou **"+ Add field"**)
2. Preencha os dados:
   - **Nome do campo**: `isAdmin`
   - **Tipo**: Boolean
   - **Valor**: Marque ✅ (true)

3. Clique em **"Salvar"** ou pressione Enter

## Passo 5: Recarregue a aplicação

1. Volte para a aplicação AviGestão
2. Pressione **F5** para recarregar
3. Você verá a seção **"Administração"** na sidebar

## ✅ Pronto!

Agora você pode:
- ✅ Acessar o Portal Administrativo
- ✅ Gerenciar outros usuários
- ✅ Habilitar/desabilitar acessos
- ✅ Promover outros admins

---

## Alternativa: Usar Cloud Functions (Avançado)

Se preferir via terminal/código:

```bash
# 1. Abra o Cloud Functions console
# https://console.cloud.google.com/functions

# 2. Procure pela função: makeUserAdmin
# (Se não existir, você pode chamar via API)

# 3. Use o curl para chamar:
curl -X POST https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net/makeUserAdmin \
  -H "Content-Type: application/json" \
  -d '{"userId": "SEU_UID_AQUI", "token": "SEU_TOKEN_AQUI"}'
```

---

## 🔍 Verificar se Funcionou

### Método 1: Sidebar
1. Faça logout
2. Faça login novamente
3. Procure por "Administração" na sidebar
4. Se vir o menu, está funcionando! ✅

### Método 2: Console do Navegador
1. Pressione F12
2. Abra a aba "Console"
3. Digite: `console.log(window.isAdmin || 'Não é admin')`
4. Se vir `true`, você é admin! ✅

### Método 3: Firestore
1. Volte ao Firebase Console
2. Verifique se o campo `isAdmin: true` está lá

---

## Promover Outros Admins (Fácil!)

Agora que você é admin:

1. Abra o Portal Administrativo
2. Busque o usuário que quer promover
3. Clique no ícone 👁️ (olho)
4. Clique em **"Promover a Admin"**
5. Pronto! Esse usuário agora é admin

---

## 🆘 Deu Erro?

### Erro: "Campo não aparece no Firestore"
- Recarregue a página do Firestore
- Verifique se salvou corretamente
- Tente novamente

### Erro: "Não vejo a seção de Admin"
- O campo foi salvo como `isAdmin` (minúsculo)?
- Aguarde 30 segundos (pode ter cache)
- Limpe o cache: Ctrl + Shift + Delete
- Faça logout e login novamente

### Erro: "isAdmin: true não aparece"
- Verifique o tipo: deve ser **Boolean**, não String
- Remova o campo e recrie como Boolean

---

## 📸 Passo a Passo com Imagens

### Passo 2-3: Abra a coleção users
```
Firebase Console
  ↓
Firestore Database (Data)
  ↓
Coleção: users
  ↓
Documento: SEU_ID_AQUI
```

### Passo 4: Adicione campo
```
[Documento aberto]
  ↓
[Botão: Adicionar campo]
  ↓
Nome: isAdmin
Tipo: Boolean
Valor: ✅ (marcado)
  ↓
[Salvar]
```

### Passo 5: Resultado esperado
```
{
  isAdmin: true,
  createdAt: Timestamp(...),
  plan: "Básico",
  ...outros campos
}
```

---

## 🎓 Conceitos Importantes

### O que é `isAdmin`?
É um campo booleano que indica se o usuário é administrador.
- `true` = É admin, tem acesso ao portal
- `false` ou ausente = Não é admin, não vê o menu

### Onde é verificado?
1. **No login** (`App.tsx`): `checkIfUserIsAdmin(userId)`
2. **Na sidebar** (condicional): Mostra "Administração" se `isAdmin === true`
3. **Na página admin**: Só carrega dados se for admin

### Segurança
- ✅ Apenas admins veem o menu
- ✅ Só admins conseguem abrir a página
- ✅ Firestore poderia ter RLS rules adicionais

---

## 📝 Checklist Rápido

- [ ] Acessei Firebase Console
- [ ] Encontrei meu documento em `users/{meuUID}`
- [ ] Adicionei o campo `isAdmin`
- [ ] Defini como Boolean: `true`
- [ ] Salvei as alterações
- [ ] Recarreguei a aplicação (F5)
- [ ] Vejo "Administração" na sidebar
- [ ] Consigo abrir "Gerenciar Usuários"

---

## 🚀 Próximas Ações

Agora que você é admin:

1. **Explorar o portal**
   - Visite `Gerenciar Usuários`
   - Procure por usuários
   - Teste os filtros

2. **Promover mais admins**
   - Habilite acesso para outro admin
   - Teste a funcionalidade

3. **Exportar dados**
   - Teste a exportação para CSV
   - Abra o arquivo no Excel

---

## 💡 Dica Pro

Se precisar fazer isso para múltiplos usuários, você pode:

1. Criar uma **Cloud Function** específica
2. Chamar via endpoint HTTP
3. Automatizar com scripts

Exemplo de função:
```typescript
exports.promoteToAdmin = functions
  .https.onRequest(async (req, res) => {
    const userId = req.body.userId;
    const token = req.body.token;
    
    if (token !== 'sua-senha-aqui') {
      return res.status(403).send('Unauthorized');
    }
    
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({ isAdmin: true });
      
    res.json({ success: true });
  });
```

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:

1. **Verifique o tipo do campo**: Deve ser Boolean, não String
2. **Recarregue**: F5 e deslogue/faça login novamente
3. **Limpe cache**: Ctrl + Shift + Delete
4. **Verifique UID**: Tem certeza que está no doc correto?

Entre em contato: **contato@avigestao.com.br**

---

**Parabéns! Você é agora administrador da AviGestão!** 🎉

Bem-vindo ao Portal Administrativo. Use com responsabilidade!

---

**Última atualização**: Fevereiro 8, 2026  
**Versão**: 1.0.0
