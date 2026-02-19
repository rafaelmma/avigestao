// Design System Tokens - Fonte única de verdade para UI
// Define cores, espaçamento, tipografia

export const designTokens = {
  colors: {
    // Primary Colors
    primary: '#0f172a', // Slate 900
    primaryLight: '#1e293b', // Slate 800

    // Semantic Colors
    success: '#059669', // Emerald 600
    successLight: '#d1fae5', // Emerald 100
    warning: '#d97706', // Amber 600
    warningLight: '#fef3c7', // Amber 100
    danger: '#dc2626', // Red 600
    dangerLight: '#fee2e2', // Red 100
    info: '#2563eb', // Blue 600
    infoLight: '#dbeafe', // Blue 100

    // Neutral Scale
    neutral: '#64748b', // Slate 500
    neutralLight: '#f1f5f9', // Slate 100
    neutralLighter: '#f8fafc', // Slate 50

    // Status Colors
    active: '#059669',
    inactive: '#64748b',
    pending: '#d97706',
  },

  spacing: {
    xs: '4px', // 0.25rem
    sm: '8px', // 0.5rem
    md: '12px', // 0.75rem
    lg: '16px', // 1rem
    xl: '24px', // 1.5rem
    '2xl': '32px', // 2rem
    '3xl': '48px', // 3rem
  },

  typography: {
    display: { size: '36px', weight: 700, lineHeight: '1.2' },
    h1: { size: '32px', weight: 700, lineHeight: '1.2' },
    h2: { size: '28px', weight: 700, lineHeight: '1.3' },
    h3: { size: '24px', weight: 600, lineHeight: '1.3' },
    h4: { size: '20px', weight: 600, lineHeight: '1.4' },
    bodyLg: { size: '16px', weight: 400, lineHeight: '1.5' },
    body: { size: '14px', weight: 400, lineHeight: '1.5' },
    bodySm: { size: '12px', weight: 400, lineHeight: '1.5' },
    label: { size: '14px', weight: 500, lineHeight: '1.4' },
    caption: { size: '12px', weight: 500, lineHeight: '1.4', textTransform: 'uppercase' },
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '32px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },

  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
};

// Helpers para uso em componentes
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    Ativo: designTokens.colors.success,
    Óbito: designTokens.colors.danger,
    Doado: designTokens.colors.info,
    Transferência: designTokens.colors.info,
    Fuga: designTokens.colors.warning,
  };
  return statusMap[status] || designTokens.colors.neutral;
};

export const getStatusBadgeVariant = (
  status: string,
): 'success' | 'danger' | 'warning' | 'info' | 'neutral' => {
  const variantMap: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
    Ativo: 'success',
    Óbito: 'danger',
    Doado: 'info',
    Transferência: 'info',
    Fuga: 'warning',
  };
  return variantMap[status] || 'neutral';
};
