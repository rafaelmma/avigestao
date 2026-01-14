import React, { useRef, useState } from 'react';
import { BreederSettings } from '../types';
import {
  User,
  Image as ImageIcon,
  Upload,
  Lock,
  Loader2,
} from 'lucide-react';
import TipCarousel from '../components/TipCarousel';

interface SettingsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
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

const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, updateSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'perfil' | 'plano'>('perfil');
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing'>('method');

  const startCheckout = async () => {
    try {
      setPaymentStep('processing');

      const priceId = PRICE_ID_MAP[selectedPlanId];
      if (!priceId) throw new Error('Plano inválido');

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          // ⚠️ TEMPORÁRIO (sem Supabase Auth)
          userId: settings.breederName || 'usuario_demo',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro no checkout');
      }

      const { url } = await res.json();
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
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Configurações</h2>
          <p className="text-slate-500">Gerencie seu criatório</p>
        </div>

        <div className="flex bg-white border rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${
              activeTab === 'perfil'
                ? 'bg-slate-900 text-white'
                : 'text-slate-400'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('plano')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${
              activeTab === 'plano'
                ? 'bg-slate-900 text-white'
                : 'text-slate-400'
            }`}
          >
            Plano
          </button>
        </div>
      </header>

      <TipCarousel category="settings" />

      {/* GARANTIA DE RENDER */}
      {activeTab === 'perfil' ? (
        <div className="bg-white p-8 rounded-3xl border space-y-6">
          <h3 className="font-black flex items-center gap-2">
            <User /> Dados do Criatório
          </h3>

          <div className="flex gap-6">
            <div className="w-24 h-24 border rounded-xl flex items-center justify-center">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="text-slate-300" />
              )}
            </div>

            {settings.plan === 'Profissional' ? (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border rounded-xl text-xs font-black"
                >
                  <Upload size={14} /> Upload Logo
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
              <div className="flex items-center gap-2 text-amber-600 text-xs font-black">
                <Lock size={14} /> Recurso PRO
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              value={settings.breederName}
              onChange={e =>
                updateSettings({ ...settings, breederName: e.target.value })
              }
              placeholder="Nome do criatório"
              className="input"
            />
            <input
              value={settings.sispassNumber}
              onChange={e =>
                updateSettings({ ...settings, sispassNumber: e.target.value })
              }
              placeholder="SISPASS"
              className="input"
            />
          </div>
        </div>
      ) : activeTab === 'plano' ? (
        <div className="bg-slate-900 text-white p-10 rounded-3xl space-y-8">
          <h3 className="text-2xl font-black">Plano Profissional</h3>

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
        </div>
      ) : null}

      {/* MODAL */}
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
