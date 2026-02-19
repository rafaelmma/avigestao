import React from 'react';
import { Bird, BreederSettings } from '../types';

interface PedigreeTreeProps {
  bird: Bird;
  allBirds: Bird[];
  settings: BreederSettings;
}

const PedigreeTreeNew: React.FC<PedigreeTreeProps> = ({ bird, allBirds, settings }) => {
  const accent = settings.accentColor || '#f97316';

  const getBirdById = (id?: string) => allBirds.find((b) => b.id === id);

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
      return { name: realBird.name, ring: realBird.ringNumber, sex: realBird.sex };
    }

    if (bird.manualAncestors && bird.manualAncestors[path]) {
      return { name: bird.manualAncestors[path], ring: '', sex: 'Desconhecido' };
    }

    const parentPath = path.slice(0, -1);
    if (parentPath) {
      const lastChar = path.slice(-1);
      const parentId = getAncestorId(parentPath);
      const parentBird = getBirdById(parentId);
      if (parentBird && parentBird.manualAncestors && parentBird.manualAncestors[lastChar]) {
        return { name: parentBird.manualAncestors[lastChar], ring: '', sex: 'Desconhecido' };
      }
    }

    return null;
  };

  // Sistema recursivo para detectar profundidade máxima
  const getMaxDepth = (
    path: string = '',
    currentDepth: number = 0,
    maxDepth: number = 10,
  ): number => {
    if (currentDepth >= maxDepth) return currentDepth; // Limite de segurança

    const data = resolveBirdData(path || 'self');
    if (path === 'self' || path === '') {
      // Verifica pai e mãe
      const fatherDepth =
        bird.fatherId || (bird.manualAncestors && bird.manualAncestors['f'])
          ? getMaxDepth('f', 1, maxDepth)
          : 0;
      const motherDepth =
        bird.motherId || (bird.manualAncestors && bird.manualAncestors['m'])
          ? getMaxDepth('m', 1, maxDepth)
          : 0;
      return Math.max(fatherDepth, motherDepth);
    }

    if (!data) return currentDepth - 1;

    // Verifica se tem filhos
    const fatherPath = path + 'f';
    const motherPath = path + 'm';
    const hasFather = resolveBirdData(fatherPath) !== null;
    const hasMother = resolveBirdData(motherPath) !== null;

    if (!hasFather && !hasMother) return currentDepth;

    const fatherDepth = hasFather
      ? getMaxDepth(fatherPath, currentDepth + 1, maxDepth)
      : currentDepth;
    const motherDepth = hasMother
      ? getMaxDepth(motherPath, currentDepth + 1, maxDepth)
      : currentDepth;

    return Math.max(fatherDepth, motherDepth);
  };

  // Função para gerar todas as gerações recursivamente
  // generateGenerations removed because it's not used in current rendering

  const BirdBox = ({
    data,
    showRing = true,
    generation = 1,
    isMain = false,
  }: {
    data: { name?: string; ring?: string; sex?: string } | null;
    showRing?: boolean;
    generation?: number;
    isMain?: boolean;
  }) => {
    // Tamanho adapta conforme a geração
    const sizes: {
      [key: number]: { w: string; text: string; ring: string; py: string; px: string };
    } = {
      0: { w: 'w-48', text: 'text-base', ring: 'text-xs', py: 'py-4', px: 'px-4' },
      1: { w: 'w-40', text: 'text-sm', ring: 'text-[10px]', py: 'py-3', px: 'px-3' },
      2: { w: 'w-32', text: 'text-xs', ring: 'text-[9px]', py: 'py-2', px: 'px-2' },
      3: { w: 'w-28', text: 'text-[11px]', ring: 'text-[8px]', py: 'py-1.5', px: 'px-2' },
      4: { w: 'w-24', text: 'text-[10px]', ring: 'text-[7px]', py: 'py-1.5', px: 'px-1.5' },
      5: { w: 'w-20', text: 'text-[9px]', ring: 'text-[6px]', py: 'py-1', px: 'px-1' },
    };

    const sizeKey = Math.min(generation, 5) as keyof typeof sizes;
    const size = sizes[sizeKey] || sizes[5];

    if (!data) {
      return (
        <div
          className={`${size.px} ${size.py} rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 ${size.text} text-gray-400 italic text-center ${size.w} shadow-sm`}
        >
          <div className="font-semibold truncate">—</div>
        </div>
      );
    }

    const isMale = data.sex === 'Macho';
    const isFemale = data.sex === 'Fêmea';

    const bgGradient = isMale
      ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'
      : isFemale
      ? 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)'
      : 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)';

    const shadowColor = isMale
      ? 'rgba(59, 130, 246, 0.3)'
      : isFemale
      ? 'rgba(236, 72, 153, 0.3)'
      : 'rgba(148, 163, 184, 0.3)';

    return (
      <div
        className={`${size.px} ${size.py} rounded-xl text-center ${
          size.w
        } shadow-lg transition-all hover:scale-105 hover:shadow-xl ${
          isMain ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
        }`}
        style={{
          background: bgGradient,
          boxShadow: `0 8px 20px ${shadowColor}, 0 4px 8px rgba(0,0,0,0.1)`,
        }}
      >
        <div
          className={`font-black ${size.text} text-white uppercase tracking-wide drop-shadow-md truncate`}
        >
          {data.name}
        </div>
        {showRing && data.ring && generation <= 2 && (
          <div className={`${size.ring} text-white/90 mt-0.5 font-bold drop-shadow truncate`}>
            {data.ring}
          </div>
        )}
        {generation <= 2 && (
          <div className={generation === 0 ? 'text-2xl' : 'text-lg'}>
            {isMale ? '♂' : isFemale ? '♀' : '○'}
          </div>
        )}
      </div>
    );
  };

  // Detecta automaticamente quantas gerações existem
  const maxDepth = getMaxDepth();

  // Renderiza uma linha de ancestrais recursivamente
  const renderAncestorLine = (parentPath: string, depth: number, label: string, color: string) => {
    if (depth > maxDepth) return null;

    const parentData = resolveBirdData(parentPath);
    const childrenPaths = [parentPath + 'f', parentPath + 'm'];
    const hasChildren = childrenPaths.some((p) => resolveBirdData(p) !== null);

    return (
      <div className="grid grid-cols-[200px_1fr] gap-4 items-center" key={parentPath}>
        <div className="flex flex-col items-center gap-2">
          {depth === 1 && <div className="text-xs font-bold uppercase text-gray-600">{label}</div>}
          <BirdBox data={parentData} showRing={depth === 1} generation={depth} />
        </div>

        {hasChildren && depth < maxDepth && (
          <div className="flex flex-col gap-3">
            {renderAncestorLine(parentPath + 'f', depth + 1, '', color)}
            {renderAncestorLine(parentPath + 'm', depth + 1, '', color)}
          </div>
        )}

        {!hasChildren && depth < maxDepth && (
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: Math.pow(2, maxDepth - depth) }).map((_, i) => (
              <BirdBox key={i} data={null} showRing={false} generation={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="printable-pedigree"
      className="print-active w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border-4 p-8 shadow-2xl print:p-4 relative overflow-hidden"
      style={{
        borderColor: accent,
        maxWidth: maxDepth <= 3 ? '1400px' : maxDepth <= 4 ? '1800px' : '2200px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
      }}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${accent} 0, ${accent} 1px, transparent 0, transparent 50%)`,
          backgroundSize: '10px 10px',
        }}
      ></div>

      {/* Header Premium */}
      <div
        className="relative flex items-center justify-between mb-8 pb-6 border-b-4"
        style={{ borderColor: accent }}
      >
        <div className="flex items-center gap-4">
          {settings.logoUrl && (
            <div
              className="h-20 w-20 rounded-2xl border-4 flex items-center justify-center overflow-hidden bg-white shadow-xl"
              style={{ borderColor: accent }}
            >
              <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain p-2 max-h-20 max-w-20" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg"
                style={{ backgroundColor: accent }}
              >
                Certificado
              </span>
              <span className="text-xs font-semibold text-gray-500">ID: {bird.ringNumber}</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {settings.breederName || 'Criatório Profissional'}
            </h1>
            <p className="text-sm font-bold uppercase text-gray-600 tracking-wide mt-1">
              🧬 Árvore Genealógica - {maxDepth + 1} Gerações
            </p>
          </div>
        </div>
        <div className="text-center">
          <div className="text-6xl mb-2" style={{ color: accent }}>
            {bird.sex === 'Fêmea' ? '♀' : '♂'}
          </div>
          <p
            className="text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full bg-white shadow-md"
            style={{ color: accent }}
          >
            {maxDepth + 1} Gerações
          </p>
        </div>
      </div>

      {/* Layout Principal Adaptativo */}
      <div className="relative grid grid-cols-[280px_1fr] gap-12 items-start py-8">
        {/* PÁSSARO PRINCIPAL */}
        <div className="flex flex-col items-center justify-center gap-4 sticky top-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
            <div
              className="relative px-6 py-3 rounded-2xl shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
                border: '3px solid white',
              }}
            >
              <span className="text-lg font-black uppercase tracking-widest text-white drop-shadow-lg">
                {bird.name}
              </span>
            </div>
          </div>
          <BirdBox
            data={{ name: bird.name, ring: bird.ringNumber, sex: bird.sex }}
            showRing={true}
            generation={0}
            isMain={true}
          />
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Pássaro Principal
          </div>
        </div>

        {/* ANCESTRAIS - Sistema Recursivo */}
        <div className="grid grid-rows-2 gap-10">
          {/* LADO PATERNO */}
          <div
            className="relative pl-8 border-l-4 rounded-l-3xl py-6"
            style={{
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.03)',
            }}
          >
            <svg
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4"
              width="32"
              height="32"
            >
              <line x1="0" y1="16" x2="32" y2="16" stroke="#3b82f6" strokeWidth="4" />
            </svg>

            <div className="mb-4 flex items-center gap-2">
              <div className="text-sm font-black uppercase text-blue-900 tracking-wider">
                👨 LADO PATERNO
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-blue-400 to-transparent"></div>
            </div>

            {renderAncestorLine('f', 1, 'Pai', '#3b82f6')}
          </div>

          {/* LADO MATERNO */}
          <div
            className="relative pl-8 border-l-4 rounded-l-3xl py-6"
            style={{
              borderColor: '#ec4899',
              backgroundColor: 'rgba(236, 72, 153, 0.03)',
            }}
          >
            <svg
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4"
              width="32"
              height="32"
            >
              <line x1="0" y1="16" x2="32" y2="16" stroke="#ec4899" strokeWidth="4" />
            </svg>

            <div className="mb-4 flex items-center gap-2">
              <div className="text-sm font-black uppercase text-pink-900 tracking-wider">
                👩 LADO MATERNO
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-pink-400 to-transparent"></div>
            </div>

            {renderAncestorLine('m', 1, 'Mãe', '#ec4899')}
          </div>
        </div>
      </div>

      {/* Rodapé Premium */}
      <div
        className="relative mt-10 pt-6 border-t-4 flex items-center justify-between"
        style={{ borderColor: accent }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md">
            <div
              className="w-5 h-5 rounded-full shadow-lg"
              style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}
            ></div>
            <span className="text-sm font-bold text-gray-700">Macho ♂</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-md">
            <div
              className="w-5 h-5 rounded-full shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' }}
            ></div>
            <span className="text-sm font-bold text-gray-700">Fêmea ♀</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            Gerado em {new Date().toLocaleDateString('pt-BR')}
          </p>
          <p className="text-sm font-black uppercase tracking-wider mt-1" style={{ color: accent }}>
            Certificado de Genealogia
          </p>
        </div>
      </div>
    </div>
  );
};

export default PedigreeTreeNew;
