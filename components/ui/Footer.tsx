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
      className="border-t border-slate-300 bg-white p-6 text-sm text-slate-700 shadow-md"
      role="contentinfo"
      aria-label="Rodapé do site"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold text-slate-800">© {new Date().getFullYear()} AviGestão</div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onContactClick}
            className="text-slate-700 hover:text-blue-600 font-medium bg-transparent border-none cursor-pointer"
            aria-label="Contato"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            Contato
          </button>
          <a
            href="/about"
            onClick={handleNavigate('/about')}
            className="text-slate-700 hover:text-blue-600 font-medium"
            aria-label="Sobre o AviGestão"
          >
            Sobre
          </a>
          <a
            href="/privacy"
            onClick={handleNavigate('/privacy')}
            className="text-slate-700 hover:text-blue-600 font-medium"
            aria-label="Política de privacidade"
          >
            Privacidade
          </a>
          <a
            href="/terms"
            onClick={handleNavigate('/terms')}
            className="text-slate-700 hover:text-blue-600 font-medium"
            aria-label="Termos de uso"
          >
            Termos de Uso
          </a>
          <span className="text-xs text-slate-500">v{pkg.version}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
