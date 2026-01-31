import React from 'react';
import { Bird } from '../types';
import Badge from './ui/Badge';
import Card from './ui/Card';
import AlertBanner from './ui/AlertBanner';
import { getStatusBadgeVariant } from '../lib/designSystem';

interface BirdInfoSectionProps {
  bird: Bird;
  isEditing?: boolean;
  onPhotoClick?: () => void;
}

export const calculateAge = (birthDate: string | Date): string => {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return `${age} ano${age !== 1 ? 's' : ''}`;
};

const BirdInfoSection: React.FC<BirdInfoSectionProps> = ({ 
  bird, 
  isEditing = false,
  onPhotoClick 
}) => {
  const photoUrl = bird.photoUrl || `https://via.placeholder.com/200?text=${encodeURIComponent(bird.name)}`;

  return (
    <div className="space-y-6">
      {/* Layout: Foto + Info Básica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Foto */}
        <div className="flex justify-center">
          <button
            onClick={onPhotoClick}
            className="group relative"
            type="button"
          >
            <img 
              src={photoUrl}
              alt={bird.name}
              className="w-48 h-48 rounded-2xl object-cover shadow-md group-hover:shadow-lg transition-shadow"
            />
            {isEditing && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/40 rounded-2xl transition-all">
                <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">Alterar</span>
              </div>
            )}
          </button>
        </div>

        {/* Info Básica */}
        <div className="md:col-span-2 space-y-4">
          {/* Nome e Anilha */}
          <div>
            <label className="text-caption text-slate-500">Nome</label>
            <p className="text-h3 font-bold mt-1">{bird.name}</p>
          </div>

          <div>
            <label className="text-caption text-slate-500">Anilha</label>
            <p className="text-body-lg font-semibold mt-1">{bird.ringNumber}</p>
          </div>

          {/* Grid: Espécie e Sexo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption text-slate-500">Espécie</label>
              <p className="text-body font-medium mt-1">{bird.species}</p>
            </div>
            <div>
              <label className="text-caption text-slate-500">Sexo</label>
              <p className="text-body font-medium mt-1">{bird.sex}</p>
            </div>
          </div>

          {/* Grid: Data Nascimento e Idade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption text-slate-500">Nascimento</label>
              <p className="text-body font-medium mt-1">
                {bird.birthDate ? new Date(bird.birthDate as string | Date).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-caption text-slate-500">Idade</label>
              <p className="text-body font-medium mt-1">
                {bird.birthDate ? calculateAge(bird.birthDate as string | Date) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status e Classificação */}
      <Card>
        <h4 className="text-h4 mb-4 font-bold">Status</h4>
        <div className="flex flex-wrap gap-3">
          <Badge 
            variant={getStatusBadgeVariant(bird.status)} 
            size="lg"
          >
            {bird.status}
          </Badge>
          
          {bird.classification && (
            <Badge variant="info" size="lg">
              {bird.classification}
            </Badge>
          )}
          
          {bird.songTrainingStatus && bird.songTrainingStatus !== 'Não Iniciado' && (
            <Badge variant="info" size="lg">
              {bird.songTrainingStatus}
            </Badge>
          )}

          {bird.sexing?.resultDate && (
            <Badge variant="success" size="lg">
              ✓ Sexada
            </Badge>
          )}
        </div>
      </Card>

      {/* IBAMA Status */}
      {bird.ibamaBaixaData && (
        <AlertBanner variant="success" title="✓ Registrado IBAMA">
          <div className="space-y-1 text-sm">
            <p><strong>Data:</strong> {new Date(bird.ibamaBaixaData).toLocaleDateString('pt-BR')}</p>
          </div>
        </AlertBanner>
      )}
      
      {bird.ibamaBaixaPendente && (
        <AlertBanner variant="warning" title="⚠️ Registro Pendente">
          <p className="text-sm">Esta ave ainda não foi registrada no sistema IBAMA.</p>
        </AlertBanner>
      )}

      {/* Genealogia (sumário) */}
      {(bird.fatherId || bird.motherId) && (
        <Card>
          <h4 className="text-h4 mb-3 font-bold">Genealogia</h4>
          <div className="grid grid-cols-2 gap-4">
            {bird.fatherId && (
              <div>
                <label className="text-caption text-slate-500">Pai</label>
                <p className="text-body font-medium mt-1">Informação disponível</p>
              </div>
            )}
            {bird.motherId && (
              <div>
                <label className="text-caption text-slate-500">Mãe</label>
                <p className="text-body font-medium mt-1">Informação disponível</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BirdInfoSection;
