/**
 * Utilitário de logging que oculta erros técnicos em produção
 * Somente loga erros em modo de desenvolvimento
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Verifica se um erro é relacionado a permissões do Firestore/Firebase
 */
const isPermissionError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  return (
    errorMessage.includes('permission') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('Missing or insufficient') ||
    errorCode.includes('permission-denied') ||
    errorCode === 'permission-denied'
  );
};

/**
 * Loga erro apenas em desenvolvimento
 * Erros de permissão são sempre ocultados
 */
export const logError = (message: string, error?: any) => {
  // Sempre ocultar erros de permissão
  if (error && isPermissionError(error)) {
    return;
  }
  
  // Em produção, não logar erros técnicos
  if (!isDevelopment) {
    return;
  }
  
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
};

/**
 * Loga warning apenas em desenvolvimento
 */
export const logWarning = (message: string, data?: any) => {
  if (!isDevelopment) {
    return;
  }
  
  if (data) {
    console.warn(message, data);
  } else {
    console.warn(message);
  }
};

/**
 * Loga informação apenas em desenvolvimento
 */
export const logInfo = (message: string, data?: any) => {
  if (!isDevelopment) {
    return;
  }
  
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

/**
 * Sempre loga (usado para info crítica que deve aparecer em produção)
 */
export const logAlways = (message: string, data?: any) => {
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};
