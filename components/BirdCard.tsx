import React from 'react';
import { Printer } from 'lucide-react';
import { Bird } from '../types';
import { APP_LOGO_ICON } from '../constants';

interface BirdCardPrintProps {
  bird: Bird;
  breederName: string;
  breederLogo?: string;
  sispassNumber?: string;
  allBirds?: Bird[];
}

const BirdCardPrint: React.FC<BirdCardPrintProps> = ({ 
  bird, 
  breederName, 
  breederLogo,
  sispassNumber,
  allBirds = []
}) => {
  const [bgColor, setBgColor] = React.useState<'dark' | 'white' | 'custom'>('dark');
  const [customBgStart, setCustomBgStart] = React.useState('#1a365d');
  const [customBgEnd, setCustomBgEnd] = React.useState('#0f172a');
  const [customBorder, setCustomBorder] = React.useState('#d97706');
  const [customTextTone, setCustomTextTone] = React.useState<'light' | 'dark'>('light');
  const [showCustomizer, setShowCustomizer] = React.useState(false);
  const [activeCustomizerCard, setActiveCustomizerCard] = React.useState<'id' | 'cert'>('id');
  const [idCardWidth, setIdCardWidth] = React.useState(360);
  const [idCardHeight, setIdCardHeight] = React.useState(227);
  const [certCardWidth, setCertCardWidth] = React.useState(360);
  const [certCardHeight, setCertCardHeight] = React.useState(227);
  const [idFontScale, setIdFontScale] = React.useState(100);
  const [certFontScale, setCertFontScale] = React.useState(100);
  const [customIdTextColor, setCustomIdTextColor] = React.useState('#fbbf24');
  const [certTextColor, setCertTextColor] = React.useState('#1a365d');
  const [certBorderColor, setCertBorderColor] = React.useState('#f59e0b');
  const [certBgStart, setCertBgStart] = React.useState('#ffffff');
  const [certBgEnd, setCertBgEnd] = React.useState('#ffffff');
  const previewScale = Math.min(
    1,
    320 / idCardWidth,
    320 / certCardWidth,
    200 / idCardHeight,
    200 / certCardHeight
  );

  // Gera QR code usando API pública - formato PNG para compatibilidade com PDF
  const generateQRCode = (text: string) => {
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?format=png&size=120x120&data=${encoded}`;
  };

  const handlePreview = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (printWindow) {
      // QR Code agora aponta para a URL de verificação
      const verificationUrl = `${window.location.origin}/bird/${bird.id}`;
      console.log('[BirdCard] URL de verificação:', verificationUrl);
      console.log('[BirdCard] Bird ID:', bird.id);
      
      const qrUrl = generateQRCode(verificationUrl);
      const printDate = new Date().toLocaleDateString('pt-BR');
      
      // Cores baseadas no fundo selecionado
      const isDark = bgColor === 'dark' || (bgColor === 'custom' && customTextTone === 'light');
      const bgGradient = bgColor === 'custom'
        ? `linear-gradient(135deg, ${customBgStart} 0%, ${customBgEnd} 100%)`
        : (isDark ? 'linear-gradient(135deg, #1a365d 0%, #0f172a 100%)' : '#ffffff');
      const borderColor = bgColor === 'custom' ? customBorder : (isDark ? '#d97706' : '#94a3b8');
      const titleColor = bgColor === 'custom' ? customIdTextColor : (isDark ? '#fbbf24' : '#1a365d');
      const labelColor = bgColor === 'custom'
        ? (customTextTone === 'light' ? '#e2e8f0' : '#475569')
        : (isDark ? '#cbd5e1' : '#64748b');
      const valueColor = bgColor === 'custom' ? customIdTextColor : (isDark ? '#fbbf24' : '#0f172a');
      const tagBg = bgColor === 'custom'
        ? 'rgba(0, 0, 0, 0.12)'
        : (isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(100, 116, 139, 0.1)');
      const tagColor = bgColor === 'custom' ? customIdTextColor : (isDark ? '#fbbf24' : '#1a365d');
      const certBgGradient = `linear-gradient(135deg, ${certBgStart} 0%, ${certBgEnd} 100%)`;

      // Função para gerar pedigree em formato texto compacto
      const getPedigreeText = () => {
        // Helper para buscar nome de ave por ID
        const getBirdName = (id?: string, manualName?: string): string => {
          if (manualName) return manualName.substring(0, 15);
          if (id) {
            const foundBird = allBirds.find(b => b.id === id);
            if (foundBird) return foundBird.name.substring(0, 15);
            return id.substring(0, 8).toUpperCase();
          }
          return '—';
        };

        const father = getBirdName(bird.fatherId, bird.manualAncestors?.['f']);
        const mother = getBirdName(bird.motherId, bird.manualAncestors?.['m']);
        const grandFatherP = getBirdName(undefined, bird.manualAncestors?.['ff']);
        const grandMotherP = getBirdName(undefined, bird.manualAncestors?.['fm']);
        const grandFatherM = getBirdName(undefined, bird.manualAncestors?.['mf']);
        const grandMotherM = getBirdName(undefined, bird.manualAncestors?.['mm']);

        return { father, mother, grandFatherP, grandMotherP, grandFatherM, grandMotherM };
      };

      const pedigree = getPedigreeText();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
          <title>Cartão - ${bird.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
              background: ${isDark ? '#e5e7eb' : '#f8fafc'}; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              zoom: 1;
              transform: scale(1);
              transform-origin: center center;
              overflow: visible;
            }
            
            .print-container { 
              width: 100%;
              max-width: 700px;
              margin: 0 auto;
              overflow: visible;
              transform-origin: center center;
            }
            
            .cards-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 20px;
              overflow: visible;
            }
            
            .card {
              width: ${idCardWidth}px;
              height: ${idCardHeight}px;
              background: ${bgGradient};
              border: 2px solid ${borderColor};
              border-radius: 10px;
              padding: 14px;
              display: grid;
              grid-template-columns: 70px 1fr 60px;
              gap: 10px;
              box-shadow: 0 10px 30px ${isDark ? 'rgba(26, 54, 93, 0.4)' : 'rgba(0, 0, 0, 0.1)'};
              page-break-inside: avoid;
              position: relative;
              overflow: visible;
              ${isDark ? 'color: white;' : 'color: #1a365d;'}
              transform: translateZ(0);
              backface-visibility: hidden;
              font-size: ${idFontScale}%;
            }
            
            .card::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(217, 119, 6, ${isDark ? '0.03' : '0.01'}) 1px, transparent 1px);
              background-size: 15px 15px;
              z-index: 0;
            }

            .card-content {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
            }

            .col-logo {
              display: flex;
              flex-direction: column;
              gap: 8px;
              grid-row: 1 / -1;
            }

            .logo-badge {
              width: 70px;
              height: 70px;
              background: ${isDark ? 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%)' : 'linear-gradient(135deg, #f0f4f8 0%, #eff6ff 100%)'};
              border: 2px solid ${borderColor};
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              overflow: hidden;
              box-shadow: 0 4px 12px ${isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(0, 0, 0, 0.08)'};
            }

            .logo-badge img {
              max-width: 85%;
              max-height: 85%;
              object-fit: contain;
            }

            .breeder-label {
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: ${titleColor};
              text-align: center;
              line-height: 1.2;
              word-break: break-word;
            }

            .col-data {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 6px;
              grid-row: 1 / -1;
            }

            .bird-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: ${titleColor};
              line-height: 1.2;
            }

            .data-row {
              font-size: 8px;
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 6px;
              line-height: 1.3;
            }

            .data-label {
              color: ${labelColor};
              font-weight: 600;
              white-space: nowrap;
            }

            .data-value {
              color: ${valueColor};
              font-weight: 700;
            }

            .tag-species {
              display: inline-block;
              background: ${tagBg};
              border: 1px solid ${borderColor};
              color: ${tagColor};
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 7px;
              font-weight: 700;
              text-transform: uppercase;
              margin-top: 2px;
            }

            .col-qr {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              gap: 6px;
              grid-row: 1 / -1;
            }

            .qr-box {
              width: 60px;
              height: 60px;
              background: white;
              border: 2px solid ${borderColor};
              border-radius: 6px;
              padding: 2px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              overflow: visible;
              transform-origin: center center;
              min-width: 60px;
              min-height: 60px;
            }

            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              image-rendering: pixelated;
              display: block;
              overflow: visible;
            }

            .footer-info {
              font-size: 7px;
              color: ${labelColor};
              text-align: center;
              line-height: 1.2;
              word-break: break-word;
              overflow: visible;
              min-height: 14px;
            }

            .footer-date {
              font-size: 6px;
              color: ${labelColor};
              opacity: 0.8;
              overflow: visible;
              min-height: 10px;
            }

            /* Verso do Cartão com Pedigree */
            .card-back {
              width: ${certCardWidth}px;
              height: ${certCardHeight}px;
              background: ${certBgGradient};
              border: 3px solid ${certBorderColor};
              border-radius: 10px;
              padding: 8px;
              display: flex;
              flex-direction: column;
              gap: 4px;
              box-shadow: 0 10px 30px ${isDark ? 'rgba(26, 54, 93, 0.4)' : 'rgba(0, 0, 0, 0.1)'};
              page-break-inside: avoid;
              position: relative;
              overflow: hidden;
              color: ${certTextColor};
              font-size: ${certFontScale}%;
            }

            .cert-header {
              text-align: center;
              padding-bottom: 3px;
              border-bottom: 2px solid ${certBorderColor};
            }

            .cert-logo {
              width: 24px;
              height: 24px;
              margin: 0 auto 2px;
            }

            .cert-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .cert-title {
              font-size: 9px;
              font-weight: 700;
              color: ${certTextColor};
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 1px;
            }

            .cert-bird-name {
              font-size: 11px;
              font-weight: 900;
              color: ${certTextColor};
              margin-bottom: 1px;
            }

            .cert-subtitle {
              font-size: 6px;
              color: ${certTextColor};
              font-weight: 600;
            }

            .cert-badge {
              position: absolute;
              top: 6px;
              right: 6px;
              background: ${certBorderColor};
              color: white;
              padding: 1px 3px;
              border-radius: 4px;
              font-size: 7px;
              font-weight: 700;
              text-align: center;
            }

            .cert-body {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              gap: 3px;
              padding: 2px;
            }

            .cert-sides {
              display: flex;
              justify-content: center;
              gap: 8px;
              align-items: center;
              width: 100%;
            }

            .cert-side {
              flex: 1;
              text-align: center;
            }

            .cert-side-label {
              font-size: 5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2px;
            }

            .cert-side.paternal .cert-side-label {
              color: #3b82f6;
            }

            .cert-side.maternal .cert-side-label {
              color: #ec4899;
            }

            .cert-side-icon {
              font-size: 8px;
            }

            .cert-parent-card {
              background: white;
              border: 1.5px solid;
              border-radius: 3px;
              padding: 2px;
              text-align: center;
              font-size: 5px;
              font-weight: 700;
              margin-bottom: 2px;
              min-height: 18px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }

            .cert-side.paternal .cert-parent-card {
              background: #3b82f6;
              border-color: #1e40af;
              color: white;
            }

            .cert-side.maternal .cert-parent-card {
              background: #ec4899;
              border-color: #be185d;
              color: white;
            }

            .cert-parent-name {
              font-weight: 700;
              font-size: 5px;
              line-height: 1.1;
            }

            .cert-parent-ring {
              font-size: 4px;
              opacity: 0.9;
              margin-top: 1px;
            }

            .cert-center {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 2px;
            }

            .cert-center-title {
              font-size: 6px;
              font-weight: 700;
              color: ${certTextColor};
              text-transform: uppercase;
            }

            .cert-center-symbol {
              font-size: 14px;
              color: ${certBorderColor};
            }

            .cert-footer {
              font-size: 5px;
              color: ${certTextColor};
              text-align: center;
              padding-top: 2px;
              border-top: 1px solid ${certBorderColor};
            }

            /* Suporte para diferentes níveis de zoom */
            @media (zoom: 1.0) {
              .card { padding: 14px; font-size: 100%; }
            }
            
            @media (zoom: 1.25) {
              .card { padding: 17.5px; }
              .data-row { font-size: 10px; }
            }
            
            @media (zoom: 1.5) {
              .card { padding: 21px; }
              .data-row { font-size: 12px; }
            }
            
            @media (zoom: 2.0) {
              .card { padding: 28px; }
              .data-row { font-size: 16px; }
            }

            @media print {
              html, body { background: white; padding: 0; }
              .card { box-shadow: none; }
              .card-back { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="cards-grid">
              <!-- Cartão Frontal -->
              <div class="card">
                <div class="col-logo">
                  <div class="logo-badge">
                    <img src="${breederLogo || APP_LOGO_ICON}" alt="Logo" onerror="this.style.display='none'" />
                  </div>
                  <div class="breeder-label">${breederName.toUpperCase()}</div>
                </div>

                <div class="col-data">
                  <div class="card-content">
                    <div class="bird-title">${bird.name || 'PÁSSARO'}</div>
                    ${bird.species ? `<div class="tag-species">${bird.species}</div>` : ''}
                  </div>

                  <div class="card-content">
                    ${bird.ringNumber ? `<div class="data-row"><span class="data-label">Anilha:</span><span class="data-value">${bird.ringNumber}</span></div>` : ''}
                    ${bird.sex ? `<div class="data-row"><span class="data-label">Sexo:</span><span class="data-value">${bird.sex}</span></div>` : ''}
                    ${bird.birthDate ? `<div class="data-row"><span class="data-label">Nasc.:</span><span class="data-value">${new Date(bird.birthDate).toLocaleDateString('pt-BR')}</span></div>` : ''}
                    ${bird.colorMutation ? `<div class="data-row"><span class="data-label">Mutação:</span><span class="data-value">${bird.colorMutation}</span></div>` : ''}
                    ${bird.classification ? `<div class="data-row"><span class="data-label">Class.:</span><span class="data-value">${bird.classification}</span></div>` : ''}
                  </div>

                  <div class="card-content">
                    ${sispassNumber ? `<div class="data-row"><span class="data-label">SISPASS:</span><span class="data-value">${sispassNumber}</span></div>` : ''}
                    ${bird.status ? `<div class="data-row"><span class="data-label">Status:</span><span class="data-value">${bird.status}</span></div>` : ''}
                  </div>
                </div>

                <div class="col-qr">
                  <div class="qr-box">
                    <img src="${qrUrl}" alt="QR Code" loading="eager" />
                  </div>
                  <div class="footer-info">ID:<br/>${bird.id.substring(0, 8).toUpperCase()}</div>
                  <div class="footer-date">${printDate}</div>
                </div>
              </div>

              <!-- Cartão Verso - Certificado Genealógico -->
              <div class="card-back">
                <!-- Header do Certificado -->
                <div class="cert-header">
                  <div class="cert-logo">
                    <img src="${breederLogo || APP_LOGO_ICON}" alt="Logo" onerror="this.style.display='none'" />
                  </div>
                  <div class="cert-title">Certificado</div>
                  <div class="cert-bird-name">${bird.name.substring(0, 30)}</div>
                  <div class="cert-subtitle">🌳 ÁRVORE GENEALÓGICA - 2 GERAÇÕES</div>
                  <div class="cert-badge">2 GERAÇÕES</div>
                </div>

                <!-- Corpo do Certificado -->
                <div class="cert-body">
                  <div class="cert-sides">
                    <!-- Lado Paterno (Azul) -->
                    <div class="cert-side paternal">
                      <div class="cert-side-label">
                        <span class="cert-side-icon">👨</span>
                        <span>LADO PATERNO</span>
                      </div>
                      
                      <div class="cert-parent-card">
                        <div class="cert-parent-name">${pedigree.father.substring(0, 20)}</div>
                      </div>

                      <div style="font-size: 4px; color: #3b82f6; margin: 1px 0; font-weight: 600;">PAI</div>
                    </div>

                    <!-- Centro -->
                    <div class="cert-center">
                      <div class="cert-center-symbol">♂</div>
                      <div class="cert-center-title">Pássaro<br/>Principal</div>
                      <div class="cert-center-symbol">♀</div>
                    </div>

                    <!-- Lado Materno (Rosa) -->
                    <div class="cert-side maternal">
                      <div class="cert-side-label">
                        <span class="cert-side-icon">👩</span>
                        <span>LADO MATERNO</span>
                      </div>
                      
                      <div class="cert-parent-card">
                        <div class="cert-parent-name">${pedigree.mother.substring(0, 20)}</div>
                      </div>

                      <div style="font-size: 4px; color: #ec4899; margin: 1px 0; font-weight: 600;">MÃE</div>
                    </div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="cert-footer">
                  <strong>${bird.ringNumber || 'S/ Anilha'}</strong> | ${new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="bgColor"
            value="dark"
            checked={bgColor === 'dark'}
            onChange={() => {
              setBgColor('dark');
              setShowCustomizer(false);
            }}
            className="w-4 h-4"
          />
          <span className="text-slate-700 font-medium">Fundo Escuro</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="bgColor"
            value="white"
            checked={bgColor === 'white'}
            onChange={() => {
              setBgColor('white');
              setShowCustomizer(false);
            }}
            className="w-4 h-4"
          />
          <span className="text-slate-700 font-medium">Fundo Branco</span>
        </label>
        <button
          onClick={() => {
            setBgColor('custom');
            setShowCustomizer(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-600 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all"
        >
          ✨ Personalizar Cartão
        </button>
      </div>
      <button
        onClick={handlePreview}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
        title="Visualizar e imprimir cartão do pássaro"
      >
        <Printer size={16} />
        Imprimir Cartão
      </button>
      {showCustomizer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl my-4">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl text-white">
              <div>
                <h2 className="text-xl font-bold">Personalizar Cartão</h2>
                <p className="text-sm text-blue-100 mt-0.5">Customize as cores e dimensões para criar seu próprio design</p>
              </div>
              <button
                onClick={() => setShowCustomizer(false)}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Card Selector */}
              <div className="flex gap-2 mb-6 border-b">
                <button
                  onClick={() => setActiveCustomizerCard('id')}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                    activeCustomizerCard === 'id'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-600 border-transparent hover:text-slate-700'
                  }`}
                >
                  ID de Identificação
                </button>
                <button
                  onClick={() => setActiveCustomizerCard('cert')}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                    activeCustomizerCard === 'cert'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-600 border-transparent hover:text-slate-700'
                  }`}
                >
                  Certificado (Genealogia)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="lg:col-span-2 space-y-6">
                  {activeCustomizerCard === 'id' ? (
                    <>
                      {/* Cores */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded"></span>
                          Cores do Fundo
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor 1</span>
                            <input
                              type="color"
                              value={customBgStart}
                              onChange={(e) => setCustomBgStart(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor 2</span>
                            <input
                              type="color"
                              value={customBgEnd}
                              onChange={(e) => setCustomBgEnd(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Elementos */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 bg-amber-500 rounded"></span>
                          Elementos Gráficos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor da Borda</span>
                            <input
                              type="color"
                              value={customBorder}
                              onChange={(e) => setCustomBorder(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor do Texto</span>
                            <input
                              type="color"
                              value={customIdTextColor}
                              onChange={(e) => setCustomIdTextColor(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Tamanho e Fonte */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 bg-purple-500 rounded"></span>
                          Dimensões e Tipografia
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Largura (px)</span>
                            <input
                              type="range"
                              min={240}
                              max={520}
                              value={idCardWidth}
                              onChange={(e) => setIdCardWidth(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 text-right">{idCardWidth}px</span>
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Altura (px)</span>
                            <input
                              type="range"
                              min={160}
                              max={360}
                              value={idCardHeight}
                              onChange={(e) => setIdCardHeight(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 text-right">{idCardHeight}px</span>
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Tamanho da Fonte</span>
                            <input
                              type="range"
                              min={60}
                              max={140}
                              value={idFontScale}
                              onChange={(e) => setIdFontScale(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 text-right">{idFontScale}%</span>
                          </label>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Cores Certificado */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 bg-gradient-to-br from-amber-300 to-amber-600 rounded"></span>
                          Cores do Fundo
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor 1</span>
                            <input
                              type="color"
                              value={certBgStart}
                              onChange={(e) => setCertBgStart(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor 2</span>
                            <input
                              type="color"
                              value={certBgEnd}
                              onChange={(e) => setCertBgEnd(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Elementos Certificado */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 bg-rose-500 rounded"></span>
                          Elementos Gráficos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor da Borda</span>
                            <input
                              type="color"
                              value={certBorderColor}
                              onChange={(e) => setCertBorderColor(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Cor do Texto</span>
                            <input
                              type="color"
                              value={certTextColor}
                              onChange={(e) => setCertTextColor(e.target.value)}
                              className="h-12 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-colors"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Tamanho e Fonte Certificado */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <span className="w-4 h-4 bg-indigo-500 rounded"></span>
                          Dimensões e Tipografia
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Largura (px)</span>
                            <input
                              type="range"
                              min={240}
                              max={520}
                              value={certCardWidth}
                              onChange={(e) => setCertCardWidth(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 text-right">{certCardWidth}px</span>
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Altura (px)</span>
                            <input
                              type="range"
                              min={160}
                              max={360}
                              value={certCardHeight}
                              onChange={(e) => setCertCardHeight(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 text-right">{certCardHeight}px</span>
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm text-slate-700 font-medium">Tamanho da Fonte</span>
                            <input
                              type="range"
                              min={60}
                              max={140}
                              value={certFontScale}
                              onChange={(e) => setCertFontScale(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-xs text-slate-500 text-right">{certFontScale}%</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Preview */}
                <div className="lg:col-span-1 sticky top-24">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Pré-visualização</h3>
                  <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                    <div
                      className="rounded-lg border-2 p-2 mx-auto"
                      style={{
                        background: activeCustomizerCard === 'id'
                          ? `linear-gradient(135deg, ${customBgStart} 0%, ${customBgEnd} 100%)`
                          : `linear-gradient(135deg, ${certBgStart} 0%, ${certBgEnd} 100%)`,
                        borderColor: activeCustomizerCard === 'id' ? customBorder : certBorderColor,
                        color: activeCustomizerCard === 'id' ? customIdTextColor : certTextColor,
                        width: activeCustomizerCard === 'id' ? Math.min(idCardWidth, 240) : Math.min(certCardWidth, 240),
                        height: activeCustomizerCard === 'id' ? Math.min(idCardHeight, 150) : Math.min(certCardHeight, 150),
                        fontSize: `${activeCustomizerCard === 'id' ? idFontScale : certFontScale}%`
                      }}
                    >
                      <div className="text-[8px] font-bold uppercase text-center">
                        {activeCustomizerCard === 'id' ? bird.name || 'PÁSSARO' : 'CERTIFICADO'}
                      </div>
                      <div className="text-[6px] text-center opacity-75 mt-1">
                        {activeCustomizerCard === 'id' ? bird.ringNumber || 'Anilha' : bird.name || 'PÁSSARO'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 rounded-b-2xl border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCustomizer(false)}
                className="px-6 py-2 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowCustomizer(false)}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
              >
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BirdCardPrint;
