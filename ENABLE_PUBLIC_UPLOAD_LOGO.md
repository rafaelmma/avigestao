# Como Permitir Invocação Pública da Função uploadLogo

A função está retornando 403 porque não tem permissão de invocação pública. Siga estes passos:

## Opção 1: Google Cloud Console (Recomendado)

1. Acesse: https://console.cloud.google.com/
2. Selecione o projeto: **avigestao** (ID: avigestao-cf5fe)
3. Navegue para: **Cloud Run** (não "Cloud Functions")
4. Procure por: **uploadLogo**
5. Clique na função
6. Na aba **Segurança** (ou **Security**)
7. Clique em **Adicionar Associação de Política de IAM** (Add IAM Policy Binding)
8. Configure:
   - **Membros / Members**: `allUsers` ou `Principal type: Everyone`
   - **Função / Role**: `Cloud Run Invoker`
9. Clique em **Salvar / Save**

## Opção 2: Usando gcloud (se instalado)

```bash
gcloud run services add-iam-policy-binding uploadLogo \
  --region=southamerica-east1 \
  --member=allUsers \
  --role=roles/run.invoker
```

## Após adicionar permissão:

1. Teste o preflight novamente:
```bash
curl.exe -i -X OPTIONS `
  -H "Origin: https://avigestao.com.br" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: authorization,content-type" `
  https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net/uploadLogo
```

2. Esperado: **HTTP/1.1 204 No Content** com headers CORS

## Se ainda der 403 após adicionar permissão:

- Aguarde 1-2 minutos para o IAM propagar
- Tente fazer um deploy da função novamente: `firebase deploy --only functions:uploadLogo`
- Limpe cache do navegador (Ctrl+Shift+Delete)
