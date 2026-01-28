import React from 'react';
import { Bird as BirdIcon } from 'lucide-react';
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
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cartão - ${bird.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
            .print-container { max-width: 600px; margin: 0 auto; }
            .card {
              width: 100%;
              height: 350px;
              background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
              border: 3px solid #1a365d;
              border-radius: 16px;
              padding: 24px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              page-break-inside: avoid;
              position: relative;
              overflow: hidden;
            }
            
            .card::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 400px;
              height: 400px;
              background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
              border-radius: 50%;
            }

            .card-content { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; }
            
            .header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #e2e8f0;
            }

            .logo-container {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #eff6ff 0%, #f0f4f8 100%);
              border: 2px solid #cbd5e1;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              padding: 8px;
            }

            .logo-container img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }

            .breeder-info h2 {
              font-size: 18px;
              font-weight: 700;
              color: #1a365d;
              margin-bottom: 4px;
              line-height: 1.2;
            }

            .breeder-info p {
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
            }

            .bird-circle {
              position: relative;
              width: 180px;
              height: 180px;
              margin: 0 auto;
              background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
              border: 3px solid #f59e0b;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: inset 0 0 10px rgba(0,0,0,0.05), 0 4px 12px rgba(245, 158, 11, 0.2);
            }

            .bird-circle-content {
              text-align: center;
              font-weight: 700;
              color: #92400e;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .bird-name {
              font-size: 16px;
              font-weight: 700;
              color: #1a365d;
              margin-bottom: 8px;
            }

            .bird-details {
              font-size: 11px;
              color: #64748b;
              line-height: 1.6;
            }

            .bird-details-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #e2e8f0;
            }

            .bird-details-row:last-child {
              border-bottom: none;
            }

            .label {
              font-weight: 600;
              color: #475569;
            }

            .value {
              font-weight: 500;
              color: #1a365d;
              text-align: right;
            }

            .footer {
              grid-column: 1 / -1;
              padding-top: 12px;
              border-top: 2px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #64748b;
            }

            .footer-left {
              font-style: italic;
              font-weight: 500;
            }

            .footer-right {
              font-weight: 600;
              color: #2563eb;
            }

            .species-tag {
              display: inline-block;
              background: #dbeafe;
              color: #1e40af;
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 600;
              margin-top: 6px;
            }

            @media (max-width: 600px) {
              .card {
                grid-template-columns: 1fr;
                height: auto;
              }
              .bird-circle {
                width: 140px;
                height: 140px;
              }
            }

            @media print {
              body { background: white; padding: 0; }
              .card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="card">
              <div class="card-content">
                <div class="header">
                  <div class="logo-container">
                    <img src="${breederLogo || APP_LOGO_ICON}" alt="Logo" />
                  </div>
                  <div class="breeder-info">
                    <h2>${breederName}</h2>
                    ${sispassNumber ? `<p>SISPASS: ${sispassNumber}</p>` : ''}
                    <p>Criador Registrado</p>
                  </div>
                </div>

                <div>
                  <div class="bird-name">${bird.name || 'Sem nome'}</div>
                  ${bird.species ? `<span class="species-tag">${bird.species}</span>` : ''}
                </div>

                <div class="bird-details">
                  ${bird.ringNumber ? `
                    <div class="bird-details-row">
                      <span class="label">Anilha:</span>
                      <span class="value">${bird.ringNumber}</span>
                    </div>
                  ` : ''}
                  ${bird.sex ? `
                    <div class="bird-details-row">
                      <span class="label">Sexo:</span>
                      <span class="value">${bird.sex}</span>
                    </div>
                  ` : ''}
                  ${bird.birthDate ? `
                    <div class="bird-details-row">
                      <span class="label">Nasc.:</span>
                      <span class="value">${new Date(bird.birthDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ` : ''}
                  ${bird.colorMutation ? `
                    <div class="bird-details-row">
                      <span class="label">Mutação:</span>
                      <span class="value">${bird.colorMutation}</span>
                    </div>
                  ` : ''}
                  ${bird.classification ? `
                    <div class="bird-details-row">
                      <span class="label">Class.:</span>
                      <span class="value">${bird.classification}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="card-content">
                <div class="bird-circle">
                  <div class="bird-circle-content">
                    <div>${bird.species || 'Espécie'}</div>
                    <div style="font-size: 12px; margin-top: 8px;">${bird.sex === 'Macho' ? '♂ Macho' : bird.sex === 'Fêmea' ? '♀ Fêmea' : '? Indeterminado'}</div>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 12px;">
                  ${bird.status ? `
                    <div style="padding: 6px 12px; background: ${bird.status === 'Ativo' ? '#d1fae5' : '#fecaca'}; border-radius: 6px; color: ${bird.status === 'Ativo' ? '#065f46' : '#991b1b'}; font-weight: 600; font-size: 11px;">
                      Status: ${bird.status}
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="footer">
                <div class="footer-left">AviGestão - Sistema de Gestão de Criatório</div>
                <div class="footer-right">ID: ${bird.id.substring(0, 8).toUpperCase()}</div>
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
      <BirdIcon size={16} />
      Imprimir Cartão
    </button>
  );
};

export default BirdCardPrint;
