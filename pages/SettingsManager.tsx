import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { BreederSettings } from '../types';
import { getAuth } from 'firebase/auth';
import { assinarPlano } from '../lib/stripe';
import { iniciarPagamentoMercadoPago } from '../lib/mercadopago';
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
  UsersRound,
  Save,
  Eye,
  EyeOff,
  X,
  HelpCircle,
  Mail,
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
const PlanComparative = React.lazy(() => import('../components/PlanComparative'));
import { APP_LOGO } from '../constants';
import toast from 'react-hot-toast';

interface SettingsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
  onSave: (settings: BreederSettings) => Promise<void>;
  isAdmin?: boolean;
}

const PLANS = [
  { id: 'monthly', label: 'Mensal', price: 19.9, period: '/mês', months: 1 },
  { id: 'quarterly', label: 'Trimestral', price: 53.7, period: '/3 meses', months: 3 },
  { id: 'semiannual', label: 'Semestral', price: 95.5, period: '/6 meses', months: 6 },
  { id: 'annual', label: 'Anual', price: 167.1, period: '/ano', months: 12 },
];

const PLAN_FEATURES = [
  'Plantel e pedigree ilimitados',
  'Etiquetas, certificados e relatórios',
  'Histórico e rastreabilidade completa',
  'Backup seguro e suporte prioritário',
];

const PLAN_BADGES: Record<string, { label: string; tone: 'amber' | 'emerald' } | null> = {
  monthly: null,
  quarterly: { label: 'Mais usado', tone: 'amber' },
  semiannual: { label: 'Economia inteligente', tone: 'emerald' },
  annual: { label: 'Melhor custo-benefício', tone: 'emerald' },
};

const PRICE_ID_MAP: Record<string, string> = {
  monthly: 'price_1SwSz20YB6ELT5UOHr8IVksz',
  quarterly: 'price_1SwSzZ0YB6ELT5UO6VKg534d',
  semiannual: 'price_1SwT000YB6ELT5UOd7cZBbz6',
  annual: 'price_1SwT0N0YB6ELT5UOjrjILdg5',
};

// const LOGO_BUCKET = (import.meta as { env?: { VITE_SUPABASE_LOGO_BUCKET?: string } }).env?.VITE_SUPABASE_LOGO_BUCKET || 'assets';

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

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatDateForInput = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
};

const maskDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseMaskedDate = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (!day || !month || !year) return null;
  const iso = `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
};

const parseDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return '';
};

const daysTo = (date?: string) => {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? null : diff;
};

const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  updateSettings,
  onSave,
  isAdmin,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'perfil' | 'plano'>('perfil');
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing'>('method');
  const [paymentContext, setPaymentContext] = useState<'new' | 'renew'>('new');
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<Array<{
    message: string;
    action?: () => void;
    actionLabel?: string;
  }> | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const isChangingPasswordState = useState(false);
  const isChangingPassword = isChangingPasswordState[0];
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const lastCepLookupRef = useRef<string>('');

  const [renewalInput, setRenewalInput] = useState('');
  const [lastRenewalInput, setLastRenewalInput] = useState('');
  const [emailDisplay, setEmailDisplay] = useState('');
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [emailEditValue, setEmailEditValue] = useState('');

  // Load user email from Firebase
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user?.email) {
      setEmailDisplay(user.email);
      setEmailEditValue(user.email);
    }
  }, []);

  const isTrial = !!settings.trialEndDate && !isAdmin;
  const canUseLogo = !!isAdmin || settings.plan === 'Profissional' || !!settings.trialEndDate;
  const planLabel = isAdmin ? 'Admin' : settings.plan;
  const monthlyPrice = PLANS[0]?.price ?? 0;
  const selectedPlan = PLANS.find((plan) => plan.id === selectedPlanId) || PLANS[0];
  
  // Detectar provedor de pagamento
  const paymentProvider = settings.subscriptionProvider?.toLowerCase().includes('mercadopago') 
    ? 'Mercado Pago' 
    : settings.subscriptionProvider?.toLowerCase().includes('stripe')
    ? 'Stripe'
    : 'Stripe'; // Default para Stripe

  const daysSispass = daysTo(settings.renewalDate);
  const daysCert = daysTo(settings.certificate?.expiryDate);
  const daysSubscription = settings.subscriptionEndDate
    ? daysTo(settings.subscriptionEndDate)
    : null;

  const buttonBase =
    'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60';
  const buttonPrimary = `${buttonBase} bg-slate-900 text-white hover:bg-slate-800`;
  const buttonSecondary = `${buttonBase} bg-slate-100 text-slate-700 hover:bg-slate-200`;
  const buttonAccent = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`;
  const buttonHighlight = `${buttonBase} bg-amber-500 text-slate-900 hover:bg-amber-400`;

  const wizardSteps = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'identidade', label: 'Identidade' },
    { id: 'perfil-criador', label: 'Perfil do criador' },
    { id: 'seguranca', label: 'Segurança' },
  ];

  const [wizardStep, setWizardStep] = useState(0);

  const lookupCep = async (cepDigits: string) => {
    if (cepDigits.length !== 8 || lastCepLookupRef.current === cepDigits) return;
    lastCepLookupRef.current = cepDigits;
    setIsFetchingCep(true);
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (!response.ok) throw new Error('Falha ao buscar CEP');
      const data = await response.json();
      if (data?.erro) {
        setCepError('CEP não encontrado');
        return;
      }

      updateSettings({
        ...settings,
        addressCep: formatCep(cepDigits),
        addressCity: data.localidade || settings.addressCity,
        addressState: data.uf || settings.addressState,
        addressStreet: data.logradouro || settings.addressStreet,
        addressNeighborhood: data.bairro || settings.addressNeighborhood,
        addressComplement: data.complemento || settings.addressComplement,
      });
    } catch {
      setCepError('Não foi possível buscar o endereço');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    updateSettings({ ...settings, addressCep: formatted });
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      lookupCep(digits);
    } else {
      setCepError(null);
    }
  };

  useEffect(() => {
    if (!canUseLogo && settings.logoUrl && settings.logoUrl !== APP_LOGO) {
      updateSettings({ ...settings, logoUrl: APP_LOGO });
    }
  }, [canUseLogo, settings, updateSettings]);

  useEffect(() => {
    if (savedSnapshot === null) {
      setSavedSnapshot(JSON.stringify(settings));
    }
  }, [savedSnapshot, settings]);

  useEffect(() => {
    const isStripe =
      !!settings.stripeCustomerId ||
      settings.subscriptionProvider === 'stripe' ||
      settings.subscriptionStatus === 'active' ||
      settings.subscriptionStatus === 'trialing';
    setHasStripeCustomer(isStripe);
  }, [
    settings.stripeCustomerId,
    settings.subscriptionProvider,
    settings.subscriptionStatus,
  ]);

  useEffect(() => {
    setRenewalInput(formatDateForInput(settings.renewalDate));
    setLastRenewalInput(formatDateForInput(settings.lastRenewalDate));
  }, [settings.renewalDate, settings.lastRenewalDate]);

  useEffect(() => {
    try {
      const storedTab = localStorage.getItem('avigestao_settings_tab');
      if (storedTab === 'plano') setActiveTab('plano');
      if (storedTab) localStorage.removeItem('avigestao_settings_tab');
    } catch {
      /* ignore storage issues and fall back to default tab */
    }
  }, []);

  const openRenewModal = () => {
    setPaymentContext('renew');
    setShowPaymentModal(true);
  };

  useEffect(() => {
    const critical: Array<{ message: string; action?: () => void; actionLabel?: string }> = [];

    if (daysSispass !== null && daysSispass <= 30) {
      critical.push({
        message: `SISPASS vence em ${daysSispass} dias`,
        action: () => setActiveTab('perfil'),
        actionLabel: 'Renovar',
      });
    }

    if (daysCert !== null && daysCert <= 30) {
      critical.push({
        message: `Certificado vence em ${daysCert} dias`,
        action: () => setActiveTab('perfil'),
        actionLabel: 'Atualizar',
      });
    }

    if (settings.plan === 'Profissional' && settings.subscriptionCancelAtPeriodEnd) {
      if (daysSubscription !== null) {
        critical.push({
          message: `Assinatura PRO termina em ${daysSubscription} dias (renovação cancelada)`,
          action: openRenewModal,
          actionLabel: 'Renovar',
        });
      } else {
        critical.push({
          message: 'Assinatura PRO com renovação cancelada. Reative para manter o plano.',
          action: openRenewModal,
          actionLabel: 'Renovar',
        });
      }
    }

    setBannerMessage(critical.length > 0 ? critical : null);
  }, [
    daysSispass,
    daysCert,
    daysSubscription,
    settings.plan,
    settings.subscriptionCancelAtPeriodEnd,
  ]);

  const openBillingPortal = async () => {
    try {
      const { abrirPortalCliente } = await import('../lib/stripe');
      await abrirPortalCliente();
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir o portal de assinatura');
    }
  };

  const handleStripePayment = async () => {
    if (paymentContext === 'renew' && hasStripeCustomer) {
      setShowPaymentModal(false);
      setPaymentStep('method');
      await openBillingPortal();
      return;
    }
    await startCheckout();
  };

  const startCheckout = async () => {
    try {
      setPaymentStep('processing');
      const priceId = PRICE_ID_MAP[selectedPlanId];
      if (!priceId) throw new Error('Plano inválido');
      await assinarPlano(priceId);
    } catch (err) {
      console.error(err);
      setPaymentStep('method');
      alert('Erro ao iniciar pagamento: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const startMercadoPagoCheckout = async () => {
    try {
      setPaymentStep('processing');
      await iniciarPagamentoMercadoPago({
        planId: selectedPlan.id,
        planLabel: selectedPlan.label,
        price: Number(selectedPlan.price),
        months: Number(selectedPlan.months || 1),
      });
    } catch (err) {
      console.error(err);
      setPaymentStep('method');
      alert('Erro ao iniciar pagamento PIX: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canUseLogo) {
      alert('Disponível apenas no plano PRO.');
      return;
    }

    setLogoUploadError(null);
    setIsUploadingLogo(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Logo deve ter no máximo 5MB');
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Arquivo deve ser uma imagem (JPG, PNG, etc)');
      }

      // Get auth token
      const token = await user.getIdToken();

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];

          // Call Cloud Function to upload
          const response = await fetch(
            'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net/uploadLogo',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                fileData: base64String,
                fileName: file.name,
              }),
            },
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao fazer upload');
          }

          const result = await response.json();

          // Update local state
          const updatedSettings = { ...settings, logoUrl: result.downloadUrl };
          updateSettings(updatedSettings);
          await onSave(updatedSettings);

          alert('Logo enviada com sucesso!');
        } catch (err: unknown) {
          const messageProp =
            err && typeof err === 'object' && 'message' in err
              ? (err as { message?: unknown }).message
              : undefined;
          const message = typeof messageProp === 'string' ? messageProp : String(err);
          console.error('Erro ao enviar logo', message);
          const alertMsg = message || 'Falha ao enviar a logo. Tente novamente.';
          setLogoUploadError(alertMsg);
          alert(alertMsg);
        } finally {
          setIsUploadingLogo(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        setIsUploadingLogo(false);
        setLogoUploadError('Erro ao ler arquivo');
      };

      reader.readAsDataURL(file);
    } catch (err: unknown) {
      const messageProp =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: unknown }).message
          : undefined;
      const message = typeof messageProp === 'string' ? messageProp : String(err);
      console.error('Erro ao preparar upload', message);
      const alertMsg = message || 'Falha ao enviar a logo. Tente novamente.';
      setLogoUploadError(alertMsg);
      alert(alertMsg);
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  // Função acima desabilitada por problemas de CORS

  const statusItems = useMemo(() => {
    const items: { label: string; ok: boolean; value?: string }[] = [];
    const cpfOk = !!settings.cpfCnpj && settings.cpfCnpj.replace(/\D/g, '').length >= 11;
    items.push({ label: 'CPF/CNPJ', ok: cpfOk, value: settings.cpfCnpj || 'Pendente' });
    if (settings.sispassNumber)
      items.push({ label: 'SISPASS', ok: true, value: settings.sispassNumber });
    if (daysSispass !== null)
      items.push({ label: 'Licença', ok: daysSispass > 0, value: `${daysSispass} dias` });
    if (daysCert !== null)
      items.push({ label: 'Certificado', ok: daysCert > 0, value: `${daysCert} dias` });
    if (settings.plan === 'Profissional' && settings.subscriptionEndDate) {
      const ok = settings.subscriptionCancelAtPeriodEnd ? (daysSubscription ?? 0) > 0 : true;
      const value =
        settings.subscriptionCancelAtPeriodEnd && daysSubscription !== null
          ? `Termina em ${daysSubscription} dias`
          : 'Renovação automática ativa';
      items.push({ label: 'Assinatura', ok, value });
    }
    return items;
  }, [settings, daysSispass, daysCert, daysSubscription]);

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const saveSettings = async () => {
    updateSettings({ ...settings });
    try {
      setIsSaving(true);
      await onSave(settings);
      setSavedSnapshot(JSON.stringify(settings));
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Falha ao salvar as configurações', err);
      setSavedAt(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = async () => {
    await saveSettings();
  };

  const isDirty =
    savedSnapshot !== null && savedSnapshot !== JSON.stringify(settings);


  useEffect(() => {
    if (!isDirty || isSaving) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      void saveSettings();
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isDirty, isSaving, settings]);

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.current.trim()) {
      setPasswordError('Digite sua senha atual');
      return;
    }
    if (!passwordForm.new.trim() || passwordForm.new.length < 8) {
      setPasswordError('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('As senhas não coincidem');
      return;
    }
    if (passwordForm.new === passwordForm.current) {
      setPasswordError('A nova senha deve ser diferente da atual');
      return;
    }

    setPasswordError('Mudança de senha disponível via Firebase Console por enquanto.');
  };

  return (
    <div className="w-full max-w-none px-6 xl:px-10 2xl:px-16 animate-in fade-in h-[calc(100vh-140px)] flex flex-col gap-6 pb-28">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Configurações</h2>
          <p className="text-slate-500">
            Ajuste dados do criatório, licenças e Certificado.
          </p>
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
              Perfil e Licenças
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

      <div className="flex-1 min-h-0">
        {bannerMessage && bannerMessage.length > 0 && (
          <div className="space-y-3">
            {bannerMessage.map((banner, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold shadow-sm ${
                  banner.action ? 'cursor-pointer hover:opacity-95' : ''
                }`}
                onClick={banner.action}
                role={banner.action ? 'button' : undefined}
                tabIndex={banner.action ? 0 : undefined}
                onKeyDown={
                  banner.action
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          banner.action?.();
                        }
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <span>{banner.message}</span>
                </div>
                {banner.action && banner.actionLabel && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      banner.action?.();
                    }}
                    className="text-[11px] uppercase tracking-widest font-black text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    {banner.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <Suspense fallback={<div />}>
          <TipCarousel category="settings" />
        </Suspense>

        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {wizardSteps.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setWizardStep(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      wizardStep === idx ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            {wizardStep === 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Resumo rápido
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" /> Status rápido
                    </h4>
                    <div className="space-y-2">
                      {statusItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-100"
                        >
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
                      <p>
                        Renovação SISPASS:{' '}
                        {settings.renewalDate
                          ? new Date(settings.renewalDate).toLocaleDateString()
                          : 'Pendente'}
                      </p>
                      <p>
                        Última Renovação:{' '}
                        {settings.lastRenewalDate
                          ? new Date(settings.lastRenewalDate).toLocaleDateString()
                          : 'Pendente'}
                      </p>
                      <p>
                        Certificado:{' '}
                        {settings.certificate?.expiryDate
                          ? new Date(settings.certificate.expiryDate).toLocaleDateString()
                          : 'Pendente'}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mantenha as datas atualizadas para ver alertas no dashboard.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-slate-600" /> Certificado digital
                    </h4>
                    <div className="text-sm text-slate-700 space-y-1">
                      <p>
                        <span className="font-bold">Emissor:</span>{' '}
                        {settings.certificate?.issuer || 'Pendente'}
                      </p>
                      <p>
                        <span className="font-bold">Validade:</span>{' '}
                        {settings.certificate?.expiryDate
                          ? new Date(settings.certificate.expiryDate).toLocaleDateString()
                          : 'Pendente'}
                      </p>
                    </div>
                    <a
                      href="https://ccd.serpro.gov.br/testeaqui/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
                    >
                      <ExternalLink size={12} /> Testar Certificado (Serpro)
                    </a>
                  </div>
                </div>
              </section>
            )}

            {wizardStep === 1 && (
              <section className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-bold flex items-center gap-2 text-slate-900">
                  <User size={18} /> Identidade do criatório
                </h3>

                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border-2 border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-6 text-center">
                  <div className="w-48 h-48 bg-white border-2 border-slate-300 rounded-xl flex items-center justify-center overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} className="w-full h-full object-contain p-3" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ImageIcon size={48} />
                        <p className="text-xs font-medium">Logo do criatório</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    <p className="font-bold text-slate-900 text-lg mb-1">Logomarca do criatório</p>
                    <p className="text-sm text-slate-600 mb-4">
                      Exibida no menu lateral e em documentos.
                    </p>
                    {canUseLogo ? (
                      <>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                            className={`${buttonAccent} px-6 py-3`}
                            disabled={isUploadingLogo}
                          >
                            {isUploadingLogo ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Upload size={16} />
                            )}
                            {isUploadingLogo ? 'Enviando logo...' : 'Carregar nova logo'}
                          </button>
                          {settings.logoUrl && settings.logoUrl !== APP_LOGO && (
                            <button
                              onClick={async () => {
                                try {
                                  await updateSettings({ ...settings, logoUrl: APP_LOGO });
                                } catch (err) {
                                  console.error('Erro ao restaurar logo padrão:', err);
                                }
                              }}
                              className={`${buttonSecondary} px-6 py-3`}
                            >
                              Usar logo padrão
                            </button>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          hidden
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                        {logoUploadError && (
                          <p className="mt-3 text-sm text-red-600 font-medium">{logoUploadError}</p>
                        )}
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-2 rounded-lg text-sm font-semibold">
                        <Lock size={16} /> Recurso PRO
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">Nome do criatório</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.breederName}
                      onChange={(e) => updateSettings({ ...settings, breederName: e.target.value })}
                      placeholder="Ex: Aviario Azul"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">E-mail de Contato</span>
                    {emailEditMode ? (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          className="flex-1 p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          value={emailEditValue}
                          onChange={(e) => setEmailEditValue(e.target.value)}
                          placeholder="seu@email.com"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (emailEditValue && emailEditValue.includes('@')) {
                              setEmailDisplay(emailEditValue);
                              // Note: email não é uma propriedade de BreederSettings
                              // Apenas atualizar o display local
                              setEmailEditMode(false);
                              toast.success('E-mail atualizado!');
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailEditValue(emailDisplay);
                            setEmailEditMode(false);
                          }}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-300">
                        <span className="text-sm font-medium text-slate-700">{emailDisplay || 'E-mail não definido'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailEditValue(emailDisplay);
                            setEmailEditMode(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-all"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">CPF / CNPJ</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.cpfCnpj}
                      onChange={(e) =>
                        updateSettings({ ...settings, cpfCnpj: maskCpfCnpj(e.target.value) })
                      }
                      placeholder="Digite com numeros"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <label className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-label">Número SISPASS</span>
                    </div>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.sispassNumber}
                      onChange={(e) =>
                        updateSettings({ ...settings, sispassNumber: e.target.value })
                      }
                      placeholder="Ex: 1234567-8"
                    />
                    <p className="text-xs text-slate-500">Encontre em sua licença SISPASS/CTF</p>
                  </label>

                  <label className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-label">Próxima Renovação</span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={renewalInput}
                      onChange={(e) => {
                        const masked = maskDateInput(e.target.value);
                        setRenewalInput(masked);
                        const iso = parseMaskedDate(masked);
                        if (iso) {
                          updateSettings({ ...settings, renewalDate: iso });
                        }
                      }}
                      onBlur={() => {
                        const iso = parseMaskedDate(renewalInput);
                        if (!iso) {
                          setRenewalInput(formatDateForInput(settings.renewalDate));
                        }
                      }}
                    />
                    <p className="text-[10px] text-slate-400">
                      Sistema avisa com 30 dias de antecedência
                    </p>
                  </label>

                  <label className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-label">Última Renovação</span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={lastRenewalInput}
                      onChange={(e) => {
                        const masked = maskDateInput(e.target.value);
                        setLastRenewalInput(masked);
                        const iso = parseMaskedDate(masked);
                        if (iso) {
                          updateSettings({ ...settings, lastRenewalDate: iso });
                        }
                      }}
                      onBlur={() => {
                        const iso = parseMaskedDate(lastRenewalInput);
                        if (!iso) {
                          setLastRenewalInput(formatDateForInput(settings.lastRenewalDate));
                        }
                      }}
                    />
                    <p className="text-[10px] text-slate-400">Data da última renovação</p>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      SISPASS
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {settings.sispassNumber || 'Não informado'}
                    </p>
                    <p className="text-[11px] text-slate-500">Número do registro</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Renovação SISPASS
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {settings.renewalDate
                        ? new Date(settings.renewalDate).toLocaleDateString()
                        : 'Não informado'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {daysSispass !== null ? `${daysSispass} dias` : ''}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {wizardStep === 2 && (
              <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black flex items-center gap-2 text-slate-800">
                  <User size={18} /> Perfil do criador
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">Categoria do criador</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.breederCategory || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, breederCategory: e.target.value })
                      }
                      placeholder="Ex: Amador"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Nome do responsável</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.responsibleName || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, responsibleName: e.target.value })
                      }
                      placeholder="Ex: João Silva"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Espécie criada</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.speciesRaised || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, speciesRaised: e.target.value })
                      }
                      placeholder="Ex: Curió"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">CEP</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.addressCep || ''}
                      onChange={(e) => handleCepChange(e.target.value)}
                      onBlur={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        if (digits.length === 8) lookupCep(digits);
                      }}
                      placeholder="00000-000"
                    />
                    {isFetchingCep && (
                      <p className="text-[10px] text-slate-400">Buscando endereço pelo CEP...</p>
                    )}
                    {cepError && !isFetchingCep && (
                      <p className="text-[10px] text-rose-600 font-semibold">{cepError}</p>
                    )}
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Cidade</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.addressCity || ''}
                      onChange={(e) => updateSettings({ ...settings, addressCity: e.target.value })}
                      placeholder="Ex: Salvador"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">UF</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.addressState || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, addressState: e.target.value })
                      }
                      placeholder="Ex: BA"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">Rua</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.addressStreet || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, addressStreet: e.target.value })
                      }
                      placeholder="Ex: Rua das Flores"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Número</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.addressNumber || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, addressNumber: e.target.value })
                      }
                      placeholder="Ex: 123"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Bairro</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.addressNeighborhood || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, addressNeighborhood: e.target.value })
                      }
                      placeholder="Ex: Centro"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-label">Complemento</span>
                  <input
                    className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    value={settings.addressComplement || ''}
                    onChange={(e) =>
                      updateSettings({ ...settings, addressComplement: e.target.value })
                    }
                    placeholder="Ex: Sala 2"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">E-mail</span>
                    <input
                      type="email"
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.breederEmail || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, breederEmail: e.target.value })
                      }
                      placeholder="contato@exemplo.com"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Site</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.breederWebsite || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, breederWebsite: e.target.value })
                      }
                      placeholder="www.seucriatorio.com.br"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-label">Telefone</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.breederPhone || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, breederPhone: e.target.value })
                      }
                      placeholder="(00) 0000-0000"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-label">Celular</span>
                    <input
                      className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      value={settings.breederMobile || ''}
                      onChange={(e) =>
                        updateSettings({ ...settings, breederMobile: e.target.value })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </label>
                </div>
              </section>
            )}

            {/* Appearance step removed per product decision (keep white theme). */}

            {wizardStep === 3 && (
              <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black flex items-center gap-2 text-slate-800">
                  <Lock size={18} /> Segurança
                </h3>
                <p className="text-sm text-slate-600">Proteja sua conta com uma senha segura.</p>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className={`${buttonPrimary} w-full py-3`}
                >
                  <Lock size={16} /> Trocar Senha
                </button>
              </section>
            )}

          </div>
        )}

        {activeTab === 'plano' && (
          <div className="space-y-8">
            <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
              <PlanComparative currentPlan={settings.plan} />
            </Suspense>

            <div className="bg-slate-900 text-white p-10 rounded-3xl space-y-8">
              <h3 className="text-2xl font-black">Gerenciar Assinatura</h3>

              <div className="bg-white text-slate-900 p-6 rounded-2xl">
              <p className="text-xs uppercase font-black text-slate-500">Plano atual</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-black">{planLabel}</h3>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    settings.plan === 'Profissional' || isAdmin
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {settings.plan === 'Profissional' || isAdmin ? 'Premium' : 'Gratuito'}
                </span>
              </div>

              {settings.plan === 'Básico' && !isAdmin && (
                <p className="text-xs text-amber-600 font-black">
                  Você esta usando o plano gratuito
                </p>
              )}

              {settings.trialEndDate && !isAdmin && (
                <p className="text-xs text-emerald-600 font-black">
                  Trial ativo até {new Date(settings.trialEndDate).toLocaleDateString()}
                </p>
              )}

              {((settings.plan === 'Profissional' && !isTrial) || isTrial) && !isAdmin && (
                <div
                  data-subscription-section
                  className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  {/* Informação do provedor atual - só mostra se tiver assinatura paga */}
                  {!isTrial && (
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-slate-500">
                          Provedor de Pagamento
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                          paymentProvider === 'Mercado Pago' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {paymentProvider}
                        </span>
                      </div>
                      {settings.subscriptionEndDate && (
                        <button
                          onClick={() => {
                            if (confirm(
                              `Para trocar de ${paymentProvider} para ${paymentProvider === 'Stripe' ? 'Mercado Pago' : 'Stripe'}, você precisará:\n\n` +
                              `1. Cancelar sua assinatura atual\n` +
                              `2. Aguardar o término do período pago\n` +
                              `3. Fazer uma nova assinatura com o outro provedor\n\n` +
                              `Deseja continuar?`
                            )) {
                              if (hasStripeCustomer) {
                                openBillingPortal();
                              } else {
                                alert('Para trocar do Mercado Pago para Stripe:\n\n1. Não renove seu plano atual\n2. Aguarde o vencimento\n3. Faça uma nova assinatura escolhendo o período desejado');
                              }
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-bold underline"
                        >
                          Trocar provedor
                        </button>
                      )}
                    </div>
                  )}

                  {/* Informação sobre escolha de provedor durante trial */}
                  {isTrial && (
                    <div className="pb-3 border-b border-slate-200">
                      <p className="text-xs font-black uppercase text-slate-500 mb-2">
                        Escolha seu provedor de pagamento
                      </p>
                      <p className="text-xs text-slate-600">
                        Quando assinar, você poderá escolher entre <span className="font-bold text-purple-600">Stripe</span> (assinatura recorrente com cartão) ou <span className="font-bold text-blue-600">Mercado Pago</span> (pagamento único com PIX).
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        Assinatura ativa
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {hasStripeCustomer
                          ? 'Assinatura recorrente via Stripe ativa. Gerencie cobranças, upgrade/downgrade ou cancele a renovação automática.'
                          : 'Pagamento único via Mercado Pago. Renove manualmente quando vencer.'}
                      </p>
                    </div>
                    {hasStripeCustomer && (
                      <button
                        onClick={openBillingPortal}
                        className={`${buttonPrimary} px-4 py-2 text-xs uppercase tracking-widest`}
                      >
                        Abrir portal
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {hasStripeCustomer
                      ? 'No portal você pode trocar período (mensal/anual), atualizar cartão e cancelar a recorrência.'
                      : 'O plano não renova automaticamente. Quando vencer, faça um novo pagamento.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={openRenewModal}
                      className="px-4 py-2 text-xs uppercase tracking-widest font-black rounded-xl bg-slate-900 text-white"
                    >
                      Renovar agora
                    </button>
                  </div>

                  {/* Mostra info de período atual */}
                  {daysSubscription !== null && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                      <Calendar size={14} className="text-slate-600" />
                      <p className="text-[11px] text-slate-700">
                        Período atual expira em{' '}
                        <span className="font-black">{daysSubscription} dias</span> (
                        {settings.subscriptionEndDate
                          ? new Date(settings.subscriptionEndDate).toLocaleDateString()
                          : ''}
                        )
                      </p>
                    </div>
                  )}

                  {/* Mostra aviso de cancelamento */}
                  {settings.subscriptionCancelAtPeriodEnd && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-amber-700">
                          ⚠️ Renovação automática cancelada
                        </p>
                        <p className="text-[11px] text-amber-700">
                          Seu plano PRO não renovará automaticamente. Reative no portal para manter
                          o acesso após o vencimento.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isAdmin && (settings.plan !== 'Profissional' || isTrial) && (
              <>
                <div className="bg-white/10 border border-white/10 rounded-2xl p-4 grid md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-white/80">
                    <ShieldCheck size={14} className="text-emerald-300" />7 dias de garantia sem
                    risco
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Calendar size={14} className="text-emerald-300" />
                    Troque o período quando quiser
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <ExternalLink size={14} className="text-emerald-300" />
                    Pagamento seguro via {paymentProvider}
                  </div>
                </div>

                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                  {PLANS.map((plan) => {
                    const savings =
                      plan.id !== 'monthly' && monthlyPrice
                        ? Math.round((1 - plan.price / (monthlyPrice * plan.months)) * 100)
                        : null;
                    const badge = PLAN_BADGES[plan.id];
                    const isSelected = selectedPlanId === plan.id;

                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`flex flex-col text-left p-5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400'
                            : 'bg-white/5 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase font-black text-slate-300">
                              {plan.label}
                            </p>
                            <div className="flex items-end gap-1">
                              <span className="text-2xl font-black text-white">
                                R$ {plan.price}
                              </span>
                              <span className="text-xs text-slate-300">{plan.period}</span>
                            </div>
                          </div>
                          {badge && (
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                                badge.tone === 'amber'
                                  ? 'bg-amber-400 text-slate-900'
                                  : 'bg-emerald-400 text-emerald-950'
                              }`}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>

                        {savings !== null && (
                          <div className="mt-2 text-[11px] font-bold text-emerald-300">
                            Economize {savings}% no período
                          </div>
                        )}

                        <ul className="mt-4 space-y-2 text-[11px] text-slate-200">
                          {PLAN_FEATURES.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <CheckCircle2 size={12} className="text-emerald-300 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <div
                          className={`mt-4 text-center text-[11px] font-black uppercase tracking-widest rounded-xl py-2 ${
                            isSelected ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {isSelected ? 'Selecionado' : 'Selecionar'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setPaymentContext('new');
                    setShowPaymentModal(true);
                  }}
                  className={`${buttonHighlight} w-full py-4 uppercase tracking-widest`}
                >
                  Continuar com {selectedPlan.label}
                </button>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase font-black text-slate-300">
                      Posso cancelar quando quiser?
                    </p>
                    <p className="text-xs text-slate-200 mt-2">
                      Sim. Você pode cancelar ou trocar o período diretamente no portal de cobrança,
                      sem burocracia.
                    </p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase font-black text-slate-300">
                      E se eu estiver em teste?
                    </p>
                    <p className="text-xs text-slate-200 mt-2">
                      Enquanto o trial estiver ativo, você tem acesso a todos os recursos e pode
                      decidir depois.
                    </p>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
        )}

      </div>

      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => {
            setShowPaymentModal(false);
            setPaymentStep('method');
          }}
        >
          <div
            className="bg-white rounded-3xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {paymentStep === 'method' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black">
                    {paymentContext === 'renew' ? 'Renovar plano' : 'Pagamento'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentStep('method');
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleStripePayment}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-xl"
                  >
                    {paymentContext === 'renew'
                      ? hasStripeCustomer
                        ? 'Gerenciar no Stripe (recorrente)'
                        : 'Renovar com Stripe (recorrente)'
                      : 'Pagar com Cartão (Stripe)'}
                  </button>
                  <button
                    onClick={startMercadoPagoCheckout}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl"
                  >
                    {paymentContext === 'renew'
                      ? 'Renovar com Mercado Pago (PIX/avulso)'
                      : 'Pagar com Pix (Mercado Pago)'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  {paymentContext === 'renew'
                    ? 'Você pode renovar antes do vencimento. O prazo será somado ao tempo restante.'
                    : 'O Pix é confirmado rapidamente após o pagamento.'}
                </p>
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

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">Trocar Senha</h3>
              <button
                onClick={closePasswordModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Senha atual
                  </span>
                  <div className="relative flex">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, current: e.target.value })
                      }
                      placeholder="Digite sua senha atual"
                      className="flex-1 p-3 rounded-l-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      className="px-4 border border-l-0 border-slate-100 rounded-r-2xl bg-slate-50 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nova senha
                  </span>
                  <div className="relative flex">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      placeholder="Mínimo 8 caracteres"
                      className="flex-1 p-3 rounded-l-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                      }
                      className="px-4 border border-l-0 border-slate-100 rounded-r-2xl bg-slate-50 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Confirmar nova senha
                  </span>
                  <div className="relative flex">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirm: e.target.value })
                      }
                      placeholder="Repita a nova senha"
                      className="flex-1 p-3 rounded-l-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      className="px-4 border border-l-0 border-slate-100 rounded-r-2xl bg-slate-50 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              {passwordError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold">
                  {passwordSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closePasswordModal}
                  className={`${buttonSecondary} flex-1 py-3 uppercase tracking-widest`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className={`${buttonPrimary} flex-1 py-3 uppercase tracking-widest`}
                >
                  {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
