import React from 'react';
import { Bird } from '../types';

interface BirdIdentificationCardProps {
  bird: Bird;
  settings: {
    accentColor: string;
    logoUrl?: string;
    breederName?: string;
    breederRegistration?: string;
    breederAddress?: string;
    breederPhone?: string;
  };
}

export function BirdIdentificationCard({ bird, settings }: BirdIdentificationCardProps) {
  const accent = settings.accentColor || '#f59e0b';

  // QR Code usando API externa gratuita
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://avigestao.com.br/verify/${bird.id}`)}`;

  // Resolver ancestrais
  const resolveBirdData = (path: string) => {
    if (!bird.manualAncestors) return { name: 'Indefinido', ring: '', sex: 'Desconhecido' as const };
    
    const ancestorData = bird.manualAncestors[path];
    if (!ancestorData || typeof ancestorData === 'string') {
      return { name: ancestorData || 'Indefinido', ring: '', sex: 'Desconhecido' as const };
    }
    
    return {
      name: ancestorData || 'Indefinido',
      ring: '',
      sex: 'Desconhecido' as const
    };
  };

  const father = resolveBirdData('f');
  const mother = resolveBirdData('m');
  const ff = resolveBirdData('ff');
  const fm = resolveBirdData('fm');
  const mf = resolveBirdData('mf');
  const mm = resolveBirdData('mm');
  const fff = resolveBirdData('fff');
  const ffm = resolveBirdData('ffm');
  const fmf = resolveBirdData('fmf');
  const fmm = resolveBirdData('fmm');
  const mff = resolveBirdData('mff');
  const mfm = resolveBirdData('mfm');
  const mmf = resolveBirdData('mmf');
  const mmm = resolveBirdData('mmm');

  // Refs para conectores SVG da árvore
  const treeWrapRef = React.useRef<HTMLDivElement>(null);
  const subjectRef = React.useRef<HTMLDivElement>(null);
  const fatherRef = React.useRef<HTMLDivElement>(null);
  const motherRef = React.useRef<HTMLDivElement>(null);
  const ffRef = React.useRef<HTMLDivElement>(null);
  const fmRef = React.useRef<HTMLDivElement>(null);
  const mfRef = React.useRef<HTMLDivElement>(null);
  const mmRef = React.useRef<HTMLDivElement>(null);
  
  const [paths, setPaths] = React.useState<string[]>([]);

  const buildPath = React.useCallback(
    (from: HTMLElement | null, to: HTMLElement | null, color = '#94a3b8') => {
      if (!treeWrapRef.current || !from || !to) return null;

      const wrap = treeWrapRef.current.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();

      const x1 = a.right - wrap.left;
      const y1 = a.top - wrap.top + a.height / 2;

      const x2 = b.left - wrap.left;
      const y2 = b.top - wrap.top + b.height / 2;

      const midX = x1 + (x2 - x1) * 0.5;
      const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
      return { d, color };
    },
    []
  );

  const recompute = React.useCallback(() => {
    const links: Array<{ from: HTMLElement | null; to: HTMLElement | null; color?: string }> = [
      { from: subjectRef.current, to: fatherRef.current, color: '#60a5fa' },
      { from: subjectRef.current, to: motherRef.current, color: '#fb7185' },
      { from: fatherRef.current, to: ffRef.current, color: '#60a5fa' },
      { from: fatherRef.current, to: fmRef.current, color: '#fb7185' },
      { from: motherRef.current, to: mfRef.current, color: '#60a5fa' },
      { from: motherRef.current, to: mmRef.current, color: '#fb7185' },
    ];

    const built = links
      .map((l) => buildPath(l.from, l.to, l.color))
      .filter(Boolean) as Array<{ d: string; color: string }>;

    setPaths(built.map((p) => `${p.color}::${p.d}`));
  }, [buildPath]);

  React.useEffect(() => {
    recompute();
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    const t = window.setTimeout(recompute, 150);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
    };
  }, [recompute]);

  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="grid grid-cols-3 gap-6">
        {/* FRENTE DO CARTÃO - Estilo Profissional Azul */}
        <div 
          id="bird-card-front"
          className="print-active relative rounded-2xl shadow-2xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%)',
            border: `3px solid ${accent}`,
            width: '340px',
            height: '210px'
          }}
        >
        {/* Logo */}
        <div className="absolute top-3 left-3 w-11 h-11 bg-white rounded-lg p-1 shadow-lg">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">🦜</div>
          )}
        </div>

        {/* QR Code */}
        <div className="absolute top-3 right-3 bg-white rounded-lg p-0.5 shadow-lg">
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            className="w-14 h-14"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Nome do Pássaro - Destaque */}
        <div className="absolute left-2 right-2" style={{ top: '48px' }}>
          <div 
            className="inline-block px-3 py-1 rounded-lg border-2 text-center w-full"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderColor: accent,
            }}
          >
            <div className="text-[6px] font-black uppercase tracking-wider text-white/50 mb-0.5">
              {bird.species}
            </div>
            <div className="text-base font-black uppercase tracking-wide text-white leading-tight">
              {bird.name}
            </div>
          </div>
        </div>

        {/* Informações Principais - LINHA 1: Anilha | Sexo | Nasc */}
        <div className="absolute left-2 right-2 grid grid-cols-3 gap-1" style={{ top: '78px' }}>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">Anilha</div>
            <div className="text-[9px] font-black text-white bg-white/10 rounded px-1 py-1 truncate text-center w-full">
              {bird.ringNumber || 'N/A'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">Sexo</div>
            <div className="text-[9px] font-black text-white bg-white/10 rounded px-1 py-1 truncate text-center w-full">
              {bird.sex === 'Macho' ? '♂' : bird.sex === 'Fêmea' ? '♀' : 'N/A'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">Nasc</div>
            <div className="text-[9px] font-black text-white bg-white/10 rounded px-1 py-1 truncate text-center w-full">
              {bird.birthDate ? new Date(bird.birthDate).toLocaleDateString('pt-BR').slice(0, 8) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Informações Secundárias - LINHA 2: Mutação | Classe */}
        <div className="absolute left-2 right-2 grid grid-cols-2 gap-1" style={{ top: '103px' }}>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">Mutação</div>
            <div className="text-[9px] font-black text-white bg-white/10 rounded px-1 py-1 truncate text-center w-full">
              {bird.colorMutation || 'Clássico'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">Classe</div>
            <div className="text-[9px] font-black text-white bg-white/10 rounded px-1 py-1 truncate text-center w-full">
              {bird.classification || 'N/A'}
            </div>
          </div>
        </div>

        {/* SISPASS e Status - LINHA 3 */}
        <div className="absolute left-2 right-2 grid grid-cols-2 gap-1" style={{ bottom: '6px' }}>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">SISPASS</div>
            <div className="text-[8px] font-black text-white bg-white/10 rounded px-1 py-1 truncate text-center w-full">
              {settings.breederRegistration || 'N/A'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[5px] font-bold uppercase text-white/60 leading-tight mb-0.5">Status</div>
            <div className="text-[8px] font-black rounded px-1 py-1 truncate text-center w-full" style={{ color: accent, backgroundColor: accent + '25', border: `1px solid ${accent}` }}>
              {bird.status}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* VERSO DO CARTÃO - FOTO + ÁRVORE GENEALÓGICA */}
      <div 
        id="bird-card-back"
        className="print-active bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ 
          border: `3px solid ${accent}`,
          width: '340px',
          height: '210px'
        }}
      >
        {/* Header com Foto - Maior */}
        <div className="relative h-24 bg-gradient-to-br from-slate-100 to-slate-200 border-b-2 overflow-hidden" style={{ borderColor: accent }}>
          {bird.photoUrl ? (
            <img src={bird.photoUrl} alt={bird.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              🦜
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-1.5 left-2 right-2">
            <div className="text-white text-[11px] font-black uppercase tracking-wide drop-shadow-lg truncate">
              {bird.name}
            </div>
            <div className="text-white/80 text-[7px] font-bold truncate">
              {bird.ringNumber} • {bird.species}
            </div>
          </div>
        </div>

        {/* Árvore Genealógica Compacta */}
        <div className="flex-1 p-1 overflow-hidden">
          <h3 className="text-[6px] font-black uppercase tracking-wider mb-0.5 flex items-center justify-between" style={{ color: accent }}>
            <span>Árvore Genea.</span>
            <span className="text-gray-400 text-[5px]">3G</span>
          </h3>

          <div className="grid grid-cols-[40px_1fr] gap-0.5 items-start text-[5px]">
            {/* Pássaro */}
            <div className="flex flex-col items-center justify-center">
              <div className="mb-0.5 text-[5px] font-bold uppercase text-gray-500">Pass.</div>
              <div 
                className="rounded px-1 py-0.5 border text-center min-w-[45px]"
                style={{ backgroundColor: '#93c5fd', borderColor: '#3b82f6' }}
              >
                <div className="text-[5px] font-bold text-gray-800 truncate">{bird.name}</div>
              </div>
            </div>

            {/* Pais e Avós */}
            <div className="grid grid-rows-2 gap-1 items-start">
              {/* Lado Paterno */}
              <div className="grid grid-cols-[38px_1fr] gap-0.5 items-center border-l border-gray-300 pl-0.5">
                <div className="text-center">
                  <div className="text-[5px] font-bold uppercase text-gray-500 mb-0.5">Pai</div>
                  <div 
                    className="rounded px-0.5 py-0.5 border text-center text-[5px] font-bold text-gray-800"
                    style={{ backgroundColor: '#93c5fd', borderColor: '#3b82f6' }}
                  >
                    {father.name.slice(0, 6)}
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <div className="text-center">
                    <div className="text-[4px] text-gray-400 mb-0.5">AP</div>
                    <div className="rounded px-0.5 py-0.5 bg-gray-200 text-gray-600 font-bold text-[4px]">Indef.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[4px] text-gray-400 mb-0.5">APA</div>
                    <div className="rounded px-0.5 py-0.5 bg-gray-200 text-gray-600 font-bold text-[4px]">Indef.</div>
                  </div>
                </div>
              </div>

              {/* Lado Materno */}
              <div className="grid grid-cols-[38px_1fr] gap-0.5 items-center border-l border-gray-300 pl-0.5">
                <div className="text-center">
                  <div className="text-[5px] font-bold uppercase text-gray-500 mb-0.5">Mãe</div>
                  <div 
                    className="rounded px-0.5 py-0.5 border text-center text-[5px] font-bold text-gray-800"
                    style={{ backgroundColor: '#f9a8d4', borderColor: '#ec4899' }}
                  >
                    {mother.name.slice(0, 6)}
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <div className="text-center">
                    <div className="text-[4px] text-gray-400 mb-0.5">AM</div>
                    <div className="rounded px-0.5 py-0.5 bg-gray-200 text-gray-600 font-bold text-[4px]">Indef.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[4px] text-gray-400 mb-0.5">AMA</div>
                    <div className="rounded px-0.5 py-0.5 bg-gray-200 text-gray-600 font-bold text-[4px]">Indef.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-1 pt-1 border-t border-gray-200 flex items-center gap-2 text-[6px]">
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: '#93c5fd', border: '1px solid #3b82f6' }}></div>
              <span className="text-gray-600">M</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: '#f9a8d4', border: '1px solid #ec4899' }}></div>
              <span className="text-gray-600">F</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARTÃO DE ÁRVORE GENEALÓGICA */}
      <div 
        id="bird-card-tree"
        className="print-active bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ 
          border: `3px solid ${accent}`,
          width: '340px',
          height: '210px'
        }}
      >
        {/* Header Profissional */}
        <div className="bg-gradient-to-r px-3 py-2 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${accent}20 0%, ${accent}40 100%)` }}>
          <div className="flex items-center gap-2">
            {settings.logoUrl ? (
              <div className="h-7 w-7 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: accent }}>
                <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain p-0.5 rounded-full" />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-full border-2 flex items-center justify-center bg-yellow-50 text-xs font-bold" style={{ borderColor: accent }}>🦜</div>
            )}
            <div>
              <p className="text-[7px] font-black uppercase tracking-widest" style={{ color: accent }}>Pedigree</p>
              <p className="text-[6px] font-bold text-gray-800">4 Gerações</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[6px] font-semibold text-gray-700">{bird.ringNumber}</p>
          </div>
        </div>

        {/* Corpo Principal - 3 Colunas */}
        <div className="flex-1 grid grid-cols-3 gap-2 px-2 py-2 overflow-hidden">
          
          {/* COLUNA 1: PÁSSARO PRINCIPAL */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-[7px] font-black text-gray-700 text-center">PÁSSARO</div>
            <div
              className="rounded-lg border-2 px-2 py-1.5 text-center w-full shadow-md flex flex-col items-center justify-center"
              style={{
                backgroundColor: bird.sex === 'Fêmea' ? '#fce7f3' : '#dbeafe',
                borderColor: bird.sex === 'Fêmea' ? '#f9a8d4' : '#60a5fa',
                flex: 1,
                minHeight: '45px'
              }}
            >
              <div className="font-black text-[7px]" style={{ color: bird.sex === 'Fêmea' ? '#be185d' : '#1e40af' }}>
                {bird.name.slice(0, 10)}
              </div>
              <div className="text-[5px] text-gray-600 font-semibold">{bird.ringNumber}</div>
              <div className="text-[5px]" style={{ color: bird.sex === 'Fêmea' ? '#be185d' : '#1e40af' }}>
                {bird.sex === 'Fêmea' ? '♀' : '♂'}
              </div>
            </div>
          </div>

          {/* COLUNA 2: PAIS */}
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-[7px] font-black text-gray-700 text-center">PAIS</div>
            
            {/* PAI */}
            <div
              className="rounded-lg border-2 px-1 py-0.5 text-center shadow-sm flex-1 flex flex-col items-center justify-center min-h-[22px]"
              style={{
                backgroundColor: father.name === 'Indefinido' ? '#f8fafc' : '#dbeafe',
                borderColor: '#60a5fa',
                borderWidth: father.name === 'Indefinido' ? '1px dashed' : '2px'
              }}
            >
              <div className={`font-bold text-[5.5px] ${father.name === 'Indefinido' ? 'text-gray-400 italic' : 'text-blue-900'}`}>
                {father.name === 'Indefinido' ? '—' : father.name.slice(0, 7)}
              </div>
              {father.name !== 'Indefinido' && <div className="text-[4px] text-blue-600">♂</div>}
            </div>

            {/* MÃE */}
            <div
              className="rounded-lg border-2 px-1 py-0.5 text-center shadow-sm flex-1 flex flex-col items-center justify-center min-h-[22px]"
              style={{
                backgroundColor: mother.name === 'Indefinido' ? '#f8fafc' : '#fce7f3',
                borderColor: '#f9a8d4',
                borderWidth: mother.name === 'Indefinido' ? '1px dashed' : '2px'
              }}
            >
              <div className={`font-bold text-[5.5px] ${mother.name === 'Indefinido' ? 'text-gray-400 italic' : 'text-pink-900'}`}>
                {mother.name === 'Indefinido' ? '—' : mother.name.slice(0, 7)}
              </div>
              {mother.name !== 'Indefinido' && <div className="text-[4px] text-pink-600">♀</div>}
            </div>
          </div>

          {/* COLUNA 3: AVÓS */}
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-[7px] font-black text-gray-700 text-center">AVÓS</div>
            
            {/* AVÓ PATERNAL */}
            <div className="flex gap-0.5 flex-1 min-h-[22px]">
              {/* Avô FF */}
              <div
                className="rounded-lg border px-0.5 py-0.5 text-center shadow-sm flex-1 flex flex-col items-center justify-center"
                style={{
                  backgroundColor: ff.name === 'Indefinido' ? '#f8fafc' : '#dbeafe',
                  borderColor: '#60a5fa',
                  borderWidth: ff.name === 'Indefinido' ? '1px dashed' : '1px'
                }}
              >
                <div className={`font-bold text-[4px] ${ff.name === 'Indefinido' ? 'text-gray-400 italic' : 'text-blue-800'}`}>
                  {ff.name === 'Indefinido' ? '—' : ff.name.slice(0, 4)}
                </div>
                {ff.name !== 'Indefinido' && <div className="text-[3px] text-blue-600">♂</div>}
              </div>

              {/* Avó FM */}
              <div
                className="rounded-lg border px-0.5 py-0.5 text-center shadow-sm flex-1 flex flex-col items-center justify-center"
                style={{
                  backgroundColor: fm.name === 'Indefinido' ? '#f8fafc' : '#fce7f3',
                  borderColor: '#f9a8d4',
                  borderWidth: fm.name === 'Indefinido' ? '1px dashed' : '1px'
                }}
              >
                <div className={`font-bold text-[4px] ${fm.name === 'Indefinido' ? 'text-gray-400 italic' : 'text-pink-800'}`}>
                  {fm.name === 'Indefinido' ? '—' : fm.name.slice(0, 4)}
                </div>
                {fm.name !== 'Indefinido' && <div className="text-[3px] text-pink-600">♀</div>}
              </div>
            </div>

            {/* AVÓ MATERNAL */}
            <div className="flex gap-0.5 flex-1 min-h-[22px]">
              {/* Avô MF */}
              <div
                className="rounded-lg border px-0.5 py-0.5 text-center shadow-sm flex-1 flex flex-col items-center justify-center"
                style={{
                  backgroundColor: mf.name === 'Indefinido' ? '#f8fafc' : '#dbeafe',
                  borderColor: '#60a5fa',
                  borderWidth: mf.name === 'Indefinido' ? '1px dashed' : '1px'
                }}
              >
                <div className={`font-bold text-[4px] ${mf.name === 'Indefinido' ? 'text-gray-400 italic' : 'text-blue-800'}`}>
                  {mf.name === 'Indefinido' ? '—' : mf.name.slice(0, 4)}
                </div>
                {mf.name !== 'Indefinido' && <div className="text-[3px] text-blue-600">♂</div>}
              </div>

              {/* Avó MM */}
              <div
                className="rounded-lg border px-0.5 py-0.5 text-center shadow-sm flex-1 flex flex-col items-center justify-center"
                style={{
                  backgroundColor: mm.name === 'Indefinido' ? '#f8fafc' : '#fce7f3',
                  borderColor: '#f9a8d4',
                  borderWidth: mm.name === 'Indefinido' ? '1px dashed' : '1px'
                }}
              >
                <div className={`font-bold text-[4px] ${mm.name === 'Indefinido' ? 'text-gray-400 italic' : 'text-pink-800'}`}>
                  {mm.name === 'Indefinido' ? '—' : mm.name.slice(0, 4)}
                </div>
                {mm.name !== 'Indefinido' && <div className="text-[3px] text-pink-600">♀</div>}
              </div>
            </div>
          </div>

        </div>

        {/* Legenda Footer */}
        <div className="px-2 py-1 border-t text-[5px] flex items-center justify-center gap-3" style={{ borderColor: accent }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#60a5fa' }}></span>
            <span className="font-semibold text-gray-700">Macho</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f9a8d4' }}></span>
            <span className="font-semibold text-gray-700">Fêmea</span>
          </span>
        </div>
      </div>
    </div>
  );
}
