import React from 'react';
import pkg from '../../package.json';

const Footer: React.FC = () => {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 w-full border-t border-slate-200 bg-white/95 p-4 text-sm text-slate-600 backdrop-blur lg:left-64"
      role="contentinfo"
      aria-label="Rodapé do site"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div>© {new Date().getFullYear()} AviGestão</div>
        <div className="flex items-center gap-4">
          <a
            href="mailto:contato@avigestao.com.br"
            className="text-slate-600 hover:underline"
            aria-label="Contato"
          >
            Contato
          </a>
          <a
            href="/about"
            className="text-slate-600 hover:underline"
            aria-label="Sobre o AviGestão"
          >
            Sobre
          </a>
          <a
            href="/privacy"
            className="text-slate-600 hover:underline"
            aria-label="Política de privacidade"
          >
            Privacidade
          </a>
          <span className="text-xs text-slate-400">v{pkg.version}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
