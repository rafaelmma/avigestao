import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, side = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2'
  };

  const arrowClasses = {
    top: 'top-full border-t-slate-700',
    right: 'right-full border-r-slate-700',
    bottom: 'bottom-full border-b-slate-700',
    left: 'left-full border-l-slate-700'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <div
          className={`absolute z-50 bg-slate-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap ${positionClasses[side]}`}
        >
          {text}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[side]}`}
          />
        </div>
      )}
    </div>
  );
};

export const HelpIcon: React.FC<{ tooltip: string }> = ({ tooltip }) => (
  <Tooltip text={tooltip}>
    <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 ml-1" />
  </Tooltip>
);

export default Tooltip;
