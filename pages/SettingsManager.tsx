import React, { useRef, useState, useEffect } from 'react';
import { BreederSettings } from '../types';
import {
  User,
  Image as ImageIcon,
  Upload,
  Palette,
  Lock,
  Loader2,
  ExternalLink
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
  { id: 'monthly', label: 'Mensal', price: 19.9, period: '/mês' },
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

const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, updateSettings, isAdmin }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'perfil' | 'plano'>('perfil');
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing'>('method');

  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const isTrial = !!settings.trialEndDate && !isAdmin;
  const canUseLogo = !!isAdmin || settings.plan === 'Profissional' || !!settings.trialEndDate;
  const planLabel = isAdmin ? 'Admin' : settings.plan;

  useEffect(() => {
    if (!canUseLogo && settings.logoUrl && settings.logoUrl !== APP_LOGO) {
      updateSettings({ ...settings, logoUrl: APP_LOGO });
    }
  }, [canUseLogo, settings, updateSettings]);

  useEffect(() => {
    // Detecta se já existe um customerId salvo no browser
    try {
      setHasStripeCustomer(!!localStorage.getItem('avigestao_stripe_customer'));
    } catch (e) {
      setHasStripeCustomer(false);
    }
  }, []);

  /* ============================
     STRIPE – CUSTOMER PORTAL
  ============================ */
  const openBillingPortal = async () => {
    try {
      const session = await supabase.auth.getSession();
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
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

  /* ============================
     STRIPE – CHECKOUT
  ============================ */
  const startCheckout = async () => {
    try {
      setPaymentStep('processing');

      const priceId = PRICE_ID_MAP[selectedPlanId];
      if (!priceId) throw new Error('Plano inválido');

      const session = await supabase.auth.getSession();

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro no checkout');
      }

      const { url, customerId } = await res.json();

      if (customerId) {
        localStorage.setItem('avigestao_stripe_customer', customerId);
      }

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
    reader.onloadend = () =>
      updateSettings({ ...settings, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 max-w-5xl pb-12 animate-in fade-in">
      {/* HEADER */}
      <header className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Configurações</h2>
          <p className="text-slate-500">Gerencie seu criatório e preferências do sistema.</p>
        </div>

        {isAdmin && (
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-rose-100 text-rose-700">
            Admin
          </span>
        )}

        <div className="flex bg-white border rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${
              activeTab === 'perfil'
                ? 'bg-slate-900 text-white'
                : 'text-slate-400'
            }`}
          >
            Perfil do Criatório
          </button>
          <button
            onClick={() => setActiveTab('plano')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${
              activeTab === 'plano'
                ? 'bg-slate-900 text-white'
                : 'text-slate-400'
            }`}
          >
            Meu Plano
          </button>
        </div>
      </header>

      <TipCarousel category="settings" />

            {/* PERFIL */}
      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.8fr] gap-6">
          <div className="bg-white p-8 rounded-3xl border space-y-6">
            <h3 className="font-black flex items-center gap-2">
              <User /> Dados do Criatório
            </h3>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div className="w-24 h-24 bg-white border rounded-2xl flex items-center justify-center">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="text-slate-300" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-black text-slate-800">Logomarca do Criatório</p>
                <p className="text-xs text-slate-500 mt-1">Exibida no menu lateral e nos certificados de Pedigree.</p>

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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do criatório</span>
                <input
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                  value={settings.breederName}
                  onChange={(e) => updateSettings({ ...settings, breederName: e.target.value })}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número SISPASS</span>
                <input
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                  value={settings.sispassNumber}
                  onChange={(e) => updateSettings({ ...settings, sispassNumber: e.target.value })}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF / CNPJ</span>
                <input
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                  value={settings.cpfCnpj}
                  onChange={(e) => updateSettings({ ...settings, cpfCnpj: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border space-y-6">
            <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
              <Palette size={18} /> Aparência
            </div>

            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Primária</p>
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
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Destaque</p>
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
            </div>
          </div>
        </div>
      )}
{/* PLANO */}
      {activeTab === 'plano' && (
        <div className="bg-slate-900 text-white p-10 rounded-3xl space-y-8">
          <h3 className="text-2xl font-black">Plano Profissional</h3>

          <div className="bg-white text-slate-900 p-6 rounded-2xl">
            <p className="text-xs uppercase font-black text-slate-500">Plano atual</p>
            <h3 className="text-2xl font-black">{planLabel}</h3>

            {settings.plan === 'Básico' && !isAdmin && (
              <p className="text-xs text-amber-600 font-black">Você está usando o plano gratuito</p>
            )}

            {settings.trialEndDate && !isAdmin && (
              <p className="text-xs text-emerald-600 font-black">Trial ativo até {new Date(settings.trialEndDate).toLocaleDateString()}</p>
            )}

            {settings.plan === 'Profissional' && !isTrial && !isAdmin && (
              <button
                onClick={openBillingPortal}
                className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl font-black"
              >
                Gerenciar assinatura
              </button>
            )}
          </div>

          {/* Plano selection / checkout */}
          {!isAdmin && (settings.plan !== 'Profissional' || isTrial) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-4 rounded-xl border ${
                      selectedPlanId === plan.id
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-white/20'
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
                className="w-full py-4 bg-amber-500 font-black uppercase rounded-xl"
              >
                Assinar Agora
              </button>
            </>
          )}
        </div>
      )}

      {/* MODAL PAGAMENTO */}
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
                Processando pagamento…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;





