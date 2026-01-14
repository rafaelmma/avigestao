import React, { useState, useEffect } from 'react';
import {
  AppState,
  Bird,
  Pair,
  Clutch,
  Medication,
  MedicationApplication,
  BreederSettings,
  MovementRecord,
  Transaction,
  MaintenanceTask,
  TournamentEvent,
  ContinuousTreatment
} from './types';
import { MOCK_BIRDS, MOCK_MEDS, INITIAL_SETTINGS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BirdManager from './pages/BirdManager';
import BreedingManager from './pages/BreedingManager';
import MedsManager from './pages/MedsManager';
import SettingsManager from './pages/SettingsManager';
import DocumentsManager from './pages/DocumentsManager';
import MovementsManager from './pages/MovementsManager';
import FinanceManager from './pages/FinanceManager';
import TaskManager from './pages/TaskManager';
import TournamentCalendar from './pages/TournamentCalendar';
import HelpCenter from './pages/HelpCenter';
import Auth from './pages/Auth';
import { DollarSign, Zap, AlertTriangle, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('avigestao_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const safeSettings = parsed.settings
            ? { ...INITIAL_SETTINGS, ...parsed.settings }
            : INITIAL_SETTINGS;

          return {
            birds: Array.isArray(parsed.birds) ? parsed.birds : MOCK_BIRDS,
            deletedBirds: parsed.deletedBirds || [],
            pairs: parsed.pairs || [],
            deletedPairs: parsed.deletedPairs || [],
            clutches: parsed.clutches || [],
            medications: parsed.medications || MOCK_MEDS,
            deletedMedications: parsed.deletedMedications || [],
            applications: parsed.applications || [],
            deletedApplications: parsed.deletedApplications || [],
            treatments: parsed.treatments || [],
            deletedTreatments: parsed.deletedTreatments || [],
            movements: parsed.movements || [],
            deletedMovements: parsed.deletedMovements || [],
            transactions: parsed.transactions || [],
            deletedTransactions: parsed.deletedTransactions || [],
            tasks: parsed.tasks || [],
            deletedTasks: parsed.deletedTasks || [],
            tournaments: parsed.tournaments || [],
            deletedTournaments: parsed.deletedTournaments || [],
            settings: safeSettings
          };
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar estado salvo, usando padrão.', e);
    }

    return {
      birds: MOCK_BIRDS,
      deletedBirds: [],
      pairs: [],
      deletedPairs: [],
      clutches: [],
      medications: MOCK_MEDS,
      deletedMedications: [],
      applications: [],
      deletedApplications: [],
      treatments: [],
      deletedTreatments: [],
      movements: [],
      deletedMovements: [],
      transactions: [],
      deletedTransactions: [],
      tasks: [],
      deletedTasks: [],
      tournaments: [],
      deletedTournaments: [],
      settings: INITIAL_SETTINGS
    };
  });

  // MIGRAÇÃO TRIAL
  useEffect(() => {
    if (state.settings.plan === 'Básico' && !state.settings.trialEndDate) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          plan: 'Profissional',
          trialEndDate: trialEnd.toISOString()
        }
      }));
    }
  }, []);

  useEffect(() => {
    if (state.settings.plan === 'Profissional' && state.settings.trialEndDate) {
      if (new Date() > new Date(state.settings.trialEndDate)) {
        setState(prev => ({
          ...prev,
          settings: { ...prev.settings, plan: 'Básico', trialEndDate: undefined }
        }));
      }
    }
  }, []);

  useEffect(() => {
    const authSession = localStorage.getItem('avigestao_auth');
    if (authSession === 'true') setIsAuthenticated(true);
    setAuthLoading(false);
  }, []);

  // 🔁 AJUSTE STRIPE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');

    if (checkout === 'success') {
      setActiveTab('settings');
      alert('Pagamento realizado com sucesso!');
      window.history.replaceState({}, '', '/');
    }

    if (checkout === 'canceled') {
      setActiveTab('settings');
      alert('Pagamento cancelado.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('avigestao_state', JSON.stringify(state));
      const root = document.documentElement;
      const pColor = state.settings.primaryColor || '#10B981';
      root.style.setProperty('--primary', pColor);
      root.style.setProperty('--primary-hover', pColor + 'ee');
      root.style.setProperty('--primary-soft', pColor + '15');
      root.style.setProperty('--accent', state.settings.accentColor || '#F59E0B');
    } catch (e) {
      setError('Erro ao salvar dados.');
    }
  }, [state]);

  if (authLoading) return null;
  if (!isAuthenticated) return <Auth onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logoUrl={state.settings.logoUrl}
        breederName={state.settings.breederName || 'Meu Criatório'}
        plan={state.settings.plan}
        trialEndDate={state.settings.trialEndDate}
        onLogout={() => setIsAuthenticated(false)}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 bg-rose-50 text-rose-600 p-4 rounded-xl">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        <Dashboard state={state} updateSettings={s => setState(p => ({ ...p, settings: s }))} navigateTo={setActiveTab} />
      </main>
    </div>
  );
};

export default App;
