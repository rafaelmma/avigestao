import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const PrimaryButton: React.FC<Props> = ({ children, className = '', ...rest }) => {
  return (
    <button
      {...rest}
      className={`px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg shadow-indigo-200 ${className}`}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
