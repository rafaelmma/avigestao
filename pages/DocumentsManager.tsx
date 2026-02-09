import React, { useState, useEffect, useRef } from 'react';
import { BreederSettings, CertificateType } from '../types';
import {
  FileBadge,
  ShieldCheck,
  ExternalLink,
  CreditCard,
  Cloud,
  FileKey,
  Usb,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Save,
  X,
  Calendar,
  Info,
  Pencil,
} from 'lucide-react';
import WizardLayout, { WizardStep } from '../components/WizardLayout';

interface DocumentsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
  onSave?: (settings: BreederSettings) => void;
}

const CERTIFICATE_TYPES: CertificateType[] = [
  'A1 (Arquivo)',
  'A3 (Token USB)',
  'A3 (Cartão)',
  'Nuvem (BirdID/Vidaas)',
];

const DocumentsManager: React.FC<DocumentsManagerProps> = ({
  settings,
  updateSettings,
  onSave,
}) => {
  // State para o Modal de Renovação
  const [renewingItem, setRenewingItem] = useState<'sispass' | 'certificate' | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    renewalDate: new Date().toISOString().split('T')[0], // Data que foi feita a renovação (Hoje)
    newExpiryDate: '', // Nova data de vencimento
  });

  // Funções Auxiliares de Data e Progresso
  const getDaysRemaining = (dateString?: string) => {
    if (!dateString) return 0;
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  const [editSispassNumber, setEditSispassNumber] = useState(false);
  const [editCertificateIssuer, setEditCertificateIssuer] = useState(false);
  const sispassFileInputRef = useRef<HTMLInputElement>(null);

  const handleSispassFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ ...settings, sispassDocumentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAttachment = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length < 2) return;
      const meta = parts[0];
      const data = parts[1];
      const match = /data:(.*?);base64/.exec(meta);
      const mime = match ? match[1] : 'application/octet-stream';
      const byteChars = atob(data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = url;
    }
  };
  const calculateProgress = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getStatusColor = (days: number) => {
    if (days < 0) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (days < 30) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  const getStatusText = (days: number) => {
    if (days < 0) return 'Vencido';
    if (days < 30) return 'Vence em breve';
    return 'Regular';
  };

  const renderCertIcon = (type: CertificateType) => {
    switch (type) {
      case 'A1 (Arquivo)':
        return <FileKey size={24} />;
      case 'A3 (Token USB)':
        return <Usb size={24} />;
      case 'A3 (Cartão)':
        return <CreditCard size={24} />;
      case 'Nuvem (BirdID/Vidaas)':
        return <Cloud size={24} />;
      default:
        return <ShieldCheck size={24} />;
    }
  };

  const handleOpenRenewal = (type: 'sispass' | 'certificate') => {
    setRenewingItem(type);

    // Tenta sugerir uma data de validade (1 ano para frente)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    setRenewalForm({
      renewalDate: new Date().toISOString().split('T')[0],
      newExpiryDate: nextYear.toISOString().split('T')[0],
    });
  };

  const handleConfirmRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (renewingItem === 'sispass') {
      const updatedSettings = {
        ...settings,
        lastRenewalDate: renewalForm.renewalDate,
        renewalDate: renewalForm.newExpiryDate,
      };
      updateSettings(updatedSettings);
      onSave?.(updatedSettings);
    } else if (renewingItem === 'certificate') {
      const updatedSettings = {
        ...settings,
        certificate: {
          ...settings.certificate!,
          expiryDate: renewalForm.newExpiryDate,
        },
      };
      updateSettings(updatedSettings);
      onSave?.(updatedSettings);
    }
    setRenewingItem(null);
  };

  const isSispassConfigured = !!settings.sispassNumber && settings.sispassNumber !== '1234567-8';
  const isCertificateConfigured =
    !!settings.certificate?.issuer ||
    !!settings.certificate?.expiryDate ||
    !!settings.certificate?.installed;
  const daysSispass = isSispassConfigured ? getDaysRemaining(settings.renewalDate) : 0;
  const daysCert = isCertificateConfigured ? getDaysRemaining(settings.certificate?.expiryDate) : 0;
  const hasAnyDocs = isSispassConfigured || isCertificateConfigured;

  const overallStatus = !hasAnyDocs
    ? 'neutral'
    : daysSispass > 30 && daysCert > 30
    ? 'good'
    : daysSispass < 0 || daysCert < 0
    ? 'critical'
    : 'warning';

  const sispassNumberValue = isSispassConfigured ? settings.sispassNumber : '';
  const renewalDateValue = isSispassConfigured ? settings.renewalDate : '';
  const lastRenewalValue = isSispassConfigured ? settings.lastRenewalDate || '' : '';
  const certificateIssuerValue = isCertificateConfigured ? settings.certificate?.issuer || '' : '';
  const certificateExpiryValue = isCertificateConfigured
    ? settings.certificate?.expiryDate || ''
    : '';
  const sispassActionLabel = isSispassConfigured ? 'Registrar Renovação' : 'Registrar Licença';
  const certificateActionLabel = isCertificateConfigured
    ? 'Atualizar Validade'
    : 'Registrar Certificado';

  useEffect(() => {
    if (!isSispassConfigured) {
      setEditSispassNumber(true);
    }
  }, [isSispassConfigured]);

  useEffect(() => {
    if (!isCertificateConfigured) {
      setEditCertificateIssuer(true);
    }
  }, [isCertificateConfigured]);

  const wizardSteps: WizardStep[] = [
    {
      id: 'sispass',
      label: 'SISPASS',
      description: 'Controle da licença e anexos do SISPASS/CTF.',
      content: (
        <div className="space-y-8">
          <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500">
              <Info size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Importante</p>
              <p className="text-xs text-slate-600">
                As licenças ficam vinculadas aos dados cadastrados em Configurações (CPF/CNPJ,
                número SISPASS e datas).
              </p>
            </div>
          </div>

          <div
            className={`p-6 rounded-[24px] border flex items-start gap-4 ${
              overallStatus === 'neutral'
                ? 'bg-slate-50 border-slate-100'
                : overallStatus === 'good'
                ? 'bg-emerald-50 border-emerald-100'
                : overallStatus === 'warning'
                ? 'bg-amber-50 border-amber-100'
                : 'bg-rose-50 border-rose-100'
            }`}
          >
            <div
              className={`p-3 rounded-xl shadow-sm ${
                overallStatus === 'neutral'
                  ? 'bg-slate-200 text-slate-600'
                  : overallStatus === 'good'
                  ? 'bg-emerald-500 text-white'
                  : overallStatus === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {overallStatus === 'good' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h3
                className={`text-lg font-black ${
                  overallStatus === 'neutral'
                    ? 'text-slate-800'
                    : overallStatus === 'good'
                    ? 'text-emerald-800'
                    : overallStatus === 'warning'
                    ? 'text-amber-800'
                    : 'text-rose-800'
                }`}
              >
                {overallStatus === 'neutral'
                  ? 'Comece por aqui'
                  : overallStatus === 'good'
                  ? 'Documentação Regular'
                  : overallStatus === 'warning'
                  ? 'Atenção Necessária'
                  : 'Situação Irregular'}
              </h3>
              <p
                className={`text-sm font-medium mt-1 ${
                  overallStatus === 'neutral'
                    ? 'text-slate-600'
                    : overallStatus === 'good'
                    ? 'text-emerald-700'
                    : overallStatus === 'warning'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {overallStatus === 'neutral'
                  ? 'Registre sua licença SISPASS e seu certificado digital para acompanhar a validade.'
                  : overallStatus === 'good'
                  ? 'Todas as suas licenças e certificados estão em dia.'
                  : overallStatus === 'warning'
                  ? 'Alguns documentos estão próximos do vencimento. Verifique abaixo.'
                  : 'Um ou mais documentos essenciais estão vencidos. Regularize imediatamente.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                      <FileBadge size={20} />
                    </div>
                    Licença SISPASS
                  </h3>
                  <p className="text-slate-400 text-[10px] font-medium mt-1 ml-11">
                    CTF Federal / IBAMA
                  </p>
                </div>
                {isSispassConfigured && (
                  <div className="text-right">
                    <span
                      className={`block text-3xl font-black ${
                        daysSispass < 30 ? 'text-amber-500' : 'text-slate-800'
                      }`}
                    >
                      {daysSispass}
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      Dias Restantes
                    </span>
                  </div>
                )}
              </div>

              {isSispassConfigured ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>
                      Renovação: {new Date(lastRenewalValue || '').toLocaleDateString('pt-BR')}
                    </span>
                    <span>
                      Vencimento: {new Date(renewalDateValue).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-50">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        daysSispass < 30
                          ? 'bg-amber-500'
                          : daysSispass < 0
                          ? 'bg-rose-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${calculateProgress(lastRenewalValue, renewalDateValue)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(
                        daysSispass,
                      )}`}
                    >
                      {getStatusText(daysSispass)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-500">
                  Informe sua licença SISPASS para acompanhar vencimentos e lembretes.
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-2 flex items-center gap-2">
                      <span>Numero de Registro SISPASS</span>
                      {isSispassConfigured && !editSispassNumber && (
                        <Pencil size={12} className="text-blue-400" />
                      )}
                    </label>
                    <div className="relative">
                      <input
                        className={`w-full font-mono font-bold text-slate-800 outline-none text-sm rounded-xl px-3 py-2 transition-all ${
                          editSispassNumber
                            ? 'bg-blue-50 border-2 border-blue-400 focus:border-blue-500'
                            : 'bg-white border border-blue-200 focus:border-blue-400'
                        } ${
                          isSispassConfigured && !editSispassNumber
                            ? 'cursor-pointer hover:bg-blue-50'
                            : ''
                        }`}
                        placeholder="Ex: 1234567-8 (numero do registro)"
                        value={sispassNumberValue}
                        onChange={(e) =>
                          updateSettings({ ...settings, sispassNumber: e.target.value })
                        }
                        disabled={isSispassConfigured && !editSispassNumber}
                        onBlur={() => {
                          if (isSispassConfigured) setEditSispassNumber(false);
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Digite o numero do registro da sua licenca no SISPASS.
                    </p>
                    {isSispassConfigured && !editSispassNumber && (
                      <button
                        type="button"
                        onClick={() => setEditSispassNumber(true)}
                        className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Pencil size={12} /> Editar numero
                      </button>
                    )}
                    {editSispassNumber && (
                      <button
                        type="button"
                        onClick={() => setEditSispassNumber(false)}
                        className="absolute right-3 top-9 text-blue-500 hover:text-blue-700 transition-colors"
                        title="Salvar"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Renovacao
                    </label>
                    <input
                      type="date"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none text-xs"
                      value={renewalDateValue}
                      onChange={(e) => updateSettings({ ...settings, renewalDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="bg-white border border-blue-100 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Anexo SISPASS (registro de aves)
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Envie o PDF ou imagem com a relacao dos passaros.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => sispassFileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {settings.sispassDocumentUrl ? 'Substituir' : 'Anexar'}
                    </button>
                  </div>
                  {settings.sispassDocumentUrl ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openAttachment(settings.sispassDocumentUrl as string)}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-600"
                      >
                        Visualizar anexo
                      </button>
                      <a
                        href={settings.sispassDocumentUrl}
                        download="sispass-registro"
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-600"
                      >
                        Baixar
                      </a>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                      Sem anexo
                    </p>
                  )}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    ref={sispassFileInputRef}
                    className="hidden"
                    onChange={handleSispassFileUpload}
                  />
                </div>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => handleOpenRenewal('sispass')}
                  className="w-full py-3 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <CalendarClock size={16} /> {sispassActionLabel}
                </button>
                <a
                  href="https://servicos.ibama.gov.br/ctf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  Acessar Site do IBAMA <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'certificado',
      label: 'Certificado',
      description: 'Dados do certificado digital e validações.',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                    {renderCertIcon(settings.certificate?.type || 'A1 (Arquivo)')}
                  </div>
                  Certificado Digital
                </h3>
                <p className="text-slate-400 text-[10px] font-medium mt-1 ml-11">
                  e-CPF / A3 / Nuvem
                </p>
              </div>
              {isCertificateConfigured && (
                <div className="text-right">
                  <span
                    className={`block text-3xl font-black ${
                      daysCert < 30 ? 'text-amber-500' : 'text-slate-800'
                    }`}
                  >
                    {daysCert}
                  </span>
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Dias Restantes
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Modelo do Certificado
              </label>
              <div className="relative">
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500 appearance-none text-xs"
                  value={settings.certificate?.type || 'A1 (Arquivo)'}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      certificate: {
                        ...settings.certificate!,
                        type: e.target.value as CertificateType,
                      },
                    })
                  }
                >
                  {CERTIFICATE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ShieldCheck size={14} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <span>Emissor</span>
                  {isCertificateConfigured && !editCertificateIssuer && (
                    <Pencil size={12} className="text-emerald-400" />
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: Serasa"
                    className={`w-full px-3 py-2 rounded-xl font-bold text-slate-700 outline-none text-xs transition-all ${
                      editCertificateIssuer
                        ? 'bg-emerald-50 border-2 border-emerald-400 focus:border-emerald-500'
                        : 'bg-white border border-slate-200 focus:border-emerald-500'
                    } ${
                      isCertificateConfigured && !editCertificateIssuer
                        ? 'cursor-pointer hover:bg-emerald-50'
                        : ''
                    }`}
                    value={certificateIssuerValue}
                    disabled={isCertificateConfigured && !editCertificateIssuer}
                    onBlur={(e) => {
                      if (isCertificateConfigured) setEditCertificateIssuer(false);
                      const newSettings = {
                        ...settings,
                        certificate: {
                          issuer: e.target.value,
                          expiryDate: settings.certificate?.expiryDate || '',
                          installed: true,
                          type: settings.certificate?.type || 'A1 (Arquivo)',
                        },
                      };
                      updateSettings(newSettings);
                      onSave?.(newSettings);
                    }}
                    onChange={(e) => {
                      updateSettings({
                        ...settings,
                        certificate: {
                          issuer: e.target.value,
                          expiryDate: settings.certificate?.expiryDate || '',
                          installed: true,
                          type: settings.certificate?.type || 'A1 (Arquivo)',
                        },
                      });
                    }}
                  />
                  {editCertificateIssuer && (
                    <button
                      type="button"
                      onClick={() => setEditCertificateIssuer(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-700"
                      title="Salvar"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                </div>
                {isCertificateConfigured && !editCertificateIssuer && (
                  <button
                    type="button"
                    onClick={() => setEditCertificateIssuer(true)}
                    className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <Pencil size={12} /> Editar emissor
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Validade
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-xs focus:border-emerald-500"
                  value={certificateExpiryValue}
                  onBlur={(e) => {
                    const newSettings = {
                      ...settings,
                      certificate: {
                        issuer: settings.certificate?.issuer || '',
                        expiryDate: e.target.value,
                        installed: true,
                        type: settings.certificate?.type || 'A1 (Arquivo)',
                      },
                    };
                    updateSettings(newSettings);
                    onSave?.(newSettings);
                  }}
                  onChange={(e) => {
                    updateSettings({
                      ...settings,
                      certificate: {
                        issuer: settings.certificate?.issuer || '',
                        expiryDate: e.target.value,
                        installed: true,
                        type: settings.certificate?.type || 'A1 (Arquivo)',
                      },
                    });
                  }}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleOpenRenewal('certificate')}
                className="w-full py-3 bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                <CalendarClock size={16} /> {certificateActionLabel}
              </button>
              <a
                href="https://ccd.serpro.gov.br/testeaqui/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                title="Abrir teste do Serpro para validar leitura do certificado A3/A1"
              >
                <ShieldCheck size={16} /> Testar Leitura {settings.certificate?.type?.split(' ')[0]}
              </a>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <WizardLayout title="Licenças & Documentos" steps={wizardSteps} showNavigation={false} />

      {renewingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <CalendarClock size={20} className="text-brand" />
                Renovar {renewingItem === 'sispass' ? 'SISPASS' : 'Certificado'}
              </h3>
              <button
                onClick={() => setRenewingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConfirmRenewal} className="p-8 space-y-6">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-xs font-bold text-blue-800 mb-1">Atualização de Datas</p>
                  <p className="text-[10px] text-blue-600 leading-relaxed">
                    Informe quando a renovação foi realizada e qual a nova data limite para manter o
                    painel atualizado.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Data da Renovação (Pagamento/Emissão)
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                    value={renewalForm.renewalDate}
                    onChange={(e) =>
                      setRenewalForm({ ...renewalForm, renewalDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Nova Data de Vencimento
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand font-bold text-slate-700"
                    value={renewalForm.newExpiryDate}
                    onChange={(e) =>
                      setRenewalForm({ ...renewalForm, newExpiryDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
              >
                <Save size={18} /> Salvar Nova Validade
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsManager;
