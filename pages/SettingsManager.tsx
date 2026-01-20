import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BreederSettings } from '../types';
import {
  User,
  Image as ImageIcon,
  Upload,
  Palette,
  Lock,
  Loader2,
  ExternalLink,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Save,
} from 'lucide-react';
import TipCarousel from '../components/TipCarousel';
import { APP_LOGO } from '../constants';
import { supabase } from '../supabaseClient';

interface SettingsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
  isAdmin?: boolean;
}

const PLANS = [
  { id: 'monthly', label: 'Mensal', price: 19.9, period: '/mes' },
  { id: 'quarterly', label: 'Trimestral', price: 53.7, period: '/3 meses' },
  { id: 'semiannual', label: 'Semestral', price: 95.5, period: '/6 meses' },
  { id: 'annual', label: 'Anual', price: 167.1, period: '/ano' },
];

const PRICE_ID_MAP: Record<string, string> = {
  monthly: 'price_1Sp8rs0btEoqllHf6KnF3j4i',
  quarterly: 'price_1Sp8sp0btEoqllHflQnyFP5M',
  semiannual: 'price_1Sp8ta0btEoqllHfYpjHjlCV',
  annual: 'price_1Sp8uG0btEoqllHfuRKfN0oK',
};

const maskCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
      .slice(0, 14);
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

const daysTo = (date?: string) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? null : diff;
};

const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, updateSettings, isAdmin }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'perfil' | 'plano'>('perfil');
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing'>('method');
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const isTrial = !!settings.trialEndDate && !isAdmin;
  const canUseLogo = !!isAdmin || settings.plan === 'Profissional' || !!settings.trialEndDate;
  const planLabel = isAdmin ? 'Admin' : settings.plan;

  const daysSispass = daysTo(settings.renewalDate);
  const daysCert = daysTo(settings.certificate?.expiryDate);

  useEffect(() => {
    if (!canUseLogo && settings.logoUrl && settings.logoUrl !== APP_LOGO) {
      updateSettings({ ...settings, logoUrl: APP_LOGO });
    }
  }, [canUseLogo, settings, updateSettings]);

  useEffect(() => {
    try {
      setHasStripeCustomer(!!localStorage.getItem('avigestao_stripe_customer'));
    } catch {
      setHasStripeCustomer(false);
    }
  }, []);

  useEffect(() => {
    try {
      const storedTab = localStorage.getItem('avigestao_settings_tab');
      if (storedTab === 'plano') setActiveTab('plano');
      if (storedTab) localStorage.removeItem('avigestao_settings_tab');
    } catch {
      /* ignore storage issues and fall back to default tab */
    }
  }, []);

  useEffect(() => {
    const critical: string[] = [];
    if (daysSispass !== null && daysSispass <= 30) critical.push(`SISPASS vence em ${daysSispass} dias`);
    if (daysCert !== null && daysCert <= 30) critical.push(`Certificado vence em ${daysCert} dias`);
    setBannerMessage(critical.length ? critical.join(' ÔÇó ') : null);
  }, [daysSispass, daysCert]);

  const openBillingPortal = async () => {
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Erro ao abrir o portal');
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir o portal de assinatura');
    }
  };

  const startCheckout = async () => {
    try {
      setPaymentStep('processing');
      const priceId = PRICE_ID_MAP[selectedPlanId];
      if (!priceId) throw new Error('Plano invalido');
      const session = await supabase.auth.getSession();
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session?.access_token}` },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro no checkout');
      }
      const { url, customerId } = await res.json();
      if (customerId) localStorage.setItem('avigestao_stripe_customer', customerId);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar pagamento');
      setPaymentStep('method');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateSettings({ ...settings, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const statusItems = useMemo(() => {
    const items: { label: string; ok: boolean; value?: string }[] = [];
    const cpfOk = !!settings.cpfCnpj && settings.cpfCnpj.replace(/\D/g, '').length >= 11;
    items.push({ label: 'CPF/CNPJ', ok: cpfOk, value: settings.cpfCnpj || 'Pendente' });
    if (settings.sispassNumber) items.push({ label: 'SISPASS', ok: true, value: settings.sispassNumber });
    if (daysSispass !== null) items.push({ label: 'Licenca', ok: daysSispass > 0, value: `${daysSispass} dias` });
    if (daysCert !== null) items.push({ label: 'Certificado', ok: daysCert > 0, value: `${daysCert} dias` });
    return items;
  }, [settings, daysSispass, daysCert]);

  const handleSaveClick = () => {
    updateSettings({ ...settings });
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="space-y-8 max-w-6xl pb-14 animate-in fade-in">
      {bannerMessage && (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <span>{bannerMessage}</span>
          </div>
          <a
            href="#"
            onClick={() => setActiveTab('perfil')}
            className="text-[11px] uppercase tracking-widest font-black text-amber-700"
          >
            Atualizar datas
          </a>
        </div>
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Configura├º├Áes</h2>
          <p className="text-slate-500">Ajuste dados do criat├│rio, licen├ºas, certificado e apar├¬ncia.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {isAdmin && (
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-rose-100 text-rose-700">
              Admin
            </span>
          )}
          <div className="flex bg-white border rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('perfil')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                activeTab === 'perfil' ? 'bg-slate-900 text-white' : 'text-slate-400'
              }`}
            >
              Perfil e Licencas
            </button>
            <button
              onClick={() => setActiveTab('plano')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                activeTab === 'plano' ? 'bg-slate-900 text-white' : 'text-slate-400'
              }`}
            >
              Meu Plano
            </button>
          </div>
        </div>
      </header>

      <TipCarousel category="settings" />

      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-black flex items-center gap-2 text-slate-800">
                <User size={18} /> Identidade do criat├│rio
              </h3>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                <div className="w-24 h-24 bg-white border rounded-2xl flex items-center justify-center overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-800">Logomarca do criat├│rio</p>
                  <p className="text-xs text-slate-500 mt-1">Exibida no menu lateral e em documentos.</p>
                  {canUseLogo ? (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-black"
                      >
                        <Upload size={14} /> Carregar nova logo
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </>
                  ) : (
                    <div className="mt-4 inline-flex items-center gap-2 text-amber-600 text-xs font-black">
                      <Lock size={14} /> Recurso PRO
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do criat├│rio</span>
                  <input
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.breederName}
                    onChange={(e) => updateSettings({ ...settings, breederName: e.target.value })}
                    placeholder="Ex: Aviario Azul"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF / CNPJ</span>
                  <input
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.cpfCnpj}
                    onChange={(e) => updateSettings({ ...settings, cpfCnpj: maskCpfCnpj(e.target.value) })}
                    placeholder="Digite com numeros"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numero SISPASS</span>
                  <input
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.sispassNumber}
                    onChange={(e) => updateSettings({ ...settings, sispassNumber: e.target.value })}
                    placeholder="Informe o numero do SISPASS"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de renovacao SISPASS</span>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.renewalDate}
                    onChange={(e) => updateSettings({ ...settings, renewalDate: e.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de registro</span>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.registrationDate}
                    onChange={(e) => updateSettings({ ...settings, registrationDate: e.target.value })}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ultima renovacao</span>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.lastRenewalDate || ''}
                    onChange={(e) => updateSettings({ ...settings, lastRenewalDate: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                <Palette size={18} /> Aparencia e tema
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primaria</p>
                  <button
                    className="mt-2 w-12 h-12 rounded-2xl border border-slate-200 shadow-sm"
                    style={{ backgroundColor: settings.primaryColor }}
                    onClick={() => primaryColorRef.current?.click()}
                  />
                  <input
                    ref={primaryColorRef}
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSettings({ ...settings, primaryColor: e.target.value })}
                    className="sr-only"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destaque</p>
                  <button
                    className="mt-2 w-12 h-12 rounded-2xl border border-slate-200 shadow-sm"
                    style={{ backgroundColor: settings.accentColor }}
                    onClick={() => accentColorRef.current?.click()}
                  />
                  <input
                    ref={accentColorRef}
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSettings({ ...settings, accentColor: e.target.value })}
                    className="sr-only"
                  />
                </div>

                <div className="flex-1 min-w-[240px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preview rapido</p>
                  <div className="rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      AV
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800">Card de exemplo</p>
                      <p className="text-[11px] font-bold" style={{ color: settings.accentColor }}>Cor de destaque aplicada</p>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-[11px] font-black"
                      style={{ backgroundColor: settings.accentColor, color: '#fff' }}
                    >
                      Badge
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Status rapido
              </h4>
              <div className="space-y-2">
                {statusItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.label}</p>
                      <p className="text-[11px] text-slate-500">{item.value}</p>
                    </div>
                    {item.ok ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <Calendar size={16} className="text-slate-500" /> Datas importantes
              </h4>
              <div className="text-sm text-slate-600 space-y-2">
                <p>Renovacao SISPASS: {settings.renewalDate ? new Date(settings.renewalDate).toLocaleDateString() : 'Pendente'}</p>
                <p>Ultima renovacao: {settings.lastRenewalDate ? new Date(settings.lastRenewalDate).toLocaleDateString() : 'Pendente'}</p>
                <p>Certificado: {settings.certificate?.expiryDate ? new Date(settings.certificate.expiryDate).toLocaleDateString() : 'Pendente'}</p>
              </div>
              <p className="text-[11px] text-slate-500">Mantenha as datas atualizadas para ver alertas no dashboard.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-600" /> Certificado digital
              </h4>
              <div className="text-sm text-slate-700 space-y-1">
                <p><span className="font-bold">Emissor:</span> {settings.certificate?.issuer || 'Pendente'}</p>
                <p><span className="font-bold">Validade:</span> {settings.certificate?.expiryDate ? new Date(settings.certificate.expiryDate).toLocaleDateString() : 'Pendente'}</p>
              </div>
              <a
                href="https://ccd.serpro.gov.br/testeaqui/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
              >
                <ExternalLink size={12} /> Testar certificado (Serpro)
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plano' && (
        <div className="bg-slate-900 text-white p-10 rounded-3xl space-y-8">
          <h3 className="text-2xl font-black">Plano Profissional</h3>

          <div className="bg-white text-slate-900 p-6 rounded-2xl">
            <p className="text-xs uppercase font-black text-slate-500">Plano atual</p>
            <h3 className="text-2xl font-black">{planLabel}</h3>

            {settings.plan === 'Basico' && !isAdmin && (
              <p className="text-xs text-amber-600 font-black">Voce esta usando o plano gratuito</p>
            )}

            {settings.trialEndDate && !isAdmin && (
              <p className="text-xs text-emerald-600 font-black">Trial ativo ate {new Date(settings.trialEndDate).toLocaleDateString()}</p>
            )}

            {settings.plan === 'Profissional' && !isTrial && !isAdmin && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Assinatura ativa</p>
                    <p className="text-sm font-bold text-slate-800">
                      Gerencie cobran├ç├Áes, upgrade/downgrade ou cancele a renova├ç├Á├ç┼ôo autom├ç├«tica.
                    </p>
                  </div>
                  <button
                    onClick={openBillingPortal}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Abrir portal
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  No portal voc├¬ pode trocar per├¡odo (mensal/anual), atualizar cart├úo e cancelar a recorr├¬ncia.
                </p>
              </div>
            )}
          </div>

          {!isAdmin && (settings.plan !== 'Profissional' || isTrial) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedPlanId === plan.id ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-white/20'
                    }`}
                  >
                    <p className="text-xs uppercase font-black">{plan.label}</p>
                    <p className="text-lg font-black">R$ {plan.price}</p>
                    <p className="text-xs opacity-70">{plan.period}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-amber-500 font-black uppercase rounded-xl text-slate-900"
              >
                Assinar Agora
              </button>
            </>
          )}
        </div>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSaveClick}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black shadow-lg shadow-emerald-300/30 hover:opacity-90 transition-all"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <Save size={16} /> Salvar alteracoes
        </button>
        {savedAt && (
          <span className="ml-3 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
            Salvo as {savedAt}
          </span>
        )}
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            {paymentStep === 'method' ? (
              <>
                <h3 className="font-black mb-4">Pagamento</h3>
                <button
                  onClick={startCheckout}
                  className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl"
                >
                  Pagar com Stripe
                </button>
              </>
            ) : (
              <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-4" />
                Processando pagamento.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
