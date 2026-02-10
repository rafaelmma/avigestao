import React, { useEffect, useRef } from 'react';
import pkg from '../../package.json';

interface FooterProps {
  onContactClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onContactClick }) => {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      const height = footerRef.current?.offsetHeight ?? 72;
      document.documentElement.style.setProperty('--app-footer-height', `${height}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleNavigate = (path: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleContato = (event: React.MouseEvent) => {
    event.preventDefault();
    if (onContactClick) {
      onContactClick();
      return;
    }
    window.location.href = 'mailto:contato@avigestao.com.br';
  };

  return (
    <footer
      ref={footerRef}
      className="fixed bottom-0 left-0 right-0 w-full border-t border-slate-200 bg-white/95 p-4 text-sm text-slate-600 backdrop-blur lg:left-64 lg:w-[calc(100%-16rem)]"
      role="contentinfo"
      aria-label="Rodapé do site"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} AviGestão</div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="mailto:contato@avigestao.com.br"
            onClick={handleContato}
            className="text-slate-600 hover:underline"
            aria-label="Contato"
          >
            Contato
          </a>
          <a
            href="/about"
            onClick={handleNavigate('/about')}
            className="text-slate-600 hover:underline"
            aria-label="Sobre o AviGestão"
          >
            Sobre
          </a>
          <a
            href="/privacy"
            onClick={handleNavigate('/privacy')}
            className="text-slate-600 hover:underline"
            aria-label="Política de privacidade"
          >
            Privacidade
          </a>
          <a
            href="/terms"
            onClick={handleNavigate('/terms')}
            className="text-slate-600 hover:underline"
            aria-label="Termos de uso"
          >
            Termos de Uso
          </a>
          <span className="text-xs text-slate-400">v{pkg.version}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
