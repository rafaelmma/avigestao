import React from 'react';
import { APP_LOGO } from '../constants';

interface LabelProps {
  name: string;
  ring?: string;
  sex?: string;
  bornDate?: string;
  imageUrl?: string;
  contact?: string;
}

const formatBorn = (d?: string) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
};

const LabelClean: React.FC<LabelProps> = ({ name, ring, sex, bornDate, imageUrl, contact }) => {
  return (
    <div className="label-clean box-border p-3 border border-slate-200 rounded-sm bg-white text-slate-900 print:shadow-none"
      style={{
        width: 'var(--label-width, 66.675mm)',
        height: 'var(--label-height, 25.4mm)'
      }}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-sm overflow-hidden flex-shrink-0">
          {imageUrl ? (
            // image fallback handled by onError in caller; keep simple here
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <img src={APP_LOGO} alt="logo" className="w-12 h-12 opacity-30 object-contain" />
          )}
        </div>

        <div className="flex-1">
          <div className="text-lg font-extrabold leading-tight text-slate-900">{name}</div>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
            {ring && <span className="font-mono text-slate-700">Anilha: {ring}</span>}
            {sex && <span>Sexo: {sex}</span>}
            {bornDate && <span>• Nasc: {formatBorn(bornDate)}</span>}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between text-[10px] text-slate-500">
        <div>{contact ?? ''}</div>
        <div className="text-[10px] text-slate-400">© AviGestão</div>
      </div>
    </div>
  );
};

export default LabelClean;
