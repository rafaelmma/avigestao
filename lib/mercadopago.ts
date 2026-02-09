import { getAuth } from 'firebase/auth';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
const PRIMARY_FUNCTIONS_URL = metaEnv?.VITE_FUNCTIONS_URL || 'https://api.avigestao.com.br';
const FALLBACK_FUNCTIONS_URL =
  metaEnv?.VITE_FUNCTIONS_FALLBACK_URL || 'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net';

const postJson = async (
  baseUrl: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
) => {
  const res = await fetch(`${baseUrl}/${path}`, {
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
    throw { status: res.status, message: msg };
  }

  return parsedData;
};

const requestWithFallback = async (path: string, token: string, body?: Record<string, unknown>) => {
  const isTestHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('web.app') ||
      window.location.hostname.includes('localhost'));
  const primaryFirst = isTestHost ? FALLBACK_FUNCTIONS_URL : PRIMARY_FUNCTIONS_URL;
  const secondary = isTestHost ? PRIMARY_FUNCTIONS_URL : FALLBACK_FUNCTIONS_URL;

  try {
    return await postJson(primaryFirst, path, token, body);
  } catch (err: unknown) {
    const status = typeof err === 'object' && err !== null ? (err as Record<string, unknown>)['status'] : undefined;
    if (typeof status === 'number' && status < 500) {
      throw err;
    }
    return await postJson(secondary, path, token, body);
  }
};

export async function iniciarPagamentoMercadoPago(payload: {
  planId: string;
  planLabel: string;
  price: number;
  months: number;
}) {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) throw new Error('Usuário não autenticado');

  const token = await user.getIdToken();
  const data = (await requestWithFallback('createMercadoPagoCheckout', token, payload)) as {
    url?: string;
    error?: string;
  };

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Erro ao abrir pagamento PIX');
  }
}
