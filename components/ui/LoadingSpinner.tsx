import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'dark',
  text,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colorClasses = {
    dark: 'border-slate-300 border-t-slate-900',
    light: 'border-white/30 border-t-white',
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`
          ${sizeClasses[size]} border-2 ${colorClasses[variant]} 
          rounded-full animate-spin
        `}
      />
      {text && (
        <p className={`text-sm ${variant === 'dark' ? 'text-slate-600' : 'text-white'}`}>{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
