import React, { useState } from 'react';
import { X, Edit2, Save } from 'lucide-react';
import { Bird } from '../types';
import Tabs, { TabItem } from './ui/Tabs';
import BirdInfoSection from './BirdInfoSection';
import AlertBanner from './ui/AlertBanner';

interface BirdDetailModalProps {
  bird: Bird | null;
  isOpen: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onSave?: (bird: Bird) => Promise<void>;
  onDelete?: (birdId: string) => void;
  children?: React.ReactNode; // Para conteúdo customizado por aba
}

const BirdDetailModal: React.FC<BirdDetailModalProps> = ({
  bird,
  isOpen,
  isEditing = false,
  onClose,
  onEdit,
  onSave,
  children,
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !bird) return null;

  const tabs: TabItem[] = [
    {
      id: 'info',
      label: 'Informações',
      badge: undefined,
    },
    {
      id: 'genealogy',
      label: 'Genealogia',
      badge: undefined,
    },
    {
      id: 'documents',
      label: 'Documentos',
      badge: undefined,
    },
    {
      id: 'history',
      label: 'Histórico',
      badge: undefined,
    },
  ];

  const handleSave = async () => {
    if (onSave && bird) {
      setIsSaving(true);
      try {
        await onSave(bird);
        setIsSaving(false);
      } catch (error) {
        setIsSaving(false);
        console.error('Erro ao salvar:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-h2 font-bold text-slate-900">{bird.name}</h2>
              <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-mono font-bold">
                ID: {bird.id}
              </span>
              {bird.isPublic ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Público
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Privado
                </span>
              )}
            </div>
            <p className="text-body-sm text-slate-600 mt-1">
              {bird.ringNumber} • {bird.species}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && onEdit && (
              <button
                onClick={onEdit}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                title="Editar"
              >
                <Edit2 size={20} className="text-slate-600" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              title="Fechar"
            >
              <X size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === 'info' && <BirdInfoSection bird={bird} isEditing={isEditing} />}

          {activeTab === 'genealogy' && (
            <div className="space-y-4">
              <AlertBanner variant="info">
                Informações de genealogia serão exibidas aqui
              </AlertBanner>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <AlertBanner variant="info">Documentos e mídias serão exibidos aqui</AlertBanner>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <AlertBanner variant="info">Histórico de movimentos será exibido aqui</AlertBanner>
            </div>
          )}

          {children && <div>{children}</div>}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3 bg-slate-50 justify-end">
          <button onClick={onClose} className="btn-secondary px-6" disabled={isSaving}>
            Cancelar
          </button>

          {isEditing && onSave && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary px-6 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BirdDetailModal;
