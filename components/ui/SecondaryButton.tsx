import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const SecondaryButton: React.FC<Props> = ({ children, className = '', ...rest }) => {
  return (
    <button
      {...rest}
      className={`px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 shadow-sm ${className}`}
    >
      {children}
    </button>
  );
};

export default SecondaryButton;
