import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false,
  interactive = false,
  onClick 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white border border-slate-200 rounded-xl p-6 shadow-sm
        ${hover ? 'hover:shadow-md hover:border-slate-300 transition-all' : ''}
        ${interactive ? 'cursor-pointer hover:shadow-md transition-all' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
