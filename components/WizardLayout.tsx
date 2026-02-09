import React, { useState } from 'react';

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  content: React.ReactNode;
}

interface WizardLayoutProps {
  title?: string;
  steps: WizardStep[];
  initialStep?: number;
  action?: React.ReactNode;
  activeStep?: number;
  onStepChange?: (step: number) => void;
  showSteps?: boolean;
  showNavigation?: boolean;
}

const WizardLayout: React.FC<WizardLayoutProps> = ({
  title,
  steps,
  initialStep = 0,
  action,
  activeStep,
  onStepChange,
  showSteps = true,
  showNavigation = true,
}) => {
  const [internalStep, setInternalStep] = useState(() =>
    Math.min(Math.max(initialStep, 0), Math.max(steps.length - 1, 0)),
  );
  const currentStep = typeof activeStep === 'number' ? activeStep : internalStep;
  const setStep = (next: number) => {
    if (onStepChange) onStepChange(next);
    if (typeof activeStep !== 'number') setInternalStep(next);
  };

  if (!steps.length) return null;

  const current = steps[currentStep];

  const goPrev = () => setStep(Math.max(0, currentStep - 1));
  const goNext = () => setStep(Math.min(steps.length - 1, currentStep + 1));

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            {title && <h2 className="text-lg font-black text-slate-900">{title}</h2>}
            {showSteps && (
              <div className="flex flex-wrap gap-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setStep(index)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                      index === currentStep
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            )}
            {current?.description && (
              <p className="text-xs text-slate-500 font-medium">{current.description}</p>
            )}
          </div>
          {action && <div className="flex items-center justify-end">{action}</div>}
        </div>
        {showNavigation && (
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              Voltar
            </button>
            <div className="text-[11px] text-slate-400 font-semibold">
              Etapa {currentStep + 1} de {steps.length}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={currentStep === steps.length - 1}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Próximo
            </button>
          </div>
        )}
      </div>

      <div>{current?.content}</div>
    </div>
  );
};

export default WizardLayout;
