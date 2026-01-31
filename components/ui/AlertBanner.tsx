import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, X } from 'lucide-react';

interface AlertBannerProps {
  variant: 'success' | 'warning' | 'danger' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ 
  variant, 
  title, 
  children, 
  onClose,
  icon,
  className = ''
}) => {
  const variantClasses = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800 border-l-emerald-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 border-l-amber-600',
    danger: 'bg-red-50 border-red-200 text-red-800 border-l-red-600',
    info: 'bg-blue-50 border-blue-200 text-blue-800 border-l-blue-600'
  };

  const iconMap = {
    success: <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />,
    danger: <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />,
    info: <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
  };

  return (
    <div className={`border-l-4 px-4 py-3 rounded-r-lg flex gap-3 ${variantClasses[variant]} ${className}`}>
      {icon || iconMap[variant]}
      <div className="flex-1">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          className="text-current hover:opacity-60 flex-shrink-0 transition-opacity"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
