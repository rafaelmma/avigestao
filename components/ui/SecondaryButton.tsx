import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const SecondaryButton: React.FC<Props> = ({ children, className = '', ...rest }) => {
  return (
    <button
      {...rest}
      className={`px-3 py-2 bg-slate-100 text-slate-800 rounded-lg font-semibold hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
};

export default SecondaryButton;
