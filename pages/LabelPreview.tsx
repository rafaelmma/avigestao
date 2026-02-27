import React from 'react';
import LabelClean from '../components/LabelClean';
import { MOCK_BIRDS } from '../constants';

const sample: any[] = MOCK_BIRDS.length
  ? MOCK_BIRDS.slice(0, 8).map((b: any) => ({
      name: b.name || 'Sem nome',
      ring: b.ring || b.anilha || '—',
      sex: b.sex || b.sexo || '—',
      bornDate: b.bornDate || b.nasc || undefined,
      imageUrl: b.imageUrl || undefined,
    }))
  : [
      { name: 'Samsung', ring: '999995555666', sex: 'Macho', bornDate: undefined },
      { name: 'Xarope', ring: 'A12345', sex: 'Fêmea', bornDate: '2024-05-10' },
      { name: 'Zeus', ring: 'B99876', sex: 'Macho', bornDate: '2023-10-01' },
      { name: 'Luna', ring: 'C44521', sex: 'Fêmea', bornDate: '2022-02-14' },
    ];

const LabelPreview: React.FC = () => {
  // Avery 5160 typical dimensions (3 columns x 10 rows)
  const sheet = {
    cols: 3,
    rows: 10,
    labelWidth: '66.675mm',
    labelHeight: '25.4mm',
    gapX: '3.175mm',
    gapY: '0mm',
    marginTop: '12.7mm',
    marginLeft: '4.7625mm',
  };

  // repeat sample to fill a page
  const labelsPerPage = sheet.cols * sheet.rows;
  const pageItems = Array.from({ length: labelsPerPage }).map((_, i) => sample[i % sample.length]);

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Preview — Etiquetas (Clean) — Papel de etiquetas</h1>

      <div
        className="label-sheet bg-white p-4"
        style={{
          width: '210mm',
          minHeight: '297mm',
          paddingTop: sheet.marginTop,
        }}
      >
        <div
          className="labels-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${sheet.cols}, ${sheet.labelWidth})`,
            gridAutoRows: sheet.labelHeight,
            gap: `${sheet.gapY} ${sheet.gapX}`,
            marginLeft: sheet.marginLeft,
            '--label-width': sheet.labelWidth,
            '--label-height': sheet.labelHeight,
          } as React.CSSProperties}
        >
          {pageItems.map((s, idx) => (
            <div key={idx} className="print:break-inside-avoid">
              <LabelClean
                name={s.name}
                ring={s.ring}
                sex={s.sex}
                bornDate={s.bornDate}
                imageUrl={s.imageUrl}
                contact={''}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .label-sheet { box-shadow: none; padding: 0; }
          .labels-grid { margin-left: ${sheet.marginLeft}; gap: ${sheet.gapY} ${sheet.gapX}; }
          .label-clean { page-break-inside: avoid; }
        }
        /* screen-friendly scaling */
        .label-sheet { box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
};

export default LabelPreview;
