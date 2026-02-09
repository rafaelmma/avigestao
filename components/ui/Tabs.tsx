import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  badgeVariant?: 'danger' | 'warning' | 'info';
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'line' | 'pill';
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, variant = 'line' }) => {
  const badgeColorClasses = {
    danger: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  if (variant === 'pill') {
    return (
      <div
        className="flex gap-2 p-2 bg-slate-100 rounded-lg w-fit"
        role="tablist"
        aria-label="Abas"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.id}`}
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`
                px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap flex items-center gap-2
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    badgeColorClasses[tab.badgeVariant || 'info']
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Abas">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.id}`}
              onClick={() => !tab.disabled && onChange(tab.id)}
              disabled={tab.disabled}
              className={`
                px-4 py-3 text-sm font-semibold whitespace-nowrap flex items-center gap-2
                border-b-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }
              `}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    badgeColorClasses[tab.badgeVariant || 'info']
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
