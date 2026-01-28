import React from 'react';
import { Printer } from 'lucide-react';
import { Bird } from '../types';
import { APP_LOGO_ICON } from '../constants';

interface BirdCardPrintProps {
  bird: Bird;
  breederName: string;
  breederLogo?: string;
  sispassNumber?: string;
}

const BirdCardPrint: React.FC<BirdCardPrintProps> = ({ 
  bird, 
  breederName, 
  breederLogo,
  sispassNumber 
}) => {
  // Gera QR code usando API pública
  const generateQRCode = (text: string) => {
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encoded}`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (printWindow) {
      const birdIdentifier = `${bird.name} | Anilha: ${bird.ringNumber || 'N/A'} | ID: ${bird.id.substring(0, 8)}`;
      const qrUrl = generateQRCode(birdIdentifier);
      const printDate = new Date().toLocaleDateString('pt-BR');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cartão - ${bird.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
              background: #e5e7eb; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            
            .print-container { 
              width: 100%;
              max-width: 1300px;
            }
            
            .cards-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            
            /* CARTÃO TIPO CARTEIRINHA - DESIGN PROFISSIONAL */
            .card {
              width: 100%;
              aspect-ratio: 1.587;
              background: linear-gradient(135deg, #1a365d 0%, #0f172a 100%);
              border: 2px solid #d97706;
              border-radius: 10px;
              padding: 14px;
              display: grid;
              grid-template-columns: 70px 1fr 60px;
              gap: 10px;
              box-shadow: 0 10px 30px rgba(26, 54, 93, 0.4);
              page-break-inside: avoid;
              position: relative;
              overflow: hidden;
              color: white;
            }
            
            .card::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(217, 119, 6, 0.03) 1px, transparent 1px);
              background-size: 15px 15px;
              z-index: 0;
            }

            .card-content {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
            }

            /* COLUNA 1: Logo e Criador */
            .col-logo {
              display: flex;
              flex-direction: column;
              gap: 8px;
              grid-row: 1 / -1;
            }

            .logo-badge {
              width: 70px;
              height: 70px;
              background: linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%);
              border: 2px solid #d97706;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2);
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
              color: #fbbf24;
              text-align: center;
              line-height: 1.2;
              word-break: break-word;
            }

            /* COLUNA 2: Dados da Ave - CENTRO */
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
              color: #fbbf24;
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
              color: #cbd5e1;
              font-weight: 600;
              white-space: nowrap;
            }

            .data-value {
              color: #fbbf24;
              font-weight: 700;
            }

            .tag-species {
              display: inline-block;
              background: rgba(217, 119, 6, 0.2);
              border: 1px solid #d97706;
              color: #fbbf24;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 7px;
              font-weight: 700;
              text-transform: uppercase;
              margin-top: 2px;
            }

            /* COLUNA 3: QR Code */
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
              border: 2px solid #d97706;
              border-radius: 6px;
              padding: 2px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .footer-info {
              font-size: 7px;
              color: #cbd5e1;
              text-align: center;
              line-height: 1.2;
              word-break: break-word;
            }

            .footer-date {
              font-size: 6px;
              color: #64748b;
            }

            @media print {
              html, body { background: white; padding: 0; }
              .card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="cards-grid">
              <!-- Cartão 1 -->
              <div class="card">
                <div class="col-logo">
                  <div class="logo-badge">
                    <img src="${breederLogo || APP_LOGO_ICON}" alt="Logo" />
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
                    <img src="${qrUrl}" alt="QR Code" />
                  </div>
                  <div class="footer-info">ID:<br/>${bird.id.substring(0, 8).toUpperCase()}</div>
                  <div class="footer-date">${printDate}</div>
                </div>
              </div>

              <!-- Cartão 2 (duplicado para imprimir 2 por página) -->
              <div class="card">
                <div class="col-logo">
                  <div class="logo-badge">
                    <img src="${breederLogo || APP_LOGO_ICON}" alt="Logo" />
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
                    <img src="${qrUrl}" alt="QR Code" />
                  </div>
                  <div class="footer-info">ID:<br/>${bird.id.substring(0, 8).toUpperCase()}</div>
                  <div class="footer-date">${printDate}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
      title="Imprimir cartão do pássaro"
    >
      <Printer size={16} />
      Imprimir Cartão
    </button>
  );
};

export default BirdCardPrint;
