export async function assinarPlano(priceId: string) {
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId })
  });

  const data = await res.json();
  window.location.href = data.url;
}
