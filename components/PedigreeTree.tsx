import React from 'react';
import { Bird, BreederSettings } from '../types';

interface PedigreeTreeProps {
  bird: Bird;
  allBirds: Bird[];
  settings: BreederSettings;
}

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex) return `rgba(148, 163, 184, ${alpha})`;
  let normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    normalized = normalized.split('').map(ch => `${ch}${ch}`).join('');
  }
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darkenColor = (hex: string, percent: number) => {
  if (!hex) return '#475569';
  let normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    normalized = normalized.split('').map(ch => `${ch}${ch}`).join('');
  }
  if (normalized.length !== 6) return '#475569';
  const value = parseInt(normalized, 16);
  let r = (value >> 16) & 255;
  let g = (value >> 8) & 255;
  let b = value & 255;
  r = Math.floor(r * (1 - percent / 100));
  g = Math.floor(g * (1 - percent / 100));
  b = Math.floor(b * (1 - percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const PedigreeTree: React.FC<PedigreeTreeProps> = ({ bird, allBirds, settings }) => {
  const accent = settings.accentColor || '#d91e63';
  
  const getBirdById = (id?: string) => allBirds.find(b => b.id === id);

  const getAncestorId = (path: string): string | undefined => {
    if (!path) return undefined;
    if (path === 'f') return bird.fatherId;
    if (path === 'm') return bird.motherId;

    const parentPath = path.slice(0, -1);
    const lastChar = path.slice(-1);
    if (!parentPath) return undefined;

    const parentId = getAncestorId(parentPath);
    const parentBird = getBirdById(parentId);
    if (parentBird) {
      return lastChar === 'f' ? parentBird.fatherId : parentBird.motherId;
    }
    return undefined;
  };

  const resolveBirdData = (path: string) => {
    const ancestorId = getAncestorId(path);
    const realBird = getBirdById(ancestorId);

    if (realBird) {
      return { name: realBird.name, ring: realBird.ringNumber, isSystem: true };
    }

    if (bird.manualAncestors && bird.manualAncestors[path]) {
      return { name: bird.manualAncestors[path], ring: '', isSystem: false };
    }

    const parentPath = path.slice(0, -1);
    if (parentPath) {
      const lastChar = path.slice(-1);
      const parentId = getAncestorId(parentPath);
      const parentBird = getBirdById(parentId);
      if (parentBird && parentBird.manualAncestors && parentBird.manualAncestors[lastChar]) {
        return { name: parentBird.manualAncestors[lastChar], ring: '', isSystem: false };
      }
    }

    return null;
  };

  const BirdPill = ({ 
    data, 
    showRing = true, 
    generation = 0,
    sex 
  }: { 
    data: any; 
    showRing?: boolean; 
    generation?: number;
    sex?: 'Macho' | 'Fêmea' | 'Desconhecido';
  }) => {
    if (!data) {
      return (
        <div className="relative group">
          <div className="px-3 py-2 rounded-md border-2 border-dashed border-gray-300 bg-gray-50/50 text-[9px] text-gray-400 italic text-center min-w-[130px]">
            <div className="font-semibold">Indefinido</div>
          </div>
        </div>
      );
    }

    // Cores baseadas no sexo (estilo Sisga)
    const isMale = sex === 'Macho';
    const isFemale = sex === 'Fêmea';
    const bgColor = isMale ? '#93c5fd' : isFemale ? '#f9a8d4' : '#e2e8f0';
    const borderColor = isMale ? '#3b82f6' : isFemale ? '#ec4899' : '#94a3b8';
    const textColor = '#1e293b';

    return (
      <div className="relative group">
        <div 
          className="px-3 py-2 rounded-md border-2 text-center min-w-[130px] transition-all hover:scale-105 hover:shadow-lg font-bold text-[10px]"
          style={{ 
            backgroundColor: bgColor,
            borderColor: borderColor,
            color: textColor
          }}
        >
          <div className="uppercase tracking-wide truncate">
            {data.name}
          </div>
          {showRing && data.ring && (
            <div className="text-[8px] opacity-70 mt-0.5 font-semibold">
              {data.ring}
            </div>
          )}
        </div>
      </div>
    );
  };

  const TreeNode = ({ 
    data, 
    label, 
    generation = 0, 
    showRing = true,
    isParent = false 
  }: { 
    data: any; 
    label: string; 
    generation?: number; 
    showRing?: boolean;
    isParent?: boolean;
  }) => (
    <div className="flex flex-col items-start gap-2">
      {!isParent && (
        <div 
          className="text-[10px] font-black uppercase tracking-widest mb-1 px-2 py-1 rounded-md"
          style={{ 
            color: darkenColor(accent, 30),
            backgroundColor: hexToRgba(accent, 0.1)
          }}
        >
          {label}
        </div>
      )}
      <BirdPill data={data} showRing={showRing} generation={generation} />
    </div>
  );

  return (
    <div 
      className="w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl border-4 p-6 shadow-2xl print:p-4 print:rounded-lg print:shadow-lg relative overflow-hidden" 
      style={{ borderColor: accent, minHeight: '600px', maxWidth: '1400px', margin: '0 auto' }}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ 
        backgroundImage: `radial-gradient(circle at 2px 2px, ${accent} 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Header Compacto para Paisagem */}
      <div className="relative z-10 flex items-center justify-between mb-6 pb-4 border-b-2" style={{ borderColor: hexToRgba(accent, 0.3) }}>
        <div className="flex items-center gap-4">
          <div 
            className="h-16 w-16 rounded-xl border-4 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg bg-white relative"
            style={{ borderColor: accent }}
          >
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: accent }}></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: accent }}></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: accent }}></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: accent }}></div>
            
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="text-xs font-black text-gray-300">LOGO</div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
              Certificado
            </p>
            <h1 className="text-2xl font-black text-gray-900 leading-none mt-0.5">
              {settings.breederName || 'Criatório'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 mt-1 flex items-center gap-2">
              <span className="inline-block w-4 h-0.5" style={{ backgroundColor: accent }}></span>
              Árvore Genealógica
            </p>
          </div>
        </div>

        <div className="text-right">
          <div 
            className="text-5xl font-black opacity-20 leading-none"
            style={{ color: accent }}
          >
            {bird.sex === 'Fêmea' ? '♀' : '♂'}
          </div>
          <p className="text-[9px] text-gray-500 mt-1">4 Gerações</p>
        </div>
      </div>

      {/* Layout HORIZONTAL para Paisagem */}
      <div className="relative z-10 flex gap-8 items-start">
        {/* Coluna ESQUERDA - Lado Paterno */}
        <div className="flex-1">
          <div 
            className="text-[10px] font-black uppercase tracking-widest mb-4 px-3 py-1.5 rounded-lg inline-block"
            style={{ 
              color: 'white',
              backgroundColor: accent
            }}
          >
            Lado Paterno
          </div>

          {/* PAI */}
          <div className="mb-6">
            <TreeNode data={resolveBirdData('f')} label="PAI" generation={1} showRing={true} />
          </div>

          {/* Avós Paternos */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <TreeNode data={resolveBirdData('ff')} label="Avô Paterno" generation={2} showRing={false} />
              {/* Bisavós */}
              <div className="ml-2 flex flex-col gap-2 mt-2">
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('fff')} showRing={false} generation={3} /></div>
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('ffm')} showRing={false} generation={3} /></div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <TreeNode data={resolveBirdData('fm')} label="Avó Paterna" generation={2} showRing={false} />
              {/* Bisavós */}
              <div className="ml-2 flex flex-col gap-2 mt-2">
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('fmf')} showRing={false} generation={3} /></div>
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('fmm')} showRing={false} generation={3} /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna CENTRO - Pássaro Principal */}
        <div className="flex flex-col items-center justify-center px-6" style={{ minWidth: '200px' }}>
          <div className="relative">
            <div 
              className="absolute -inset-4 rounded-2xl opacity-20 blur-xl"
              style={{ backgroundColor: accent }}
            ></div>
            <div className="relative transform scale-110">
              <TreeNode data={{ name: bird.name, ring: bird.ringNumber }} label={bird.name} generation={0} isParent={true} />
            </div>
          </div>
          
          {/* Setas indicando linhagem */}
          <div className="flex gap-8 mt-6">
            <div className="flex flex-col items-center">
              <div className="text-xl opacity-30" style={{ color: accent }}>←</div>
              <p className="text-[8px] text-gray-500 font-bold mt-1">PATERNO</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xl opacity-30" style={{ color: accent }}>→</div>
              <p className="text-[8px] text-gray-500 font-bold mt-1">MATERNO</p>
            </div>
          </div>
        </div>

        {/* Coluna DIREITA - Lado Materno */}
        <div className="flex-1">
          <div 
            className="text-[10px] font-black uppercase tracking-widest mb-4 px-3 py-1.5 rounded-lg inline-block"
            style={{ 
              color: 'white',
              backgroundColor: accent
            }}
          >
            Lado Materno
          </div>

          {/* MÃE */}
          <div className="mb-6">
            <TreeNode data={resolveBirdData('m')} label="MÃE" generation={1} showRing={true} />
          </div>

          {/* Avós Maternos */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <TreeNode data={resolveBirdData('mf')} label="Avô Materno" generation={2} showRing={false} />
              {/* Bisavós */}
              <div className="ml-2 flex flex-col gap-2 mt-2">
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('mff')} showRing={false} generation={3} /></div>
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('mfm')} showRing={false} generation={3} /></div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <TreeNode data={resolveBirdData('mm')} label="Avó Materna" generation={2} showRing={false} />
              {/* Bisavós */}
              <div className="ml-2 flex flex-col gap-2 mt-2">
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('mmf')} showRing={false} generation={3} /></div>
                <div className="scale-90 origin-left"><BirdPill data={resolveBirdData('mmm')} showRing={false} generation={3} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Compacto */}
      <div className="relative z-10 mt-6 pt-3 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }}></div>
            <span className="font-semibold">Principal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hexToRgba(accent, 0.4) }}></div>
            <span>Ascendentes</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black uppercase tracking-widest text-[8px]" style={{ color: accent }}>
            Árvore Genealógica
          </p>
        </div>
      </div>
    </div>
  );
};

export default PedigreeTree;
