
import React from 'react';
import { Bird, BreederSettings } from '../types';

interface PedigreeTreeProps {
  bird: Bird;
  allBirds: Bird[];
  settings: BreederSettings;
}

const PedigreeTree: React.FC<PedigreeTreeProps> = ({ bird, allBirds, settings }) => {
  const getBirdById = (id?: string) => allBirds.find(b => b.id === id);

  /**
   * Tenta encontrar o pássaro via ID recursivamente.
   * Se a cadeia de IDs quebrar, retorna undefined.
   */
  const getAncestorId = (path: string): string | undefined => {
    if (!path) return undefined;
    if (path === 'f') return bird.fatherId;
    if (path === 'm') return bird.motherId;

    const parentPath = path.slice(0, -1);
    const lastChar = path.slice(-1);
    
    // Evita recursão infinita se o path for inválido
    if (!parentPath) return undefined;

    const parentId = getAncestorId(parentPath);
    const parentBird = getBirdById(parentId);

    if (parentBird) {
      return lastChar === 'f' ? parentBird.fatherId : parentBird.motherId;
    }
    return undefined;
  };

  /**
   * Resolve o nome a ser exibido:
   * 1. Se existe um ID vinculado e o pássaro existe no sistema -> Nome do pássaro.
   * 2. Busca Manual Direta (no pássaro atual).
   * 3. Busca Manual Herdada (no pai/mãe cadastrado).
   */
  const resolveBirdData = (path: string) => {
    // 1. Tenta via ID (Automático)
    const ancestorId = getAncestorId(path);
    const realBird = getBirdById(ancestorId);

    if (realBird) {
      return { name: realBird.name, ring: realBird.ringNumber, isSystem: true };
    }

    // 2. Busca Manual Direta (no pássaro atual)
    // Ex: bird.manualAncestors['ff']
    if (bird.manualAncestors && bird.manualAncestors[path]) {
      return { name: bird.manualAncestors[path], ring: '', isSystem: false };
    }

    // 3. Busca Manual Herdada
    // Verifica se temos um caminho pai válido antes de buscar
    const parentPath = path.slice(0, -1);
    if (parentPath) {
      const lastChar = path.slice(-1); // 'f' ou 'm'
      const parentId = getAncestorId(parentPath);
      const parentBird = getBirdById(parentId);
      
      // Se o pai existe no sistema, veja se ELE tem o manualAncestors preenchido para o pai dele
      if (parentBird && parentBird.manualAncestors && parentBird.manualAncestors[lastChar]) {
         return { name: parentBird.manualAncestors[lastChar], ring: '', isSystem: false };
      }
    }

    return null;
  };

  const BirdBox = ({ path, gender, level }: { path: string, gender: 'M' | 'F', level: number }) => {
    const data = resolveBirdData(path);
    
    const bgColor = gender === 'M' ? 'bg-blue-50 border-blue-200 print:bg-blue-50' : 'bg-pink-50 border-pink-200 print:bg-pink-50';
    const textColor = gender === 'M' ? 'text-blue-900' : 'text-pink-900';
    
    const padding = level > 3 ? 'py-0.5 px-0.5' : level > 2 ? 'py-1 px-1' : 'py-1 px-2';
    const nameSize = level > 3 ? 'text-[7px]' : level > 2 ? 'text-[8px]' : 'text-[10px]';
    const ringSize = level > 3 ? 'text-[6px]' : 'text-[8px]';

    return (
      <div className={`flex flex-col justify-center border rounded-md shadow-sm w-full transition-all ${data ? bgColor : 'bg-slate-50 border-slate-100 print:bg-slate-50'} ${padding} min-h-[24px] h-full print:border-slate-300`}>
        {data ? (
          <>
            <p className={`font-bold uppercase truncate leading-tight ${nameSize} ${textColor}`}>
              {data.name}
            </p>
            {level < 4 && data.ring && (
              <p className={`${ringSize} text-slate-500 truncate leading-none opacity-80 mt-0.5`}>
                {data.ring}
              </p>
            )}
             {level < 3 && !data.isSystem && (
              <p className="text-[6px] text-slate-400 uppercase tracking-tighter leading-none mt-0.5">*Manual</p>
            )}
          </>
        ) : (
          <p className={`${nameSize} text-slate-300 italic text-center leading-none`}>Indefinido</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-lg p-1 overflow-x-auto print:overflow-visible print:bg-white">
      {/* Cabeçalho de Impressão (Genealogia) */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-4">
           {settings.logoUrl ? (
             <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
           ) : (
             <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 font-bold text-xs">LOGO</div>
           )}
           <div>
             <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{settings.breederName || 'Criatório'}</h1>
             <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Certificado de Pedigree • {bird.species}</p>
           </div>
        </div>
        <div className="text-right">
           <p className="text-[10px] text-slate-400 font-bold uppercase">Emitido em</p>
           <p className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="flex gap-2 min-w-[800px] h-[500px] items-stretch pl-2 print:min-w-0 print:w-full print:h-[18cm]">
        
        {/* G0: Foco */}
        <div className="flex flex-col justify-center w-32 shrink-0 print:w-1/6">
           <div className="border-2 border-emerald-500 p-2 rounded-xl bg-emerald-50 text-center shadow-sm print:border-2 print:border-emerald-600 print:bg-emerald-50">
              <p className="text-[9px] font-bold text-emerald-800 uppercase mb-1 tracking-widest">Pássaro Alvo</p>
              <p className="font-black text-slate-800 text-xs truncate print:text-sm">{bird.name}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">{bird.ringNumber}</p>
           </div>
        </div>

        {/* Linhas de Conexão (Visual Apenas) */}
        <div className="w-4 relative hidden md:block print:hidden">
           {/* SVG Lines could go here for better visuals */}
        </div>

        {/* G1: Pais */}
        <div className="flex flex-col justify-around w-32 shrink-0 py-8 gap-2 print:py-4 print:w-1/6">
          <div className="h-1/2 p-1"><BirdBox path="f" gender="M" level={1} /></div>
          <div className="h-1/2 p-1"><BirdBox path="m" gender="F" level={1} /></div>
        </div>

        {/* G2: Avós */}
        <div className="flex flex-col justify-around w-32 shrink-0 py-4 gap-1 print:py-2 print:w-1/6">
          <div className="h-1/4 p-0.5"><BirdBox path="ff" gender="M" level={2} /></div>
          <div className="h-1/4 p-0.5"><BirdBox path="fm" gender="F" level={2} /></div>
          <div className="h-1/4 p-0.5"><BirdBox path="mf" gender="M" level={2} /></div>
          <div className="h-1/4 p-0.5"><BirdBox path="mm" gender="F" level={2} /></div>
        </div>

        {/* G3: Bisavós */}
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

        {/* G4: Trisavós (apenas nomes, compacto) */}
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
  );
};

export default PedigreeTree;
