import React from 'react';
import { X } from 'lucide-react';

interface BadgeProps {
  variant: 'status' | 'warning' | 'success' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  pulse?: boolean;
  onClose?: () => void;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ 
  variant, 
  size = 'sm', 
  icon, 
  children, 
  pulse = false,
  onClose,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide rounded-full flex-shrink-0';
  
  const variantClasses = {
    status: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-blue-100 text-blue-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-slate-100 text-slate-600',
    neutral: 'bg-slate-50 text-slate-500'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };
  
  const animationClasses = pulse ? 'animate-pulse' : '';
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${animationClasses} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-shrink-0">{children}</span>
      {onClose && (
        <button 
          onClick={onClose} 
          className="ml-1 hover:opacity-70 transition-opacity flex-shrink-0"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

export default Badge;
