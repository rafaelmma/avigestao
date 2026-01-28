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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${isDangerous ? 'bg-red-100' : 'bg-blue-100'}`}>
            {isDangerous ? (
              <Trash2 className="text-red-600" size={20} />
            ) : (
              <AlertCircle className="text-blue-600" size={20} />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>

        {/* Warning text for dangerous actions */}
        {isDangerous && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-700 font-semibold text-center">
              ⚠️ Esta ação não pode ser desfeita
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${
              isDangerous 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {isLoading ? 'Processando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
