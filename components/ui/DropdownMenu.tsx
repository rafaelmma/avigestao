import React, { useState, useRef, useEffect } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validItems = items.filter(Boolean) as MenuItem[];

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex items-center"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Menu de ações"
          className={`
            absolute top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg 
            shadow-lg z-50 animate-in fade-in slide-in-from-top-2 
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {validItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              {item.divider && idx > 0 && <div className="border-t border-slate-100" />}
              <button
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-2.5 text-sm font-medium flex items-center gap-2 
                  hover:bg-slate-50 text-left transition-colors
                  ${idx === 0 ? 'rounded-t-lg' : ''}
                  ${idx === validItems.length - 1 ? 'rounded-b-lg' : ''}
                  ${item.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'}
                `}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
