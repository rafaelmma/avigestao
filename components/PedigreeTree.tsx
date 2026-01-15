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

const PedigreeTree: React.FC<PedigreeTreeProps> = ({ bird, allBirds, settings }) => {
  const primary = settings.primaryColor || '#10B981';
  const accent = settings.accentColor || '#F59E0B';
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

  const BirdBox = ({ path, gender, level }: { path: string; gender: 'M' | 'F'; level: number }) => {
    const data = resolveBirdData(path);
    const baseColor = gender === 'M' ? primary : accent;
    const bgColor = data ? hexToRgba(baseColor, 0.08) : '#F8FAFC';
    const borderColor = data ? baseColor : '#E2E8F0';
    const textColor = data ? baseColor : '#94A3B8';

    const padding = level > 3 ? 'py-0.5 px-2' : level > 2 ? 'py-1 px-2' : 'py-1.5 px-3';
    const nameSize = level > 3 ? 'text-[8px]' : level > 2 ? 'text-[9px]' : 'text-[11px]';
    const ringSize = level > 3 ? 'text-[7px]' : 'text-[8px]';

    return (
      <div
        className={`flex flex-col justify-center rounded-full border-2 shadow-sm w-full ${padding} min-h-[24px] h-full print:shadow-none`}
        style={{ borderColor, backgroundColor: bgColor }}
      >
        {data ? (
          <>
            <p className={`font-bold uppercase truncate leading-tight ${nameSize}`} style={{ color: textColor }}>
              {data.name}
            </p>
            {level < 4 && data.ring && (
              <p className={`${ringSize} text-slate-500 truncate leading-none opacity-80 mt-0.5`}>
                {data.ring}
              </p>
            )}
            {level < 3 && !data.isSystem && (
              <p className="text-[7px] text-slate-400 uppercase tracking-widest leading-none mt-0.5">Manual</p>
            )}
          </>
        ) : (
          <p className={`${nameSize} text-slate-300 italic text-center leading-none`}>Indefinido</p>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-full bg-white rounded-2xl border-2 p-4 shadow-sm print:p-3 print:rounded-none print:shadow-none print:border-2"
      style={{ borderColor: accent }}
    >
      <div className="flex items-center gap-4 border-b-2 pb-3 mb-4" style={{ borderColor: accent }}>
        <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center overflow-hidden" style={{ borderColor: accent }}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo do criatório" className="h-full w-full object-contain" />
          ) : (
            <div className="text-[10px] font-black uppercase text-slate-400">Logo</div>
          )}
        </div>

        <div className="flex-1 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: accent }}>
            Certificado
          </p>
          <h1 className="text-2xl font-black italic text-slate-900">
            {settings.breederName || 'Criatório'}
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Árvore Genealógica</p>
        </div>
      </div>

      <div className="rounded-2xl border-2 p-3" style={{ borderColor: accent }}>
        <div className="flex gap-2 min-w-[860px] h-[480px] items-stretch print:min-w-0 print:w-full print:h-[18cm]">
          <div className="flex flex-col justify-center w-32 shrink-0 print:w-1/6">
            <div
              className="border-2 p-2 rounded-2xl text-center shadow-sm print:shadow-none"
              style={{ borderColor: primary, backgroundColor: hexToRgba(primary, 0.08) }}
            >
              <p className="text-[9px] font-bold uppercase mb-1 tracking-widest" style={{ color: primary }}>
                Pássaro Alvo
              </p>
              <p className="font-black text-slate-800 text-xs truncate print:text-sm">{bird.name}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">{bird.ringNumber}</p>
            </div>
            <div className="mt-3 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border-2 flex items-center justify-center text-lg font-black" style={{ borderColor: accent, color: accent }}>
                {bird.sex === 'Fêmea' ? '♀' : '♂'}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-around w-32 shrink-0 py-8 gap-2 print:py-4 print:w-1/6">
            <div className="h-1/2 p-1"><BirdBox path="f" gender="M" level={1} /></div>
            <div className="h-1/2 p-1"><BirdBox path="m" gender="F" level={1} /></div>
          </div>

          <div className="flex flex-col justify-around w-32 shrink-0 py-4 gap-1 print:py-2 print:w-1/6">
            <div className="h-1/4 p-0.5"><BirdBox path="ff" gender="M" level={2} /></div>
            <div className="h-1/4 p-0.5"><BirdBox path="fm" gender="F" level={2} /></div>
            <div className="h-1/4 p-0.5"><BirdBox path="mf" gender="M" level={2} /></div>
            <div className="h-1/4 p-0.5"><BirdBox path="mm" gender="F" level={2} /></div>
          </div>

          <div className="flex flex-col justify-around w-28 shrink-0 py-2 gap-1 print:py-1 print:w-1/6">
            <div className="h-[12.5%]"><BirdBox path="fff" gender="M" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="ffm" gender="F" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="fmf" gender="M" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="fmm" gender="F" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="mff" gender="M" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="mfm" gender="F" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="mmf" gender="M" level={3} /></div>
            <div className="h-[12.5%]"><BirdBox path="mmm" gender="F" level={3} /></div>
          </div>

          <div className="flex flex-col justify-around w-24 shrink-0 py-1 gap-0.5 print:w-1/6">
            <BirdBox path="ffff" gender="M" level={4} />
            <BirdBox path="fffm" gender="F" level={4} />
            <BirdBox path="ffmf" gender="M" level={4} />
            <BirdBox path="ffmm" gender="F" level={4} />
            <BirdBox path="fmff" gender="M" level={4} />
            <BirdBox path="fmfm" gender="F" level={4} />
            <BirdBox path="fmmf" gender="M" level={4} />
            <BirdBox path="fmmm" gender="F" level={4} />
            <BirdBox path="mfff" gender="M" level={4} />
            <BirdBox path="mffm" gender="F" level={4} />
            <BirdBox path="mfmf" gender="M" level={4} />
            <BirdBox path="mfmm" gender="F" level={4} />
            <BirdBox path="mmff" gender="M" level={4} />
            <BirdBox path="mmfm" gender="F" level={4} />
            <BirdBox path="mmmf" gender="M" level={4} />
            <BirdBox path="mmmm" gender="F" level={4} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedigreeTree;
