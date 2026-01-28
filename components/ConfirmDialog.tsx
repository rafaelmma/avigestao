import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous = false,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 animate-in fade-in scale-95">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-2xl ${isDangerous ? 'bg-rose-100' : 'bg-blue-100'}`}>
            {isDangerous ? (
              <Trash2 className="text-rose-600" size={24} />
            ) : (
              <AlertCircle className="text-blue-600" size={24} />
            )}
          </div>
          <button
            onClick={onCancel}
            className="ml-auto p-2 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-slate-900 mb-3">{title}</h2>

        {/* Message */}
        <p className="text-base text-slate-600 mb-8 leading-relaxed">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 btn-elderly-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 ${isDangerous ? 'btn-elderly-danger' : 'btn-elderly-primary'} ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Processando...' : confirmText}
          </button>
        </div>

        {/* Warning text for dangerous actions */}
        {isDangerous && (
          <p className="text-xs text-rose-600 font-bold mt-4 text-center uppercase tracking-widest">
            ⚠️ Esta ação não pode ser desfeita
          </p>
        )}
      </div>
    </div>
  );
};

export default ConfirmDialog;
