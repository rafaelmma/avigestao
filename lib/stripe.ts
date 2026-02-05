import { getAuth } from 'firebase/auth';

// Usar domínio customizado para produção
const FUNCTIONS_URL = 'https://api.avigestao.com.br';

export async function assinarPlano(priceId: string) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) throw new Error('Usuário não autenticado');
  
  const token = await user.getIdToken();
  
  const res = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ priceId })
  });

  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Erro ao criar sessão de checkout');
  }
}

export async function abrirPortalCliente() {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) throw new Error('Usuário não autenticado');
  
  const token = await user.getIdToken();
  
  const res = await fetch(`${FUNCTIONS_URL}/createPortalSession`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await res.json();
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
  
  const res = await fetch(`${FUNCTIONS_URL}/getSubscriptionStatus`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  return await res.json();
}

