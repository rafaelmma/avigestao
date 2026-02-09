import React from 'react';
import WizardLayout, { WizardStep } from './WizardLayout';

interface WizardShellProps {
  title: string;
  description?: string;
  steps?: string[];
  action?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
}

const WizardShell: React.FC<WizardShellProps> = ({
  title,
  description,
  steps = ['Resumo', 'Detalhes'],
  action,
  children,
  compact = true,
}) => {
  const wizardSteps: WizardStep[] = steps.map((label, index) => ({
    id: `step-${index}`,
    label,
    description: index === 0 ? description : undefined,
    content: children,
  }));

  return (
    <WizardLayout
      title={title}
      steps={wizardSteps}
      action={action}
      showSteps={!compact}
      showNavigation={!compact}
    />
  );
};

export default WizardShell;
