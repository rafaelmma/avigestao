import React, { useState } from 'react';
import { Award, Download, Share2 } from 'lucide-react';
import { Bird, TournamentEvent } from '../types';
import { APP_LOGO_ICON } from '../constants';

interface BirdCertificateProps {
  bird: Bird;
  event: TournamentEvent;
  breederName: string;
  breederLogo?: string;
  sispassNumber?: string;
}

const BirdCertificate: React.FC<BirdCertificateProps> = ({
  bird,
  event,
  breederName,
  breederLogo,
  sispassNumber,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Gera QR code para verificação
  const generateQRCode = (text: string) => {
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?format=png&size=100x100&data=${encoded}`;
  };

  const handleGenerateCertificate = () => {
    setIsGenerating(true);
    const printWindow = window.open('', '', 'width=1000,height=800');

    if (printWindow) {
      const verificationUrl = `${window.location.origin}/bird/${bird.id}`;
      const qrUrl = generateQRCode(verificationUrl);
      const certificateDate = new Date().toLocaleDateString('pt-BR');
      const eventDate = new Date(event.date).toLocaleDateString('pt-BR');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Certificado - ${bird.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              font-family: 'Georgia', 'Garamond', serif;
              background: #f5f1e8;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }

            .certificate {
              width: 100%;
              max-width: 900px;
              aspect-ratio: 1.4;
              background: linear-gradient(135deg, #fef9f3 0%, #fffbf7 100%);
              border: 8px solid #d4af37;
              border-radius: 20px;
              padding: 60px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.2);
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .certificate::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 8px;
              background: linear-gradient(90deg, #d4af37, #f39c12, #d4af37);
            }

            .certificate::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 8px;
              background: linear-gradient(90deg, #d4af37, #f39c12, #d4af37);
            }

            .corners {
              position: absolute;
              width: 30px;
              height: 30px;
              border: 2px solid #d4af37;
            }

            .corner-tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
            .corner-tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
            .corner-bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
            .corner-br { bottom: 20px; right: 20px; border-left: none; border-top: none; }

            .content {
              position: relative;
              z-index: 10;
              text-align: center;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }

            .logo-box {
              width: 80px;
              height: 80px;
              background: white;
              border: 2px solid #d4af37;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 4px;
            }

            .logo-box img {
              max-width: 90%;
              max-height: 90%;
              object-fit: contain;
            }

            .trophy-icon {
              font-size: 60px;
            }

            .qr-box {
              width: 80px;
              height: 80px;
              background: white;
              border: 2px solid #d4af37;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 4px;
            }

            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            h1 {
              font-size: 48px;
              color: #d4af37;
              font-weight: bold;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 3px;
            }

            .subtitle {
              font-size: 18px;
              color: #333;
              margin-bottom: 30px;
              font-style: italic;
            }

            .bird-info {
              background: rgba(212, 175, 55, 0.05);
              border: 2px dashed #d4af37;
              border-radius: 10px;
              padding: 20px;
              margin: 20px 0;
            }

            .bird-name {
              font-size: 36px;
              font-weight: bold;
              color: #1a365d;
              margin-bottom: 10px;
            }

            .bird-details {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
              font-size: 14px;
              color: #555;
            }

            .detail-item {
              border-right: 1px solid #d4af37;
            }

            .detail-item:last-child {
              border-right: none;
            }

            .detail-label {
              font-weight: bold;
              color: #333;
              font-size: 12px;
              text-transform: uppercase;
            }

            .detail-value {
              color: #1a365d;
              font-weight: bold;
              margin-top: 2px;
            }

            .event-info {
              margin-top: 20px;
            }

            .event-title {
              font-size: 20px;
              font-weight: bold;
              color: #1a365d;
              margin-bottom: 8px;
            }

            .event-details {
              display: flex;
              justify-content: center;
              gap: 30px;
              font-size: 14px;
              color: #555;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 20px;
            }

            .breeder-info {
              text-align: left;
              font-size: 12px;
            }

            .breeder-name {
              font-weight: bold;
              color: #1a365d;
            }

            .breeder-sispass {
              color: #666;
              font-size: 11px;
            }

            .signature-line {
              width: 150px;
              border-top: 2px solid #333;
              font-size: 12px;
              color: #333;
              margin-top: 5px;
              text-align: center;
            }

            .date-issued {
              text-align: right;
              font-size: 12px;
              color: #666;
            }

            @media print {
              body { background: white; padding: 0; }
              .certificate { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="corners corner-tl"></div>
            <div class="corners corner-tr"></div>
            <div class="corners corner-bl"></div>
            <div class="corners corner-br"></div>

            <div class="content">
              <div class="header">
                <div class="logo-box">
                  <img src="${
                    breederLogo || APP_LOGO_ICON
                  }" alt="Logo" onerror="this.style.display='none'" />
                </div>
                <div class="trophy-icon">🏆</div>
                <div class="qr-box">
                  <img src="${qrUrl}" alt="QR Code" />
                </div>
              </div>

              <div>
                <h1>Certificado de Honra</h1>
                <div class="subtitle">Por Excelência em Concurso Avícola</div>

                <div class="bird-info">
                  <div class="bird-name">${bird.name.toUpperCase()}</div>
                  <div class="bird-details">
                    <div class="detail-item">
                      <div class="detail-label">Espécie</div>
                      <div class="detail-value">${bird.species}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Anilha</div>
                      <div class="detail-value">${bird.ringNumber || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Sexo</div>
                      <div class="detail-value">${bird.sex}</div>
                    </div>
                  </div>
                </div>

                <p style="font-size: 16px; color: #333; margin: 20px 0; font-style: italic;">
                  Este pássaro conquistou primeira colocação em
                </p>

                <div class="event-info">
                  <div class="event-title">${event.title}</div>
                  <div class="event-details">
                    <div>📍 ${event.location}</div>
                    <div>📅 ${eventDate}</div>
                    <div>🏅 ${event.category}</div>
                  </div>
                </div>

                <p style="font-size: 14px; color: #333; margin-top: 20px;">
                  Certificamos este mérito e autenticidade através do sistema AviGestão
                </p>
              </div>

              <div class="footer">
                <div class="breeder-info">
                  <div class="breeder-name">${breederName}</div>
                  ${
                    sispassNumber
                      ? `<div class="breeder-sispass">SISPASS: ${sispassNumber}</div>`
                      : ''
                  }
                  <div class="signature-line">Assinatura do Criador</div>
                </div>

                <div class="date-issued">
                  <div>Emitido em ${certificateDate}</div>
                  <div style="font-size: 10px; margin-top: 5px;">ID: ${bird.id
                    .substring(0, 8)
                    .toUpperCase()}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    const text = `🏆 Confira o certificado de ${bird.name}! ${bird.name} conquistou 1º lugar em ${event.title}`;
    if (navigator.share) {
      navigator.share({ title: 'Certificado', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Texto copiado!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <Award size={16} className="text-blue-600" />
        <span>Gerar certificado de honra para este campeão</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleGenerateCertificate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all"
        >
          <Download size={16} />
          {isGenerating ? 'Gerando...' : 'Gerar Certificado'}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-all"
        >
          <Share2 size={16} />
          Compartilhar
        </button>
      </div>
    </div>
  );
};

export default BirdCertificate;
