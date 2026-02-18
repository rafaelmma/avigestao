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
  console.log('Fazendo requisição:', { url, hasBody: !!body });

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
    console.error('Erro na requisição:', { status: res.status, msg });
    throw { status: res.status, message: msg };
  }

  return parsedData;
};

export async function assinarPlano(priceId: string) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) throw new Error('Usuário não autenticado');

    const token = await user.getIdToken();

    console.log('Iniciando checkout Stripe:', { priceId, userId: user.uid });

    const data = (await postJson(FUNCTIONS_URL, 'createCheckoutSession', token, { priceId })) as {
      url?: string;
      error?: string;
    };

    console.log('Resposta Stripe:', data);

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Erro ao criar sessão de checkout');
    }
  } catch (error: any) {
    console.error('Erro ao assinar plano:', error);
    throw new Error(error.message || 'Erro ao processar pagamento com Stripe');
  }
}

export async function abrirPortalCliente() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error('Usuário não autenticado');

  const token = await user.getIdToken();

  const data = (await postJson(FUNCTIONS_URL, 'createPortalSession', token)) as {
    url?: string;
    error?: string;
  };
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Erro ao abrir portal');
  }
}

export async function verificarAssinatura() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return { isActive: false };

  const token = await user.getIdToken();

  return await postJson(FUNCTIONS_URL, 'getSubscriptionStatus', token);
}
