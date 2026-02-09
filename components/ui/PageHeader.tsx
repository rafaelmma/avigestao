import React from 'react';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<Props> = ({ title, subtitle, actions }) => {
  return (
    <header
      className="flex items-start justify-between mb-6"
      role="banner"
      aria-labelledby="page-title"
    >
      <div>
        <h1 id="page-title" className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-slate-600 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2" role="toolbar" aria-label="Ações da página">
          {actions}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
