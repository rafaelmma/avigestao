
import React, { useRef, useState } from 'react';
import { BreederSettings, CertificateType } from '../types';
import { User, Palette, Image as ImageIcon, Upload, Zap, Lock, CreditCard, QrCode, Loader2, CheckCircle2, Star } from 'lucide-react';
import TipCarousel from '../components/TipCarousel';

interface SettingsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
}

const PLANS = [
  { id: 'monthly', label: 'Mensal', price: 19.90, period: '/mês', discount: null, saving: null },
  { id: 'quarterly', label: 'Trimestral', price: 53.70, period: '/3 meses', discount: '10% OFF', saving: 'Economize R$ 6,00' },
  { id: 'semiannual', label: 'Semestral', price: 95.50, period: '/6 meses', discount: '20% OFF', saving: 'Economize R$ 23,90' },
  { id: 'annual', label: 'Anual', price: 167.10, period: '/ano', discount: '30% OFF', saving: 'Economize R$ 71,70' },
];

const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, updateSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<'perfil' | 'plano'>('perfil');
  
  // State para o Plano Selecionado
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  
  // States para o Modal de Pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing' | 'success'>('method');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>('credit');

  const selectedPlan = PLANS.find(p => p.id === selectedPlanId) || PLANS[0];

  const handleUpgradeClick = () => {
    setShowPaymentModal(true);
    setPaymentStep('method');
  };

  const processPayment = () => {
    setPaymentStep('processing');
    // Simula tempo de processamento do gateway (Stripe/Mercado Pago)
    setTimeout(() => {
      setPaymentStep('success');
      // Atualiza o plano globalmente e REMOVE O TRIAL, efetivando a assinatura
      updateSettings({ 
        ...settings, 
        plan: 'Profissional',
        trialEndDate: undefined // Remove a data de trial, tornando permanente
      });
    }, 2500);
  };

  const handleStartTrial = () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Adiciona 7 dias
    
    updateSettings({
      ...settings,
      plan: 'Profissional',
      trialEndDate: endDate.toISOString()
    });
    
    alert("Período de teste ativado com sucesso! Aproveite os recursos PRO por 7 dias.");
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('method');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Configurações</h2>
          <p className="text-slate-500 font-medium">Gerencie seu criatório e preferências do sistema.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-[20px] shadow-sm border border-slate-100 overflow-x-auto">
          <button 
            onClick={() => setActiveConfigTab('perfil')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeConfigTab === 'perfil' ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Perfil do Criatório
          </button>
          <button 
            onClick={() => setActiveConfigTab('plano')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeConfigTab === 'plano' ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Meu Plano {settings.plan === 'Básico' && <Zap size={14} className="fill-amber-500 text-amber-500" />}
          </button>
        </div>
      </header>

      {/* Carrossel de Dicas de Configuração/Segurança */}
      <TipCarousel category="settings" />

      {activeConfigTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden p-10 space-y-8">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <User className="text-brand" /> Dados do Criador
                </h3>
                
                {/* Seção de Logo */}
                <div className="flex items-start gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-24 h-24 bg-white rounded-2xl border border-slate-200 flex items-center justify-center p-2 shadow-sm overflow-hidden relative group">
                     {settings.logoUrl ? (
                       <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                     ) : (
                       <ImageIcon className="text-slate-300" size={32} />
                     )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">Logomarca do Criatório</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Exibida no menu lateral e nos certificados de Pedigree.</p>
                    
                    {settings.plan === 'Profissional' ? (
                      <div>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-brand hover:text-brand transition-all flex items-center gap-2"
                        >
                          <Upload size={14} /> Carregar Nova Logo
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl w-fit">
                        <Lock size={14} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Recurso PRO</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Nome do Criatório" value={settings.breederName} onChange={(val: string) => updateSettings({...settings, breederName: val})} />
                  <InputGroup label="Número SISPASS" value={settings.sispassNumber} onChange={(val: string) => updateSettings({...settings, sispassNumber: val})} />
                  <InputGroup label="CPF / CNPJ" value={settings.cpfCnpj} onChange={(val: string) => updateSettings({...settings, cpfCnpj: val})} />
                </div>
            </div>
          </div>
          <div className="space-y-6">
             <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 text-center">
                <Palette size={20} className="mx-auto text-brand mb-4" />
                <h3 className="font-black text-slate-800 text-sm mb-6 uppercase tracking-widest">Aparência</h3>
                <div className="flex justify-center gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-300">Primária</label>
                    <input type="color" className="w-10 h-10 rounded-xl cursor-pointer" value={settings.primaryColor} onChange={(e) => updateSettings({...settings, primaryColor: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-300">Destaque</label>
                    <input type="color" className="w-10 h-10 rounded-xl cursor-pointer" value={settings.accentColor} onChange={(e) => updateSettings({...settings, accentColor: e.target.value})} />
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeConfigTab === 'plano' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
          <div className={`p-10 rounded-[40px] border-2 transition-all flex flex-col justify-between ${settings.plan === 'Básico' ? 'bg-white border-brand shadow-xl' : 'bg-slate-50 border-transparent opacity-60'}`}>
             <div>
               <h4 className="text-2xl font-black text-slate-800 tracking-tight">Plano Básico</h4>
               <p className="text-slate-400 text-xs font-bold uppercase mt-1">Gratuito para sempre</p>
               <ul className="mt-8 space-y-4">
                  <FeatureItem active label="Até 5 aves no plantel" />
                  <FeatureItem active label="Controle de acasalamento" />
                  <FeatureItem active label="Ajuda & FAQ" />
                  <FeatureItem label="Impressão de Pedigree" />
                  <FeatureItem label="Módulo Financeiro" />
               </ul>
             </div>
             
             {/* ÁREA DE ATIVAÇÃO MANUAL DE TRIAL (Se for Básico) */}
             {settings.plan === 'Básico' && !settings.trialEndDate && (
               <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <h5 className="flex items-center gap-2 font-bold text-amber-900 text-sm mb-2">
                    <Star size={16} fill="currentColor" /> Experimente o PRO
                  </h5>
                  <p className="text-xs text-amber-800 mb-4">
                    Ative 7 dias gratuitos agora mesmo para testar todas as funcionalidades.
                  </p>
                  <button 
                    onClick={handleStartTrial}
                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-amber-600 transition-all"
                  >
                    Ativar 7 Dias Grátis
                  </button>
               </div>
             )}

             <div className="mt-10 pt-10 border-t border-slate-50">
                <p className="text-sm font-black text-slate-800">
                  {settings.plan === 'Básico' ? 'Plano Ativo' : 'Plano Anterior'}
                </p>
             </div>
          </div>

          <div className={`p-10 rounded-[40px] border-2 transition-all relative overflow-hidden flex flex-col ${settings.plan === 'Profissional' ? 'bg-white border-amber-500 shadow-xl' : 'bg-[#0F172A] border-transparent text-white'}`}>
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div>
             <div>
               <h4 className="text-2xl font-black tracking-tight">Plano Profissional</h4>
               <p className="text-amber-500 text-xs font-bold uppercase mt-1">Gestão ilimitada</p>
               <ul className="mt-8 space-y-4">
                  <FeatureItem active pro={settings.plan === 'Básico'} label="Aves Ilimitadas" />
                  <FeatureItem active pro={settings.plan === 'Básico'} label="Pedigree com sua Logo" />
                  <FeatureItem active pro={settings.plan === 'Básico'} label="Financeiro completo" />
                  <FeatureItem active pro={settings.plan === 'Básico'} label="Suporte Prioritário" />
                  <FeatureItem active pro={settings.plan === 'Básico'} label="Sem propagandas" />
               </ul>
             </div>
             
             {(settings.plan === 'Básico' || settings.trialEndDate) && (
               <div className="mt-8 grid grid-cols-2 gap-3 relative z-10">
                  {PLANS.map(plan => (
                    <button 
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden ${selectedPlanId === plan.id ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white/5 border-white/20 hover:bg-white/10'}`}
                    >
                      {plan.discount && (
                        <div className={`absolute top-0 right-0 px-1.5 py-0.5 text-[8px] font-black uppercase rounded-bl-lg ${selectedPlanId === plan.id ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                          {plan.discount}
                        </div>
                      )}
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{plan.label}</p>
                      <p className="font-black text-sm">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] opacity-60">{plan.period}</p>
                    </button>
                  ))}
               </div>
             )}

             <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                {settings.plan === 'Básico' ? (
                  <button onClick={handleUpgradeClick} className="w-full py-5 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-900/40 hover:scale-[1.02] transition-all">
                    Assinar {selectedPlan.label}
                  </button>
                ) : (
                  // LÓGICA DE EXIBIÇÃO: PLANO ATIVO VS TRIAL
                  settings.trialEndDate ? (
                    <div className="space-y-3 animate-in fade-in">
                        <div className="py-3 px-4 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs border border-amber-100 flex flex-col items-center text-center">
                            <span className="uppercase tracking-widest text-[9px] text-amber-500 font-black mb-1">Período de Teste Gratuito</span>
                            <span>Expira em {new Date(settings.trialEndDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <button onClick={handleUpgradeClick} className="w-full py-4 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                           <Zap size={14} fill="currentColor" /> Assinar e Manter Benefícios
                        </button>
                    </div>
                  ) : (
                    <div className="py-4 px-6 bg-amber-500/10 text-amber-500 rounded-2xl font-black text-center text-xs border border-amber-500/20">
                        Plano Ativo e Regular
                    </div>
                  )
                )}
             </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento Simulado */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
              {paymentStep === 'method' && (
                <>
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800">Checkout Seguro</h3>
                    <p className="text-xs text-slate-500 mt-1">Você está assinando o plano <span className="font-bold text-slate-800">{selectedPlan.label}</span>.</p>
                  </div>
                  <div className="p-8 space-y-4">
                     <button 
                       onClick={() => setPaymentMethod('credit')}
                       className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'credit' ? 'border-brand bg-brand/5' : 'border-slate-100'}`}
                     >
                       <div className="flex items-center gap-3">
                         <CreditCard className={paymentMethod === 'credit' ? 'text-brand' : 'text-slate-400'} />
                         <div className="text-left">
                           <p className="font-bold text-sm text-slate-800">Cartão de Crédito</p>
                           <p className="text-[10px] text-slate-400 uppercase font-black">Liberação Imediata</p>
                         </div>
                       </div>
                       {paymentMethod === 'credit' && <CheckCircle2 className="text-brand" size={20} />}
                     </button>

                     <button 
                       onClick={() => setPaymentMethod('pix')}
                       className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'pix' ? 'border-brand bg-brand/5' : 'border-slate-100'}`}
                     >
                       <div className="flex items-center gap-3">
                         <QrCode className={paymentMethod === 'pix' ? 'text-brand' : 'text-slate-400'} />
                         <div className="text-left">
                           <p className="font-bold text-sm text-slate-800">PIX</p>
                           <p className="text-[10px] text-slate-400 uppercase font-black">Aprovação em segundos</p>
                         </div>
                       </div>
                       {paymentMethod === 'pix' && <CheckCircle2 className="text-brand" size={20} />}
                     </button>

                     <div className="pt-4 border-t border-slate-100 mt-4">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-sm font-medium text-slate-500">Total a pagar:</span>
                           <span className="text-2xl font-black text-slate-900">R$ {selectedPlan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {selectedPlan.saving && (
                          <div className="text-right mb-6">
                             <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">{selectedPlan.saving}</span>
                          </div>
                        )}
                        <button onClick={processPayment} className="w-full py-4 bg-brand text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-emerald-600 transition-all">
                          Finalizar Pagamento
                        </button>
                        <button onClick={closePaymentModal} className="w-full py-3 mt-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600">
                          Cancelar
                        </button>
                     </div>
                  </div>
                </>
              )}

              {paymentStep === 'processing' && (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                   <Loader2 size={48} className="text-brand animate-spin mb-6" />
                   <h3 className="text-lg font-black text-slate-800">Processando...</h3>
                   <p className="text-sm text-slate-400 mt-2">Estamos validando seu pagamento junto ao banco.</p>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                   <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                      <CheckCircle2 size={40} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-800">Parabéns!</h3>
                   <p className="text-slate-500 mt-2 mb-8">Seu criatório agora é <span className="font-bold text-amber-500">PRO</span> com ciclo {selectedPlan.label.toLowerCase()}. Aproveite todos os recursos ilimitados.</p>
                   <button onClick={closePaymentModal} className="w-full py-4 bg-[#0F172A] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl">
                     Começar a Usar
                   </button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

const FeatureItem = ({ label, active, pro }: { label: string, active?: boolean, pro?: boolean }) => (
  <li className={`flex items-center gap-3 text-xs font-bold ${active ? (pro ? 'text-amber-100' : 'text-slate-700') : 'text-slate-300 line-through opacity-50'}`}>
    <div className={`w-1.5 h-1.5 rounded-full ${active ? (pro ? 'bg-amber-400' : 'bg-brand') : 'bg-slate-200'}`}></div>
    {label}
  </li>
);

const InputGroup = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <input 
      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-700 outline-none focus:border-brand transition-all" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
    />
  </div>
);

export default SettingsManager;
