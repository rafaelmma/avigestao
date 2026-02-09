import React from 'react';
import { Printer, Download } from 'lucide-react';
import { Bird, BreederSettings } from '../types';
import { APP_LOGO_ICON } from '../constants';

interface TagGeneratorProps {
  birds: Bird[];
  settings?: BreederSettings;
}

type TagStyle = 'compact' | 'detailed' | 'minimal';
type TagSize = 'small' | 'medium' | 'large';

const TagGenerator: React.FC<TagGeneratorProps> = ({ birds, settings }) => {
  const [selectedBirds, setSelectedBirds] = React.useState<string[]>([]);
  const [tagStyle, setTagStyle] = React.useState<TagStyle>('detailed');
  const [tagSize, setTagSize] = React.useState<TagSize>('medium');
  const [includeQR, setIncludeQR] = React.useState(true);
  const [showWatermark, setShowWatermark] = React.useState(true);

  // Logo do criador ou padrão
  const logoUrl = settings?.logoUrl || APP_LOGO_ICON;

  // Dimensões das etiquetas em mm (para impressão)
  const sizes = {
    small: { width: 60, height: 40, font: '8px' },
    medium: { width: 90, height: 60, font: '10px' },
    large: { width: 120, height: 80, font: '12px' },
  };

  const size = sizes[tagSize];

  const toggleBirdSelection = (birdId: string) => {
    setSelectedBirds((prev) =>
      prev.includes(birdId) ? prev.filter((id) => id !== birdId) : [...prev, birdId],
    );
  };

  const generateQRCode = (text: string) => {
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?format=png&size=80x80&data=${encoded}`;
  };

  const handlePrintTags = () => {
    const birdsToTag =
      selectedBirds.length > 0 ? birds.filter((b) => selectedBirds.includes(b.id)) : birds;

    if (birdsToTag.length === 0) {
      alert('Selecione pelo menos uma ave para gerar as etiquetas');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      const tagsHTML = birdsToTag
        .map((bird) => {
          const qrUrl = includeQR
            ? generateQRCode(`${window.location.origin}/bird/${bird.id}`)
            : '';

          return `
          <div class="tag-item" style="
            width: ${size.width}mm;
            height: ${size.height}mm;
            border: 2px solid #333;
            padding: 4mm;
            margin: 3mm;
            display: inline-block;
            vertical-align: top;
            page-break-inside: avoid;
            box-sizing: border-box;
            background: white;
            font-family: Arial, sans-serif;
            font-size: ${size.font};
            position: relative;
            overflow: hidden;
          ">
            ${
              showWatermark
                ? `
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                opacity: 0.08;
                z-index: 0;
                pointer-events: none;
              ">
                <img src="${logoUrl}" style="
                  width: ${size.width * 0.6}mm;
                  height: ${size.height * 0.6}mm;
                  object-fit: contain;
                " />
              </div>
            `
                : ''
            }
            <div style="position: relative; z-index: 1;">
            ${
              tagStyle === 'detailed'
                ? `
              <div style="font-weight: bold; font-size: ${
                parseInt(size.font) + 2
              }px; margin-bottom: 2px;">
                ${bird.name?.substring(0, 20) || 'AVE'}
              </div>
              <div style="font-size: ${
                parseInt(size.font) - 1
              }px; color: #666; margin-bottom: 2px;">
                <strong>Anilha:</strong> ${bird.ringNumber || '—'}
              </div>
              <div style="font-size: ${
                parseInt(size.font) - 1
              }px; color: #666; margin-bottom: 2px;">
                <strong>Sexo:</strong> ${bird.sex || '—'}
              </div>
              ${
                includeQR
                  ? `
                <div style="text-align: center; margin-top: 2px;">
                  <img src="${qrUrl}" width="30" height="30" style="border: 1px solid #999;" />
                </div>
              `
                  : ''
              }
            `
                : tagStyle === 'compact'
                ? `
              <div style="font-weight: bold; font-size: ${
                parseInt(size.font) + 1
              }px; margin-bottom: 3px;">
                ${bird.name?.substring(0, 15) || 'AVE'}
              </div>
              <div style="font-size: ${parseInt(size.font) - 1}px;">
                Anilha: ${bird.ringNumber || '—'}
              </div>
              ${
                includeQR
                  ? `
                <img src="${qrUrl}" width="24" height="24" style="margin-top: 2px; border: 1px solid #999;" />
              `
                  : ''
              }
            `
                : `
              <div style="font-weight: bold; font-size: ${parseInt(size.font) + 1}px;">
                ${bird.name?.substring(0, 12) || 'AVE'}
              </div>
            `
            }
            </div>
          </div>
        `;
        })
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Etiquetas de Gaiola</title>
          <style>
            body {
              margin: 5mm;
              padding: 0;
              background: white;
              font-family: Arial, sans-serif;
            }
            .tags-container {
              display: flex;
              flex-wrap: wrap;
              gap: 0;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .tag-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="tags-container">
            ${tagsHTML}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadCSV = () => {
    const birdsToExport =
      selectedBirds.length > 0 ? birds.filter((b) => selectedBirds.includes(b.id)) : birds;

    const csv = [
      ['Nome', 'Anilha', 'Espécie', 'Sexo', 'Data de Nascimento', 'Status'],
      ...birdsToExport.map((b) => [
        b.name || '',
        b.ringNumber || '',
        b.species || '',
        b.sex || '',
        b.birthDate || '',
        b.status || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'etiquetas-aves.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          🏷️ Gerador de Etiquetas de Gaiola
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Crie etiquetas personalizadas para suas gaiolas. Selecione as aves, customize o estilo e
          imprima em folhas de etiqueta A4.
        </p>

        {/* Configurações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Estilo da Etiqueta
            </label>
            <select
              value={tagStyle}
              onChange={(e) => setTagStyle(e.target.value as TagStyle)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="detailed">Detalhado (Nome, Anilha, Sexo, QR)</option>
              <option value="compact">Compacto (Nome, Anilha, QR)</option>
              <option value="minimal">Mínimo (Apenas Nome)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tamanho</label>
            <select
              value={tagSize}
              onChange={(e) => setTagSize(e.target.value as TagSize)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="small">Pequeno (60x40mm)</option>
              <option value="medium">Médio (90x60mm)</option>
              <option value="large">Grande (120x80mm)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={includeQR}
                onChange={(e) => setIncludeQR(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Incluir Código QR</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Marca d&apos;água com logo</span>
            </label>
          </div>
        </div>

        {/* Seleção de Aves */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700">
              Aves Selecionadas: {selectedBirds.length} de {birds.length}
            </label>
            <button
              onClick={() =>
                setSelectedBirds(
                  selectedBirds.length === birds.length ? [] : birds.map((b) => b.id),
                )
              }
              className="text-xs px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
            >
              {selectedBirds.length === birds.length ? 'Desselecionar Todas' : 'Selecionar Todas'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
            {birds.map((bird) => (
              <label
                key={bird.id}
                className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedBirds.includes(bird.id)}
                  onChange={() => toggleBirdSelection(bird.id)}
                  className="w-4 h-4"
                />
                <span className="text-slate-700 truncate">{bird.name || 'Ave'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <button
            onClick={handlePrintTags}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
          >
            <Printer size={16} />
            Imprimir Etiquetas
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Dica de Impressão */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <h4 className="font-semibold text-amber-900 mb-2">💡 Dica de Impressão</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Use papel de etiqueta A4 (recomendado: Pimaco ou Maxprint)</li>
          <li>• Ajuste as margens para 0 nas opções de impressão</li>
          <li>• Faça um teste com uma folha branca antes de usar etiquetas caras</li>
          <li>• Se usar QR, você poderá escanear para acessar o perfil da ave</li>
        </ul>
      </div>
    </div>
  );
};

export default TagGenerator;
