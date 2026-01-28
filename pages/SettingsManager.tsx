import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
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
  Eye,
  EyeOff,
  X,
  HelpCircle,
  Database,
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import { APP_LOGO } from '../constants';
import { supabase } from '../supabaseClient';
import { syncBirdsToSupabase } from '../lib/birdSync';

interface SettingsManagerProps {
  settings: BreederSettings;
  updateSettings: (settings: BreederSettings) => void;
  onSave: (settings: BreederSettings) => Promise<void>;
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

const LOGO_BUCKET = (import.meta as any)?.env?.VITE_SUPABASE_LOGO_BUCKET || 'assets';

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

const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, updateSettings, onSave, isAdmin }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryColorRef = useRef<HTMLInputElement>(null);
  const accentColorRef = useRef<HTMLInputElement>(null);
  const renewalDateRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'perfil' | 'plano'>('perfil');
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'method' | 'processing'>('method');
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<Array<{message: string; action?: () => void; actionLabel?: string}> | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ migrated: number; failed: number; errors: string[] } | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const isTrial = !!settings.trialEndDate && !isAdmin;
  const canUseLogo = !!isAdmin || settings.plan === 'Profissional' || !!settings.trialEndDate;
  const planLabel = isAdmin ? 'Admin' : settings.plan;

  const daysSispass = daysTo(settings.renewalDate);
  const daysCert = daysTo(settings.certificate?.expiryDate);
  const daysSubscription = settings.subscriptionEndDate ? daysTo(settings.subscriptionEndDate) : null;

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
    const critical: Array<{message: string; action?: () => void; actionLabel?: string}> = [];
    
    if (daysSispass !== null && daysSispass <= 30) {
      critical.push({
        message: `SISPASS vence em ${daysSispass} dias`,
        action: () => setActiveTab('perfil'),
        actionLabel: 'Renovar'
      });
    }
    
    if (daysCert !== null && daysCert <= 30) {
      critical.push({
        message: `Certificado vence em ${daysCert} dias`,
        action: () => setActiveTab('perfil'),
        actionLabel: 'Atualizar'
      });
    }
    
    if (settings.plan === 'Profissional' && settings.subscriptionCancelAtPeriodEnd) {
      if (daysSubscription !== null) {
        critical.push({
          message: `Assinatura PRO termina em ${daysSubscription} dias (renovação cancelada)`,
          action: () => {
            setActiveTab('plano');
            // Auto-scroll to subscription section after tab change
            setTimeout(() => {
              const element = document.querySelector('[data-subscription-section]');
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          },
          actionLabel: 'Reativar'
        });
      } else {
        critical.push({
          message: 'Assinatura PRO com renovação cancelada. Reative para manter o plano.',
          action: () => setActiveTab('plano'),
          actionLabel: 'Ver Plano'
        });
      }
    }
    
    setBannerMessage(critical.length > 0 ? critical : null);
  }, [daysSispass, daysCert, daysSubscription, settings.plan, settings.subscriptionCancelAtPeriodEnd]);

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
      if (!priceId) throw new Error('Plano inválido');
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canUseLogo) {
      alert('Disponível apenas no plano PRO.');
      return;
    }
    if (!supabase) {
      alert('Envio de logo indisponível no momento.');
      return;
    }

    setLogoUploadError(null);
    setIsUploadingLogo(true);

    try {
      const session = await supabase.auth.getSession();
      const userId = session?.data?.session?.user?.id;
      if (!userId) throw new Error('Faça login novamente para enviar a logo.');

      const ext = file.name.split('.').pop() || 'png';
      const path = `logos/${userId}/criatorio-logo.${ext}`;

      const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: true });
      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('bucket')) {
          throw new Error(`Bucket "${LOGO_BUCKET}" não encontrado. Crie-o no Supabase Storage (público) ou defina VITE_SUPABASE_LOGO_BUCKET.`);
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível gerar o link da logo.');

      console.log('Logo URL:', publicUrl);
      const nextSettings = { ...settings, logoUrl: publicUrl };
      updateSettings(nextSettings);

      // salva automaticamente para evitar perder a logo ao recarregar
      try {
        await onSave(nextSettings);
        setSavedAt(new Date().toLocaleTimeString());
      } catch (saveErr) {
        console.warn('Falha ao salvar logo', saveErr);
      }
      alert('Logo enviada e salva com sucesso.');
    } catch (err: any) {
      console.error('Erro ao enviar logo', err);
      const message = err?.message || 'Falha ao enviar a logo. Tente novamente.';
      setLogoUploadError(message);
      alert(message);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const statusItems = useMemo(() => {
    const items: { label: string; ok: boolean; value?: string }[] = [];
    const cpfOk = !!settings.cpfCnpj && settings.cpfCnpj.replace(/\D/g, '').length >= 11;
    items.push({ label: 'CPF/CNPJ', ok: cpfOk, value: settings.cpfCnpj || 'Pendente' });
    if (settings.sispassNumber) items.push({ label: 'SISPASS', ok: true, value: settings.sispassNumber });
    if (daysSispass !== null) items.push({ label: 'Licença', ok: daysSispass > 0, value: `${daysSispass} dias` });
    if (daysCert !== null) items.push({ label: 'Certificado', ok: daysCert > 0, value: `${daysCert} dias` });
    if (settings.plan === 'Profissional' && settings.subscriptionEndDate) {
      const ok = settings.subscriptionCancelAtPeriodEnd ? (daysSubscription ?? 0) > 0 : true;
      const value = settings.subscriptionCancelAtPeriodEnd && daysSubscription !== null
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

  const handleSaveClick = async () => {
    updateSettings({ ...settings });
    try {
      await onSave(settings);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Falha ao salvar as configurações', err);
      setSavedAt(null);
    }
  };

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

    setIsChangingPassword(true);
    try {
      // Primeiro, valida a senha atual tentando fazer login
      const session = await supabase.auth.getSession();
      const email = session?.data?.session?.user?.email;
      
      if (!email) {
        throw new Error('Email não encontrado. Faça login novamente.');
      }

      // Tenta fazer signin com a senha atual para validar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: passwordForm.current,
      });

      if (signInError) {
        throw new Error('Senha atual incorreta');
      }

      // Se validada, atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.new,
      });

      if (updateError) {
        throw new Error(updateError.message || 'Erro ao atualizar senha');
      }

      setPasswordSuccess('Senha alterada com sucesso! Faça login novamente com a nova senha.');
      setPasswordForm({ current: '', new: '', confirm: '' });
      
      // Após 2s, faz logout para obrigar novo login com a nova senha
      setTimeout(async () => {
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch {/* ignore */}
      }, 2000);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao alterar senha. Tente novamente.';
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSyncBirds = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    setSyncMessage('Sincronizando pássaros...');

    try {
      const session = await supabase.auth.getSession();
      const userId = session?.data?.session?.user?.id;

      if (!userId) {
        setSyncMessage('Erro: Usuário não autenticado');
        return;
      }

      const result = await syncBirdsToSupabase(userId);
      setSyncStatus(result);

      if (result.success) {
        setSyncMessage(`✓ Sucesso! ${result.migrated} pássaros sincronizados.`);
      } else if (result.migrated > 0) {
        setSyncMessage(`⚠ Parcial: ${result.migrated} sincronizados, ${result.failed} com erro.`);
      } else {
        setSyncMessage(`✗ Erro: Nenhum pássaro foi sincronizado.`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSyncMessage(`Erro ao sincronizar: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-14 animate-in fade-in">
      {bannerMessage && bannerMessage.length > 0 && (
        <div className="space-y-3">
          {bannerMessage.map((banner, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <span>{banner.message}</span>
              </div>
              {banner.action && banner.actionLabel && (
                <button
                  onClick={banner.action}
                  className="text-[11px] uppercase tracking-widest font-black text-amber-700 hover:text-amber-900 transition-colors"
                >
                  {banner.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Configurações</h2>
          <p className="text-slate-500">Ajuste dados do criatório, licenças, Certificado e aparência.</p>
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

      <Suspense fallback={<div />}>
        <TipCarousel category="settings" />
      </Suspense>

      {activeTab === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm space-y-6">
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
                  <p className="text-sm text-slate-600 mb-4">Exibida no menu lateral e em documentos.</p>
                  {canUseLogo ? (
                    <>
                      <button
                        onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-60"
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isUploadingLogo ? 'Enviando logo...' : 'Carregar nova logo'}
                      </button>
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
                  <span className="text-label">CPF / CNPJ</span>
                  <input
                    className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    value={settings.cpfCnpj}
                    onChange={(e) => updateSettings({ ...settings, cpfCnpj: maskCpfCnpj(e.target.value) })}
                    placeholder="Digite com numeros"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-label">Número SISPASS</span>
                    <div className="group relative cursor-help">
                      <HelpCircle size={14} className="text-slate-400 hover:text-slate-600" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50">
                        Número de registro do SISPASS/CTF junto ao IBAMA
                      </div>
                    </div>
                  </div>
                  <input
                    className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    value={settings.sispassNumber}
                    onChange={(e) => updateSettings({ ...settings, sispassNumber: e.target.value })}
                    placeholder="Ex: 1234567-8"
                  />
                  <p className="text-xs text-slate-500">Encontre em sua licença SISPASS/CTF</p>
                </label>
                <label className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-label">Data de Renovação SISPASS</span>
                    <div className="group relative cursor-help">
                      <HelpCircle size={14} className="text-slate-400 hover:text-slate-600" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50">
                        Data de vencimento da sua licença SISPASS/CTF
                      </div>
                    </div>
                  </div>
                  <input
                    ref={renewalDateRef}
                    type="date"
                    className="w-full p-3.5 rounded-lg bg-white border border-slate-300 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    value={settings.renewalDate}
                    onChange={(e) => updateSettings({ ...settings, renewalDate: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400">Sistema avisa com 30 dias de antecedência</p>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de registro</span>
                    <div className="group relative cursor-help">
                      <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                        Data de primeiro registro do seu criatório
                      </div>
                    </div>
                  </div>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.registrationDate}
                    onChange={(e) => updateSettings({ ...settings, registrationDate: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400">Data do registro original</p>
                </label>
                <label className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Renovação</span>
                    <div className="group relative cursor-help">
                      <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                        Última vez que o SISPASS foi renovado
                      </div>
                    </div>
                  </div>
                  <input
                    type="date"
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold"
                    value={settings.lastRenewalDate || ''}
                    onChange={(e) => updateSettings({ ...settings, lastRenewalDate: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400">Data da última renovação</p>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SISPASS</p>
                  <p className="text-sm font-bold text-slate-800">{settings.sispassNumber || 'Não informado'}</p>
                  <p className="text-[11px] text-slate-500">Número do registro</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Renovação SISPASS</p>
                  <p className="text-sm font-bold text-slate-800">{settings.renewalDate ? new Date(settings.renewalDate).toLocaleDateString() : 'Não informado'}</p>
                  <p className="text-[11px] text-slate-500">{daysSispass !== null ? `${daysSispass} dias` : ''}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-black flex items-center gap-2 text-slate-800">
                <Lock size={18} /> Segurança
              </h3>
              <p className="text-sm text-slate-600">Proteja sua conta com uma senha segura.</p>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all"
              >
                <Lock size={16} className="inline mr-2" /> Trocar Senha
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                <Palette size={18} /> Aparência e tema
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primária</p>
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Preview rápido</p>
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
                <ShieldCheck size={16} className="text-emerald-600" /> Status rápido
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
                <p>Renovação SISPASS: {settings.renewalDate ? new Date(settings.renewalDate).toLocaleDateString() : 'Pendente'}</p>
                <p>Última Renovação: {settings.lastRenewalDate ? new Date(settings.lastRenewalDate).toLocaleDateString() : 'Pendente'}</p>
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
                <ExternalLink size={12} /> Testar Certificado (Serpro)
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

            {settings.plan === 'Básico' && !isAdmin && (
              <p className="text-xs text-amber-600 font-black">Você esta usando o plano gratuito</p>
            )}

            {settings.trialEndDate && !isAdmin && (
              <p className="text-xs text-emerald-600 font-black">Trial ativo até {new Date(settings.trialEndDate).toLocaleDateString()}</p>
            )}

            {settings.plan === 'Profissional' && !isTrial && !isAdmin && (
              <div data-subscription-section className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Assinatura ativa</p>
                    <p className="text-sm font-bold text-slate-800">
                      Gerencie cobranças, upgrade/downgrade ou cancele a renovação automática.
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
                  No portal você pode trocar período (mensal/anual), atualizar cartão e cancelar a recorrência.
                </p>
                
                {/* Mostra info de período atual */}
                {daysSubscription !== null && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2">
                    <Calendar size={14} className="text-slate-600" />
                    <p className="text-[11px] text-slate-700">
                      Período atual expira em <span className="font-black">{daysSubscription} dias</span> ({settings.subscriptionEndDate ? new Date(settings.subscriptionEndDate).toLocaleDateString() : ''})
                    </p>
                  </div>
                )}
                
                {/* Mostra aviso de cancelamento */}
                {settings.subscriptionCancelAtPeriodEnd && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-700">⚠️ Renovação automática cancelada</p>
                      <p className="text-[11px] text-amber-700">
                        Seu plano PRO não renovará automaticamente. Reative no portal para manter o acesso após o vencimento.
                      </p>
                    </div>
                  </div>
                )}
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
          <Save size={16} /> Salvar alterações
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
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha atual</span>
                  <div className="relative flex">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      placeholder="Digite sua senha atual"
                      className="flex-1 p-3 rounded-l-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="px-4 border border-l-0 border-slate-100 rounded-r-2xl bg-slate-50 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova senha</span>
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
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="px-4 border border-l-0 border-slate-100 rounded-r-2xl bg-slate-50 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmar nova senha</span>
                  <div className="relative flex">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      placeholder="Repita a nova senha"
                      className="flex-1 p-3 rounded-l-2xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
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
                  className="flex-1 py-3 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black flex items-center gap-2 text-slate-800">
            <Database size={18} /> Sincronizar com Supabase
          </h3>
          <p className="text-sm text-slate-600">Copie seus pássaros do localStorage para o Supabase. Isso permite que a verificação funcione mesmo offline e cria um backup na nuvem.</p>
          
          {syncMessage && (
            <div className={`p-4 rounded-2xl border ${
              syncMessage.includes('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              syncMessage.includes('⚠') ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-rose-50 border-rose-200 text-rose-700'
            } text-sm font-bold`}>
              {syncMessage}
            </div>
          )}

          {syncStatus && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Sincronizados:</span>
                <span className="font-bold text-emerald-600">{syncStatus.migrated}</span>
              </div>
              {syncStatus.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Erros:</span>
                  <span className="font-bold text-rose-600">{syncStatus.failed}</span>
                </div>
              )}
              {syncStatus.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
                  <p className="text-xs font-bold text-slate-500">Detalhes dos erros:</p>
                  {syncStatus.errors.map((err, i) => (
                    <p key={i} className="text-xs text-slate-600">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSyncBirds}
            disabled={isSyncing}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sincronizando...
              </>
            ) : (
              <>
                <Database size={16} /> Sincronizar Agora
              </>
            )}
          </button>

          <p className="text-xs text-slate-500">
            ℹ️ Não se preocupe: seus dados no localStorage serão mantidos intactos. Isto apenas cria um backup no Supabase.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;







