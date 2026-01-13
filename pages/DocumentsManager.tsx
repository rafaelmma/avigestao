
import React, { useState } from 'react';
import { BreederSettings, CertificateType } from '../types';
import { FileBadge, ShieldCheck, ExternalLink, CreditCard, Cloud, FileKey, Usb, AlertTriangle, CheckCircle2, CalendarClock, Save, X, Calendar } from 'lucide-react';

interface DocumentsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
}

const CERTIFICATE_TYPES: CertificateType[] = ['A1 (Arquivo)', 'A3 (Token USB)', 'A3 (Cartão)', 'Nuvem (BirdID/Vidaas)'];

const DocumentsManager: React.FC<DocumentsManagerProps> = ({ settings, updateSettings }) => {
  
  // State para o Modal de Renovação
  const [renewingItem, setRenewingItem] = useState<'sispass' | 'certificate' | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    renewalDate: new Date().toISOString().split('T')[0], // Data que foi feita a renovação (Hoje)
    newExpiryDate: '' // Nova data de vencimento
  });

  // Funções Auxiliares de Data e Progresso
  const getDaysRemaining = (dateString?: string) => {
    if (!dateString) return 0;
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
        case 'A1 (Arquivo)': return <FileKey size={24} />;
        case 'A3 (Token USB)': return <Usb size={24} />;
        case 'A3 (Cartão)': return <CreditCard size={24} />;
        case 'Nuvem (BirdID/Vidaas)': return <Cloud size={24} />;
        default: return <ShieldCheck size={24} />;
    }
  };

  const handleOpenRenewal = (type: 'sispass' | 'certificate') => {
    setRenewingItem(type);
    
    // Tenta sugerir uma data de validade (1 ano para frente)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    setRenewalForm({
      renewalDate: new Date().toISOString().split('T')[0],
      newExpiryDate: nextYear.toISOString().split('T')[0]
    });
  };

  const handleConfirmRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (renewingItem === 'sispass') {
      updateSettings({
        ...settings,
        lastRenewalDate: renewalForm.renewalDate,
        renewalDate: renewalForm.newExpiryDate
      });
    } else if (renewingItem === 'certificate') {
      updateSettings({
        ...settings,
        certificate: {
          ...settings.certificate!,
          expiryDate: renewalForm.newExpiryDate
          // Nota: O tipo DigitalCertificateData atualmente não armazena a data de emissão,
          // apenas a de validade. Se necessário, poderíamos adicionar ao type.ts
        }
      });
    }
    setRenewingItem(null);
  };

  const daysSispass = getDaysRemaining(settings.renewalDate);
  const daysCert = getDaysRemaining(settings.certificate?.expiryDate);
  
  const overallStatus = (daysSispass > 30 && daysCert > 30) ? 'good' : (daysSispass < 0 || daysCert < 0) ? 'critical' : 'warning';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Licenças & Documentos</h2>
        <p className="text-slate-500 font-medium">Controle de legalidade do criatório junto aos órgãos ambientais.</p>
      </header>

      {/* Status Geral Banner */}
      <div className={`p-6 rounded-[24px] border flex items-start gap-4 ${
        overallStatus === 'good' ? 'bg-emerald-50 border-emerald-100' : 
        overallStatus === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'
      }`}>
         <div className={`p-3 rounded-xl shadow-sm ${
            overallStatus === 'good' ? 'bg-emerald-500 text-white' : 
            overallStatus === 'warning' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
         }`}>
            {overallStatus === 'good' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
         </div>
         <div>
            <h3 className={`text-lg font-black ${
               overallStatus === 'good' ? 'text-emerald-800' : 
               overallStatus === 'warning' ? 'text-amber-800' : 'text-rose-800'
            }`}>
               {overallStatus === 'good' ? 'Documentação Regular' : 
                overallStatus === 'warning' ? 'Atenção Necessária' : 'Situação Irregular'}
            </h3>
            <p className={`text-sm font-medium mt-1 ${
               overallStatus === 'good' ? 'text-emerald-700' : 
               overallStatus === 'warning' ? 'text-amber-700' : 'text-rose-700'
            }`}>
               {overallStatus === 'good' ? 'Todas as suas licenças e certificados estão em dia.' :
                overallStatus === 'warning' ? 'Alguns documentos estão próximos do vencimento. Verifique abaixo.' :
                'Um ou mais documentos essenciais estão vencidos. Regularize imediatamente.'}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Cartão SISPASS */}
           <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><FileBadge size={20} /></div>
                      Licença SISPASS
                    </h3>
                    <p className="text-slate-400 text-[10px] font-medium mt-1 ml-11">CTF Federal / IBAMA</p>
                 </div>
                 
                 <div className="text-right">
                    <span className={`block text-3xl font-black ${daysSispass < 30 ? 'text-amber-500' : 'text-slate-800'}`}>{daysSispass}</span>
                    <span className="text-[9px] font-black uppercase text-slate-400">Dias Restantes</span>
                 </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Renovação: {new Date(settings.lastRenewalDate || '').toLocaleDateString('pt-BR')}</span>
                    <span>Vencimento: {new Date(settings.renewalDate).toLocaleDateString('pt-BR')}</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-50">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        daysSispass < 30 ? 'bg-amber-500' : 
                        daysSispass < 0 ? 'bg-rose-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${calculateProgress(settings.lastRenewalDate, settings.renewalDate)}%` }}
                    ></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${getStatusColor(daysSispass)}`}>
                       {getStatusText(daysSispass)}
                    </span>
                 </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nº Registro</label>
                    <input 
                      className="w-full bg-transparent font-mono font-bold text-slate-700 outline-none text-sm"
                      value={settings.sispassNumber}
                      onChange={(e) => updateSettings({...settings, sispassNumber: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Renovação</label>
                    <input 
                      type="date"
                      className="w-full bg-transparent font-bold text-slate-700 outline-none text-xs"
                      value={settings.renewalDate}
                      onChange={(e) => updateSettings({...settings, renewalDate: e.target.value})}
                    />
                 </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                 <button 
                   onClick={() => handleOpenRenewal('sispass')}
                   className="w-full py-3 bg-brand text-white shadow-lg shadow-brand/20 hover:bg-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                 >
                   <CalendarClock size={16} /> Registrar Renovação
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

           {/* Cartão Certificado Digital */}
           <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                        {renderCertIcon(settings.certificate?.type || 'A1 (Arquivo)')}
                      </div>
                      Certificado Digital
                    </h3>
                    <p className="text-slate-400 text-[10px] font-medium mt-1 ml-11">e-CPF / A3 / Nuvem</p>
                 </div>
                 
                 {settings.certificate?.expiryDate && (
                   <div className="text-right">
                      <span className={`block text-3xl font-black ${daysCert < 30 ? 'text-amber-500' : 'text-slate-800'}`}>{daysCert}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400">Dias Restantes</span>
                   </div>
                 )}
              </div>

              {/* Seletor de Tipo */}
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Modelo do Certificado</label>
                 <div className="relative">
                   <select 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500 appearance-none text-xs"
                     value={settings.certificate?.type || 'A1 (Arquivo)'}
                     onChange={(e) => updateSettings({
                       ...settings,
                       certificate: { ...settings.certificate!, type: e.target.value as CertificateType }
                     })}
                   >
                     {CERTIFICATE_TYPES.map(type => (
                       <option key={type} value={type}>{type}</option>
                     ))}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ShieldCheck size={14} />
                   </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Emissor</label>
                    <input 
                      type="text"
                      placeholder="Ex: Serasa"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-xs focus:border-emerald-500"
                      value={settings.certificate?.issuer || ''}
                      onChange={(e) => updateSettings({
                        ...settings, 
                        certificate: { ...settings.certificate!, issuer: e.target.value, installed: true }
                      })}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Validade</label>
                    <input 
                      type="date"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-xs focus:border-emerald-500"
                      value={settings.certificate?.expiryDate || ''}
                      onChange={(e) => updateSettings({
                        ...settings, 
                        certificate: { ...settings.certificate!, expiryDate: e.target.value, installed: true }
                      })}
                    />
                 </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                 <button 
                   onClick={() => handleOpenRenewal('certificate')}
                   className="w-full py-3 bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                 >
                   <CalendarClock size={16} /> Atualizar Validade
                 </button>
                 <button className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                   <ShieldCheck size={16} /> Testar Leitura {settings.certificate?.type?.split(' ')[0]}
                 </button>
              </div>
           </div>
        </div>

        {/* Modal de Renovação */}
        {renewingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CalendarClock size={20} className="text-brand" />
                  Renovar {renewingItem === 'sispass' ? 'SISPASS' : 'Certificado'}
                </h3>
                <button onClick={() => setRenewingItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleConfirmRenewal} className="p-8 space-y-6">
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                       <p className="text-xs font-bold text-blue-800 mb-1">Atualização de Datas</p>
                       <p className="text-[10px] text-blue-600 leading-relaxed">
                         Informe quando a renovação foi realizada e qual a nova data limite para manter o painel atualizado.
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
                         onChange={(e) => setRenewalForm({...renewalForm, renewalDate: e.target.value})}
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
                         onChange={(e) => setRenewalForm({...renewalForm, newExpiryDate: e.target.value})}
                       />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-4 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
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
