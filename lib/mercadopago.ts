import { getAuth } from 'firebase/auth';

// Use Cloud Functions URL directly (already has CORS configured)
const FUNCTIONS_URL = 'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net';

const postJson = async (
  baseUrl: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
) => {
  const url = `${baseUrl}/${path}`;
  console.log('Fazendo requisição MercadoPago:', { url, hasBody: !!body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let parsedData: unknown = {};
  if (raw) {
    try {
      parsedData = JSON.parse(raw);
    } catch {
      parsedData = { error: raw };
    }
  }

  if (!res.ok) {
    const msg =
      typeof parsedData === 'object' && parsedData !== null
        ? ((parsedData as Record<string, unknown>)['error'] as string | undefined) || String(parsedData)
        : String(parsedData);
    console.error('Erro na requisição MercadoPago:', { status: res.status, msg });
    throw { status: res.status, message: msg };
  }

  return parsedData;
};

export async function iniciarPagamentoMercadoPago(payload: {
  planId: string;
  planLabel: string;
  price: number;
  months: number;
}) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) throw new Error('Usuário não autenticado');

    const token = await user.getIdToken();

    console.log('Iniciando checkout MercadoPago:', payload);

    const data = (await postJson(FUNCTIONS_URL, 'createMercadoPagoCheckout', token, payload)) as {
      url?: string;
      preferenceId?: string;
      error?: string;
    };

    console.log('Resposta MercadoPago:', data);

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Erro ao abrir pagamento MercadoPago');
    }
  } catch (error: any) {
    console.error('Erro ao iniciar pagamento MercadoPago:', error);
    throw new Error(error.message || 'Erro ao processar pagamento com MercadoPago');
  }
}
