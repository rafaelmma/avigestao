
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Erro crítico ao iniciar aplicação:", err);
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#64748b;">
        <h2 style="color:#ef4444;margin-bottom:10px;">Erro ao carregar</h2>
        <p>Verifique o console do desenvolvedor para mais detalhes.</p>
        <pre style="margin-top:20px;background:#f1f5f9;padding:15px;border-radius:8px;font-size:12px;">${err}</pre>
      </div>
    `;
  }
} else {
  console.error("Elemento raiz 'root' não encontrado.");
}
